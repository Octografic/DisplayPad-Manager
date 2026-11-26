'use strict';
// Interface : tout texte utilisateur passe par textContent / value, jamais par innerHTML (anti-XSS).

const $ = (id) => document.getElementById(id);
const ICON = 104;
const MODS = ['ctrl', 'shift', 'alt', 'win'];
const NAMES = { ctrl: 'Ctrl', alt: 'Alt', win: 'Win', backspace: '⌫', pageup: 'PgUp', pagedown: 'PgDn', left: '←', right: '→', up: '↑', down: '↓', volumeup: 'Vol +', volumedown: 'Vol −' };
const prettyKey = (k) => t('k')[k] || NAMES[k] || k.toUpperCase();

// Doit rester cohérent avec src/keys.js (le preload sandboxé ne peut pas l'importer).
function fromEventCode(code) {
  let m;
  if ((m = /^Key([A-Z])$/.exec(code))) return m[1].toLowerCase();
  if ((m = /^Digit([0-9])$/.exec(code))) return m[1];
  if ((m = /^Numpad([0-9])$/.exec(code))) return m[1];
  if ((m = /^F([0-9]{1,2})$/.exec(code))) return +m[1] >= 1 && +m[1] <= 24 ? 'f' + m[1] : null;
  const map = { ControlLeft: 'ctrl', ControlRight: 'ctrl', ShiftLeft: 'shift', ShiftRight: 'shift', AltLeft: 'alt', AltRight: 'alt', MetaLeft: 'win', MetaRight: 'win', Enter: 'enter', NumpadEnter: 'enter', Escape: 'esc', Tab: 'tab', Space: 'space', Backspace: 'backspace', Delete: 'delete', Insert: 'insert', Home: 'home', End: 'end', PageUp: 'pageup', PageDown: 'pagedown', ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', PrintScreen: 'printscreen', MediaPlayPause: 'playpause', MediaTrackNext: 'nexttrack', MediaTrackPrevious: 'prevtrack', MediaStop: 'stopmedia', AudioVolumeUp: 'volumeup', AudioVolumeDown: 'volumedown', AudioVolumeMute: 'mute' };
  return map[code] || null;
}

let data = null;
let imgs = { keys: Array(12).fill(null), global: null };
let sel = -1;
let saveTimer = null;
const imgCache = new Map();

const profile = () => data.profiles.find((p) => p.id === data.activeProfile) || data.profiles[0];
const page = () => { const p = profile(); return p.pages.find((g) => g.id === p.activePage) || p.pages[0]; };
const blankKey = () => ({ label: '', image: null, bg: '#000000', textColor: '#ffffff', action: { type: 'none' } });
const blankPage = (n) => ({ id: rid(), name: t('page') + ' ' + n, global: false, keys: Array.from({ length: 12 }, blankKey) });
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');

// ---------- Sauvegarde ----------
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveTimer); saveTimer = null; await window.api.saveData(data); }

// ---------- Rendu d'une touche ----------
function loadImg(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  imgCache.set(src, p);
  if (imgCache.size > 60) imgCache.delete(imgCache.keys().next().value);
  return p;
}

function actionText(a) {
  switch (a.type) {
    case 'shortcut': return a.keys.map(prettyKey).join('+');
    case 'url': try { return new URL(a.url).hostname.replace(/^www\./, ''); } catch (_) { return t('link'); }
    case 'launch': return a.path.split(/[\\/]/).pop().replace(/\.(exe|bat|cmd|lnk)$/i, '');
    case 'page': { const g = profile().pages.find((x) => x.id === a.pageId); return '→ ' + (g ? g.name : t('page')); }
    case 'profile': { const p = data.profiles.find((x) => x.id === a.profileId); return '⇒ ' + (p ? p.name : t('profile')); }
    default: return '';
  }
}

// Découpe un texte en lignes tenant dans la touche (3 lignes max).
function wrapLines(ctx, text, max) {
  const words = text.split(/(?<=[+ /])/); const lines = []; let cur = '';
  for (const w of words) {
    if (ctx.measureText(cur + w).width <= max || !cur) cur += w; else { lines.push(cur.trim()); cur = w; }
  }
  if (cur) lines.push(cur.trim());
  return lines;
}

