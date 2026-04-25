const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  takeScreenshot:       ()       => ipcRenderer.invoke('take-screenshot'),
  takeThumbnail:        ()       => ipcRenderer.invoke('take-thumbnail'),
  classifyScreen:       (payload) => ipcRenderer.invoke('classify-screen', payload),
  getConfig:            ()       => ipcRenderer.invoke('get-config'),
});
