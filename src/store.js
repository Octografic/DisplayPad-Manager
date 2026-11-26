'use strict';
// Stockage JSON (userData/displaypad.json) avec validation stricte de tout ce qui entre.
// Structure : profils -> pages -> 12 touches. Les images sources sont des fichiers (voir main.js).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalizeCombo } = require('./keys');

const NUM_KEYS = 12;
const MAX_PROFILES = 50;
const MAX_PAGES = 30;
const MAX_IMAGE_CHARS = 150000;
const PNG_RE = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
const ID_RE = /^[a-f0-9]{16}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const newId = () => crypto.randomBytes(8).toString('hex');
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : '');

function emptyKey() { return { label: '', image: null, bg: '#000000', textColor: '#ffffff', action: { type: 'none' } }; }
function emptyPage(name = 'Page 1') { return { id: newId(), name, global: false, keys: Array.from({ length: NUM_KEYS }, emptyKey) }; }
function emptyProfile(name = 'Profile 1') { const pg = emptyPage(); return { id: newId(), name, activePage: pg.id, pages: [pg] }; }

function sanitizeAction(a) {
  if (!a || typeof a !== 'object') return { type: 'none' };
  switch (a.type) {
    case 'shortcut': {
      const keys = normalizeCombo(a.keys);
      return keys ? { type: 'shortcut', keys } : { type: 'none' };
    }
    case 'url': {
      try {
        const u = new URL(str(a.url, 2000));
        if (u.protocol === 'http:' || u.protocol === 'https:') return { type: 'url', url: u.href };
      } catch (_) { /* invalide */ }
      return { type: 'none' };
    }
    case 'launch': {
      const p = str(a.path, 1000);
      if (!p || (!path.win32.isAbsolute(p) && !path.isAbsolute(p))) return { type: 'none' };
      return { type: 'launch', path: p, args: str(a.args, 500) };
    }
    case 'profile': return ID_RE.test(a.profileId || '') ? { type: 'profile', profileId: a.profileId } : { type: 'none' };
    case 'page': return ID_RE.test(a.pageId || '') ? { type: 'page', pageId: a.pageId } : { type: 'none' };
    default: return { type: 'none' };
  }
}

function sanitizeKey(k) {
  if (!k || typeof k !== 'object') return emptyKey();
  const ok = (v) => typeof v === 'string' && v.length <= MAX_IMAGE_CHARS && PNG_RE.test(v);
  const out = {
    label: str(k.label, 40),
    image: ok(k.image) ? k.image : null, // image finale composée (envoyée à l'appareil)
    bg: COLOR_RE.test(k.bg) ? k.bg : '#000000',
    textColor: COLOR_RE.test(k.textColor) ? k.textColor : '#ffffff',
    action: sanitizeAction(k.action),
  };
  if (ok(k.src) || (typeof k.src === 'string' && k.src.length <= 600000 && PNG_RE.test(k.src))) out.legacySrc = k.src; // migration v1
  return out;
}

function sanitizePage(p, i) {
  return {
    id: p && ID_RE.test(p.id || '') ? p.id : newId(),
    name: str(p && p.name, 40) || 'Page ' + (i + 1),
    global: !!(p && p.global),
    keys: Array.from({ length: NUM_KEYS }, (_, j) => sanitizeKey(p && p.keys && p.keys[j])),
  };
}

function sanitizeProfile(p) {
  // Migration v1 : un profil avec "keys" devient un profil à une seule page.
  const rawPages = p && Array.isArray(p.pages) ? p.pages : (p && Array.isArray(p.keys) ? [{ name: 'Page 1', keys: p.keys }] : []);
  let pages = rawPages.slice(0, MAX_PAGES).map(sanitizePage);
  if (pages.length === 0) pages = [emptyPage()];
  const ids = new Set();
  pages.forEach((pg) => { while (ids.has(pg.id)) pg.id = newId(); ids.add(pg.id); });
  pages.forEach((pg) => pg.keys.forEach((k) => {
    if (k.action.type === 'page' && !ids.has(k.action.pageId)) k.action = { type: 'none' };
  }));
  return {
    id: p && ID_RE.test(p.id || '') ? p.id : newId(),
    name: str(p && p.name, 40) || 'Profile',
    activePage: ids.has(p && p.activePage) ? p.activePage : pages[0].id,
    pages,
  };
}

function sanitizeData(d) {
  let profiles = Array.isArray(d && d.profiles) ? d.profiles.slice(0, MAX_PROFILES).map(sanitizeProfile) : [];
  if (profiles.length === 0) profiles = [emptyProfile()];
  const ids = new Set();
  profiles.forEach((p) => { while (ids.has(p.id)) p.id = newId(); ids.add(p.id); });
  const active = ids.has(d && d.activeProfile) ? d.activeProfile : profiles[0].id;
  profiles.forEach((p) => p.pages.forEach((pg) => pg.keys.forEach((k) => {
    if (k.action.type === 'profile' && !ids.has(k.action.profileId)) k.action = { type: 'none' };
  })));
  const s = (d && d.settings) || {};
  return { version: 2, activeProfile: active, profiles, settings: { startHidden: !!s.startHidden, autostart: !!s.autostart, lang: ['en', 'fr', 'es'].includes(s.lang) ? s.lang : 'en' } };
}

class Store {
  constructor(file) { this.file = file; this.data = this._load(); }
  _load() {
    try { return sanitizeData(JSON.parse(fs.readFileSync(this.file, 'utf8'))); } catch (_) { return sanitizeData(null); }
  }
  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }
  replace(d) { this.data = sanitizeData(d); this.save(); return this.data; }
  get() { return this.data; }
}

module.exports = { Store, sanitizeData, sanitizeAction, emptyProfile, emptyPage, NUM_KEYS, ID_RE };