async function compose(k, i) {
  const c = $('work'); const ctx = c.getContext('2d');
  ctx.fillStyle = k.bg; ctx.fillRect(0, 0, ICON, ICON);
  let drawn = false;
  try {
    if (page().global && imgs.global) {
      const im = await loadImg(imgs.global);
      const tw = im.width / 6, th = im.height / 2;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(im, (i % 6) * tw, Math.floor(i / 6) * th, tw, th, 0, 0, ICON, ICON);
      drawn = true;
    } else if (!page().global && imgs.keys[i]) {
      ctx.drawImage(await loadImg(imgs.keys[i]), 0, 0, ICON, ICON);
      drawn = true;
    }
  } catch (_) { /* image illisible : fond seul */ }
  ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)';
  if (k.label) {
    let size = 16;
    do { ctx.font = `bold ${size}px "Segoe UI", sans-serif`; size--; } while (ctx.measureText(k.label).width > ICON - 8 && size > 8);
    ctx.textBaseline = 'alphabetic';
    ctx.strokeText(k.label, ICON / 2, ICON - 8);
    ctx.fillStyle = k.textColor; ctx.fillText(k.label, ICON / 2, ICON - 8);
    drawn = true;
  } else if (!drawn && k.action.type !== 'none') {
    // Pas d'image ni de texte : on affiche l'action (ex. « Ctrl+Maj+M »).
    const txt = actionText(k.action);
    let size = 20, lines;
    do { ctx.font = `bold ${size}px "Segoe UI", sans-serif`; lines = wrapLines(ctx, txt, ICON - 10); size--; }
    while ((lines.length > 3 || lines.some((l) => ctx.measureText(l).width > ICON - 10)) && size > 9);
    const lh = size + 4; const y0 = ICON / 2 - ((lines.length - 1) * lh) / 2;
    ctx.textBaseline = 'middle'; ctx.fillStyle = k.textColor;
    lines.slice(0, 3).forEach((l, n) => ctx.fillText(l, ICON / 2, y0 + n * lh));
    drawn = true;
  }
  return drawn ? c.toDataURL('image/png') : null;
}

// Composition sérialisée : un seul canvas de travail partagé.
let chain = Promise.resolve();
function refreshKey(i, save = true) {
  chain = chain.then(async () => {
    const k = page().keys[i];
    k.image = await compose(k, i);
    drawTile(i);
  });
  if (save) chain = chain.then(scheduleSave);
  return chain;
}
async function refreshAll() {
  for (let i = 0; i < 12; i++) refreshKey(i, false);
  await chain; scheduleSave();
}
async function loadPageImages() {
  imgs = await window.api.pageImages(profile().id, page().id);
  await refreshAll();
}

function drawTile(i) {
  const btn = $('pad').children[i];
  const k = page().keys[i];
  btn.replaceChildren();
  const num = document.createElement('span'); num.className = 'num'; num.textContent = String(i + 1);
  btn.append(num);
  if (k.image) { const im = document.createElement('img'); im.src = k.image; im.alt = ''; btn.append(im); }
  btn.classList.toggle('sel', i === sel);
}

function buildPad() {
  const pad = $('pad'); pad.replaceChildren();
  for (let i = 0; i < 12; i++) {
    const b = document.createElement('button'); b.className = 'key'; b.type = 'button';
    b.setAttribute('aria-label', 'Touche ' + (i + 1));
    b.addEventListener('click', () => select(i));
    pad.append(b);
  }
  for (let i = 0; i < 12; i++) drawTile(i);
}

// ---------- Profils ----------
function buildProfiles() {
  const s = $('profileSelect'); s.replaceChildren();
  for (const p of data.profiles) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; s.append(o); }
  s.value = data.activeProfile;
  $('profileName').value = profile().name;
  const t = $('profileTarget'); t.replaceChildren();
  for (const p of data.profiles) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; t.append(o); }
  const ps = $('pageSelect'); const pt = $('pageTarget'); ps.replaceChildren(); pt.replaceChildren();
  for (const g of profile().pages) {
    for (const sel of [ps, pt]) { const o = document.createElement('option'); o.value = g.id; o.textContent = g.name; sel.append(o); }
  }
  ps.value = page().id; $('pageName').value = page().name;
  $('optGlobal').checked = page().global;
  $('btnGlobal').hidden = $('btnClearGlobal').hidden = !page().global;
}

