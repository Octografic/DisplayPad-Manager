'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Surface minimale exposée à la page : aucune API Node, aucun accès brut à ipcRenderer.
contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  pageImages: (pr, pg) => ipcRenderer.invoke('page-images', pr, pg),
  setKeyImage: (pr, pg, i, d) => ipcRenderer.invoke('set-key-image', pr, pg, i, d),
  clearKeyImage: (pr, pg, i) => ipcRenderer.invoke('clear-key-image', pr, pg, i),
  setGlobalImage: (pr, pg, d) => ipcRenderer.invoke('set-global-image', pr, pg, d),
  clearGlobalImage: (pr, pg) => ipcRenderer.invoke('clear-global-image', pr, pg),
  openImagesDir: (pr, pg) => ipcRenderer.invoke('open-images-dir', pr, pg),
  pickExe: () => ipcRenderer.invoke('pick-exe'),
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data'),
  testAction: (i) => ipcRenderer.invoke('test-action', i),
  onDeviceStatus: (cb) => ipcRenderer.on('device-status', (_e, ok) => cb(!!ok)),
  onKeyEvent: (cb) => ipcRenderer.on('key-event', (_e, p) => cb(p)),
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
});
