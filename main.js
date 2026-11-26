'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { Store, sanitizeData, sanitizeAction, ID_RE } = require('./src/store');
const { DeviceManager, ICON_SIZE } = require('./src/device');
const { KeySender } = require('./src/sender');

let win = null;
let tray = null;
let quitting = false;
let store;
const device = new DeviceManager();
const sender = new KeySender();

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => showWindow());

// Textes du processus principal (menu de la zone de notification, boîtes de dialogue)
const MAIN_I18N = {
  en: { open: 'Open', quit: 'Quit', programs: 'Programs', all: 'All files', exportName: 'displaypad-profiles.json' },
  fr: { open: 'Ouvrir', quit: 'Quitter', programs: 'Programmes', all: 'Tous les fichiers', exportName: 'displaypad-profils.json' },
  es: { open: 'Abrir', quit: 'Salir', programs: 'Programas', all: 'Todos los archivos', exportName: 'displaypad-perfiles.json' },
};
const tr = (k) => (MAIN_I18N[store && store.get().settings.lang] || MAIN_I18N.en)[k];

function buildTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: tr('open'), click: showWindow },
    { type: 'separator' },
    { label: tr('quit'), click: () => { quitting = true; app.quit(); } },
  ]));
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}

// ---------- Images ----------
const KEY_PX = 104;               // taille des fichiers sources par touche
const GLOBAL_W = 624, GLOBAL_H = 208; // image globale : 6 x 2 touches de 104 px
let imagesRoot;

// Chemin construit uniquement à partir d'identifiants hexadécimaux validés : aucune traversée possible.
function pageDir(profileId, pageId) {
  if (!ID_RE.test(profileId || '') || !ID_RE.test(pageId || '')) throw new Error('Identifiant invalide');
  return path.join(imagesRoot, profileId, pageId);
}
const validIndex = (i) => Number.isInteger(i) && i >= 0 && i < 12;
const IMG_DATA_RE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;

function decodeImage(dataUrl, w, h) {
  if (typeof dataUrl !== 'string' || dataUrl.length > 15 * 1024 * 1024 || !IMG_DATA_RE.test(dataUrl)) throw new Error('Image invalide');
  let img = nativeImage.createFromDataURL(dataUrl);
  if (img.isEmpty()) throw new Error('Image illisible');
  const sz = img.getSize();
  if (sz.width !== w || sz.height !== h) img = img.resize({ width: w, height: h, quality: 'best' });
  return img;
}

function readAsDataUrl(file, mime) {
  try { return `data:${mime};base64,` + fs.readFileSync(file).toString('base64'); } catch (_) { return null; }
}

function pageImages(profileId, pageId) {
  const dir = pageDir(profileId, pageId);
  return {
    keys: Array.from({ length: 12 }, (_, i) => readAsDataUrl(path.join(dir, `${i + 1}.png`), 'image/png')),
    global: readAsDataUrl(path.join(dir, 'global.jpg'), 'image/jpeg'),
  };
}

// Supprime les dossiers d'images des profils / pages qui n'existent plus.
function cleanupImages() {
  const d = store.get();
  const keep = new Map(d.profiles.map((p) => [p.id, new Set(p.pages.map((pg) => pg.id))]));
  let profs = [];
  try { profs = fs.readdirSync(imagesRoot); } catch (_) { return; }
  for (const pid of profs) {
    if (!ID_RE.test(pid)) continue;
    const pdir = path.join(imagesRoot, pid);
    if (!keep.has(pid)) { fs.rmSync(pdir, { recursive: true, force: true }); continue; }
    for (const gid of fs.readdirSync(pdir)) {
      if (ID_RE.test(gid) && !keep.get(pid).has(gid)) fs.rmSync(path.join(pdir, gid), { recursive: true, force: true });
    }
  }
}