async function setActive(id) { data.activeProfile = id; await flush(); await fullRender(); }
async function setPage(id) { profile().activePage = id; await flush(); await fullRender(); }

// ---------- Éditeur ----------
function select(i) {
  sel = i; $('editor').hidden = false; $('keyNum').textContent = String(i + 1);
  for (let j = 0; j < 12; j++) $('pad').children[j].classList.toggle('sel', j === i);
  const k = page().keys[i];
  $('globalNote').hidden = !page().global; $('keyImgBox').hidden = page().global;
  $('bg').value = k.bg; $('label').value = k.label; $('textColor').value = k.textColor;
  const a = k.action; $('actionType').value = a.type; showAction(a.type);
  $('shortcutBox').value = a.type === 'shortcut' ? a.keys.map(prettyKey).join(' + ') : '';
  $('mediaKey').value = '';
  $('launchPath').value = a.type === 'launch' ? a.path : ''; $('launchArgs').value = a.type === 'launch' ? a.args : '';
  $('urlInput').value = a.type === 'url' ? a.url : ''; $('urlWarn').hidden = true;
  if (a.type === 'profile') $('profileTarget').value = a.profileId;
  if (a.type === 'page') $('pageTarget').value = a.pageId;
}

function showAction(t) {
  $('actShortcut').hidden = t !== 'shortcut'; $('actLaunch').hidden = t !== 'launch';
  $('actUrl').hidden = t !== 'url'; $('actProfile').hidden = t !== 'profile'; $('actPage').hidden = t !== 'page';
}

function setAction(a) { page().keys[sel].action = a; refreshKey(sel); }
const key = () => page().keys[sel];

function bindEditor() {
  $('bg').addEventListener('input', () => { key().bg = $('bg').value; refreshKey(sel); });
  $('textColor').addEventListener('input', () => { key().textColor = $('textColor').value; refreshKey(sel); });
  $('label').addEventListener('input', () => { key().label = $('label').value.slice(0, 40); refreshKey(sel); });

  $('actionType').addEventListener('change', () => {
    const t = $('actionType').value; showAction(t);
    if (t === 'none') setAction({ type: 'none' });
    else if (t === 'profile') setAction({ type: 'profile', profileId: $('profileTarget').value });
    else if (t === 'page') setAction({ type: 'page', pageId: $('pageTarget').value });
    else setAction({ type: 'none' });
  });

  // Enregistreur de raccourci
  $('shortcutBox').addEventListener('keydown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.repeat) return;
    const name = fromEventCode(e.code);
    if (!name) return;
    const mods = MODS.filter((m) => ({ ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, win: e.metaKey })[m]);
    if (MODS.includes(name)) { $('shortcutBox').value = mods.map(prettyKey).join(' + ') + ' + …'; return; }
    const keys = [...mods, name];
    $('shortcutBox').value = keys.map(prettyKey).join(' + ');
    setAction({ type: 'shortcut', keys });
  });
  $('mediaKey').addEventListener('change', () => {
    const v = $('mediaKey').value; if (!v) return;
    $('shortcutBox').value = prettyKey(v); setAction({ type: 'shortcut', keys: [v] });
  });

  $('btnBrowse').addEventListener('click', async () => { const p = await window.api.pickExe(); if (p) { $('launchPath').value = p; updateLaunch(); } });
  $('launchPath').addEventListener('input', updateLaunch);
  $('launchArgs').addEventListener('input', updateLaunch);
  $('urlInput').addEventListener('input', () => {
    const v = $('urlInput').value.trim(); let ok = false;
    try { const u = new URL(v); ok = u.protocol === 'http:' || u.protocol === 'https:'; } catch (_) { /* invalide */ }
    $('urlWarn').hidden = ok || !v;
    setAction(ok ? { type: 'url', url: v } : { type: 'none' });
  });
  $('pageTarget').addEventListener('change', () => setAction({ type: 'page', pageId: $('pageTarget').value }));
  $('profileTarget').addEventListener('change', () => setAction({ type: 'profile', profileId: $('profileTarget').value }));

  $('btnTest').addEventListener('click', async () => { await flush(); window.api.testAction(sel); });
  $('btnResetKey').addEventListener('click', () => {
    Object.assign(key(), blankKey());
    if (!page().global && imgs.keys[sel]) window.api.clearKeyImage(profile().id, page().id, sel).then((r) => { imgs = r; refreshKey(sel); });
    select(sel); refreshKey(sel);
  });

  // Image
  const drop = $('drop');
  drop.addEventListener('click', () => $('file').click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') $('file').click(); });
  $('btnPick').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', () => { const f = $('file').files[0]; if (f) useFile(f); $('file').value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) useFile(f); });
  $('btnClearImg').addEventListener('click', async () => { imgs = await window.api.clearKeyImage(profile().id, page().id, sel); refreshKey(sel); });
}

