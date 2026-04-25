const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  takeScreenshot:       ()       => ipcRenderer.invoke('take-screenshot'),
  getConfig:            ()       => ipcRenderer.invoke('get-config'),
});