// Migration v1 : les images stockées dans le JSON deviennent des fichiers 1.png ... 12.png
function migrateLegacy() {
  let changed = false;
  for (const p of store.get().profiles) for (const pg of p.pages) pg.keys.forEach((k, i) => {
    if (!k.legacySrc) return;
    try {
      const dir = pageDir(p.id, pg.id); fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${i + 1}.png`), decodeImage(k.legacySrc, KEY_PX, KEY_PX).toPNG());
    } catch (_) { /* ignore */ }
    delete k.legacySrc; changed = true;
  });
  if (changed) store.save();
}

// dataURL PNG composée -> buffer RGB 102x102 attendu par l'appareil
function pngToRgb(dataUrl) {
  if (!dataUrl) return null;
  let img = nativeImage.createFromDataURL(dataUrl);
  if (img.isEmpty()) return null;
  const { width, height } = img.getSize();
  if (width !== ICON_SIZE || height !== ICON_SIZE) img = img.resize({ width: ICON_SIZE, height: ICON_SIZE, quality: 'best' });
  const bgra = img.toBitmap();
  const rgb = Buffer.alloc(ICON_SIZE * ICON_SIZE * 3);
  for (let i = 0, j = 0; i < bgra.length; i += 4, j += 3) {
    rgb[j] = bgra[i + 2]; rgb[j + 1] = bgra[i + 1]; rgb[j + 2] = bgra[i];
  }
  return rgb;
}

function activeProfile() {
  const d = store.get();
  return d.profiles.find((p) => p.id === d.activeProfile) || d.profiles[0];
}
function activePage() {
  const p = activeProfile();
  return p.pages.find((pg) => pg.id === p.activePage) || p.pages[0];
}

function pushToDevice() {
  // La conversion n'est faite que si l'image a changé (signature = dataURL composée).
  activePage().keys.forEach((k, i) => { if (device.shown[i] !== k.image) device.setKey(i, pngToRgb(k.image), k.image); });
}

// ---------- Actions déclenchées par les touches ----------
function runAction(index) {
  const key = activePage().keys[index];
  if (!key) return;
  const a = sanitizeAction(key.action); // revalidation à l'exécution
  try {
    switch (a.type) {
      case 'shortcut': sender.send(a.keys); break;
      case 'url': shell.openExternal(a.url); break;
      case 'launch':
        if (fs.existsSync(a.path)) {
          const args = a.args ? a.args.match(/"[^"]*"|\S+/g).map((s) => s.replace(/^"|"$/g, '')) : [];
          execFile(a.path, args, { windowsHide: false, shell: false }, () => {}); // jamais de shell : pas d'injection
        }
        break;
      case 'profile': switchProfile(a.profileId); break;
      case 'page': switchPage(a.pageId); break;
      default: break;
    }
  } catch (_) { /* une action défaillante ne doit pas planter l'application */ }
}

function switchProfile(id) {
  const d = store.get();
  if (!d.profiles.some((p) => p.id === id)) return;
  d.activeProfile = id;
  store.save();
  pushToDevice();
  send('state', publicState());
}

function switchPage(id) {
  const p = activeProfile();
  if (!p.pages.some((pg) => pg.id === id)) return;
  p.activePage = id;
  store.save();
  pushToDevice();
  send('state', publicState());
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function publicState() {
  return { data: store.get(), connected: device.connected, platform: process.platform };
}

device.on('status', (ok) => { if (ok) pushToDevice(); send('device-status', ok); });
device.on('down', (i) => { send('key-event', { index: i, down: true }); runAction(i); });
device.on('up', (i) => send('key-event', { index: i, down: false }));

// ---------- IPC (toutes les entrées sont revalidées) ----------
function trusted(e) {
  return win && e.sender === win.webContents && e.senderFrame.url.startsWith('file://');
}
function handle(channel, fn) {
  ipcMain.handle(channel, (e, ...args) => {
    if (!trusted(e)) throw new Error('Appelant non autorisé');
    return fn(...args);
  });
}

handle('get-state', () => publicState());

handle('save-data', (raw) => {
  const data = store.replace(raw);
  cleanupImages();
  pushToDevice();
  applyAutostart();
  buildTrayMenu();
  return data;
});

handle('page-images', (profileId, pageId) => pageImages(profileId, pageId));

handle('set-key-image', (profileId, pageId, index, dataUrl) => {
  if (!validIndex(index)) throw new Error('Touche invalide');
  const dir = pageDir(profileId, pageId); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${index + 1}.png`), decodeImage(dataUrl, KEY_PX, KEY_PX).toPNG());
  return pageImages(profileId, pageId);
});