function updateLaunch() {
  const p = $('launchPath').value.trim();
  setAction(p ? { type: 'launch', path: p, args: $('launchArgs').value.slice(0, 500) } : { type: 'none' });
}

// Lit un fichier image et le recadre (remplissage) aux dimensions demandées.
async function fileToCanvas(f, w, h) {
  if (!/^image\/(png|jpeg|gif|bmp|webp)$/.test(f.type) || f.size > 10 * 1024 * 1024) throw new Error('Format non pris en charge');
  const url = URL.createObjectURL(f);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const r = Math.max(w / im.width, h / im.height); const dw = im.width * r, dh = im.height * r;
    const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

async function useFile(f) {
  if (sel < 0 || page().global) return;
  try {
    const c = await fileToCanvas(f, 104, 104);
    imgs = await window.api.setKeyImage(profile().id, page().id, sel, c.toDataURL('image/png'));
    await refreshKey(sel);
  } catch (_) { alert(t('badImage')); }
}

async function useGlobalFile(f) {
  try {
    const c = await fileToCanvas(f, 624, 208);
    imgs = await window.api.setGlobalImage(profile().id, page().id, c.toDataURL('image/jpeg', 0.92));
    await refreshAll();
  } catch (_) { alert(t('badImage')); }
}

// ---------- Rendu global ----------
async function fullRender() { buildProfiles(); buildPad(); await loadPageImages(); $('optAutostart').checked = data.settings.autostart; $('optHidden').checked = data.settings.startHidden; if (sel >= 0) select(sel); }

function setStatus(ok) {
  connectedNow = ok;
  $('status').className = 'status ' + (ok ? 'on' : 'off');
  $('statusText').textContent = t(ok ? 'connected' : 'noDevice');
  $('hint').hidden = ok;
}

function setLang(lang) {
  applyI18n(lang);
  document.querySelectorAll('[data-mk]').forEach((o) => { o.textContent = prettyKey(o.value); });
  setStatus(connectedNow);
  if (sel >= 0) select(sel);
  refreshAll(); // les textes d'action affichés sur les touches suivent la langue
}
let connectedNow = false;

async function init() {
  const st = await window.api.getState();
  data = st.data;
  applyI18n(data.settings.lang);
  document.querySelectorAll('[data-mk]').forEach((o) => { o.textContent = prettyKey(o.value); });
  setStatus(st.connected);
  document.querySelectorAll('.flag').forEach((b) => b.addEventListener('click', () => {
    data.settings.lang = b.dataset.lang; setLang(b.dataset.lang);
  }));
  bindEditor(); await fullRender();

  window.api.onDeviceStatus(setStatus);
  window.api.onState(async (s) => { clearTimeout(saveTimer); data = s.data; await fullRender(); });
  window.api.onKeyEvent(({ index, down }) => { const b = $('pad').children[index]; if (b) b.classList.toggle('pressed', !!down); });

  $('profileSelect').addEventListener('change', () => setActive($('profileSelect').value));
  $('profileName').addEventListener('input', () => { profile().name = $('profileName').value.slice(0, 40) || t('profile'); const o = $('profileSelect').selectedOptions[0]; if (o) o.textContent = profile().name; scheduleSave(); });
  $('btnNewProfile').addEventListener('click', async () => {
    if (data.profiles.length >= 50) return;
    const pg = blankPage(1);
    const p = { id: rid(), name: t('profile') + ' ' + (data.profiles.length + 1), activePage: pg.id, pages: [pg] };
    data.profiles.push(p); await setActive(p.id);
  });
  $('btnDupProfile').addEventListener('click', async () => {
    if (data.profiles.length >= 50) return;
    // Les pages reçoivent de nouveaux identifiants ; les liens entre pages sont remappés.
    const p = JSON.parse(JSON.stringify(profile())); p.id = rid(); p.name = (p.name + t('copy')).slice(0, 40);
    const map = {}; p.pages.forEach((g) => { map[g.id] = rid(); g.id = map[g.id]; });
    p.activePage = map[p.activePage];
    p.pages.forEach((g) => g.keys.forEach((k) => { if (k.action.type === 'page') k.action.pageId = map[k.action.pageId]; }));
    data.profiles.push(p); await setActive(p.id);
  });
  $('btnDelProfile').addEventListener('click', async () => {
    if (data.profiles.length <= 1 || !confirm(t('confirmDelProfile', profile().name))) return;
    const id = data.activeProfile; data.profiles = data.profiles.filter((p) => p.id !== id);
    data.activeProfile = data.profiles[0].id; await setActive(data.activeProfile);
  });
  $('btnExport').addEventListener('click', async () => { await flush(); window.api.exportData(); });
  $('btnImport').addEventListener('click', async () => {
    if (!confirm(t('confirmImport'))) return;
    try { const d = await window.api.importData(); if (d) { data = d; sel = -1; $('editor').hidden = true; await fullRender(); } } catch (_) { alert(t('badFile')); }
  });
  $('pageSelect').addEventListener('change', () => setPage($('pageSelect').value));
  $('pageName').addEventListener('input', () => { page().name = $('pageName').value.slice(0, 40) || t('page'); const o = $('pageSelect').selectedOptions[0]; if (o) o.textContent = page().name; scheduleSave(); });
  $('btnNewPage').addEventListener('click', async () => {
    if (profile().pages.length >= 30) return;
    const g = blankPage(profile().pages.length + 1); profile().pages.push(g); await setPage(g.id);
  });
  $('btnDelPage').addEventListener('click', async () => {
    const p = profile();
    if (p.pages.length <= 1 || !confirm(t('confirmDelPage', page().name))) return;
    const id = p.activePage; p.pages = p.pages.filter((g) => g.id !== id);
    p.pages.forEach((g) => g.keys.forEach((k) => { if (k.action.type === 'page' && k.action.pageId === id) k.action = { type: 'none' }; }));
    await setPage(p.pages[0].id);
  });
  $('optGlobal').addEventListener('change', async () => {
    page().global = $('optGlobal').checked;
    $('btnGlobal').hidden = $('btnClearGlobal').hidden = !page().global;
    if (sel >= 0) select(sel);
    await refreshAll();
  });
  $('btnGlobal').addEventListener('click', () => $('globalFile').click());
  $('globalFile').addEventListener('change', () => { const f = $('globalFile').files[0]; if (f) useGlobalFile(f); $('globalFile').value = ''; });
  $('btnClearGlobal').addEventListener('click', async () => { imgs = await window.api.clearGlobalImage(profile().id, page().id); await refreshAll(); });
  $('btnOpenDir').addEventListener('click', async () => { await flush(); window.api.openImagesDir(profile().id, page().id); });
  $('optAutostart').addEventListener('change', () => { data.settings.autostart = $('optAutostart').checked; scheduleSave(); });
  $('optHidden').addEventListener('change', () => { data.settings.startHidden = $('optHidden').checked; scheduleSave(); });
}

init();