handle('clear-key-image', (profileId, pageId, index) => {
  if (!validIndex(index)) throw new Error('Touche invalide');
  fs.rmSync(path.join(pageDir(profileId, pageId), `${index + 1}.png`), { force: true });
  return pageImages(profileId, pageId);
});

handle('set-global-image', (profileId, pageId, dataUrl) => {
  const dir = pageDir(profileId, pageId); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'global.jpg'), decodeImage(dataUrl, GLOBAL_W, GLOBAL_H).toJPEG(92));
  return pageImages(profileId, pageId);
});

handle('clear-global-image', (profileId, pageId) => {
  fs.rmSync(path.join(pageDir(profileId, pageId), 'global.jpg'), { force: true });
  return pageImages(profileId, pageId);
});

handle('open-images-dir', async (profileId, pageId) => {
  const dir = pageDir(profileId, pageId); fs.mkdirSync(dir, { recursive: true });
  const err = await shell.openPath(dir);
  if (err) throw new Error(err);
});

handle('pick-exe', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: tr('programs'), extensions: ['exe', 'bat', 'cmd', 'lnk'] }, { name: tr('all'), extensions: ['*'] }] });
  return r.canceled ? null : r.filePaths[0];
});

handle('export-data', async () => {
  const r = await dialog.showSaveDialog(win, { defaultPath: tr('exportName'), filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, JSON.stringify(store.get(), null, 2));
  return true;
});

handle('import-data', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const stat = fs.statSync(r.filePaths[0]);
  if (stat.size > 20 * 1024 * 1024) throw new Error('Fichier trop volumineux');
  const parsed = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'));
  const data = store.replace(sanitizeData(parsed));
  cleanupImages();
  pushToDevice();
  return data;
});

handle('test-action', (index) => {
  if (Number.isInteger(index) && index >= 0 && index < 12) runAction(index);
});

function applyAutostart() {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: !!store.get().settings.autostart, args: ['--hidden'] });
}

// ---------- Fenêtre / zone de notification ----------
function trayIcon() {
  const s = 16; const buf = Buffer.alloc(s * s * 4);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const o = (y * s + x) * 4; const cell = (x % 8 < 6) && (y % 8 < 6);
    buf[o] = cell ? 0xff : 0; buf[o + 1] = cell ? 0x8a : 0; buf[o + 2] = cell ? 0x1f : 0; buf[o + 3] = cell ? 0xff : 0;
  }
  return nativeImage.createFromBitmap(buf, { width: s, height: s });
}

function createWindow(hidden) {
  win = new BrowserWindow({
    width: 1100, height: 720, minWidth: 900, minHeight: 600, show: !hidden,
    backgroundColor: '#14161a', title: 'DisplayPad Manager', autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true,
    },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('close', (e) => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

app.whenReady().then(() => {
  // Refuse toute demande de permission (caméra, notifications, etc.) et tout contenu distant.
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    cb({ cancel: !(details.url.startsWith('file://') || details.url.startsWith('devtools://')) });
  });

  store = new Store(path.join(app.getPath('userData'), 'displaypad.json'));
  imagesRoot = path.join(app.getPath('userData'), 'images');
  migrateLegacy();
  createWindow(process.argv.includes('--hidden') && store.get().settings.startHidden);

  tray = new Tray(trayIcon());
  tray.setToolTip('DisplayPad Manager');
  buildTrayMenu();
  tray.on('click', showWindow);

  device.start();
  applyAutostart();
});

app.on('before-quit', () => { quitting = true; device.stop(); sender.close(); });
app.on('window-all-closed', () => { /* reste actif dans la zone de notification */ });
