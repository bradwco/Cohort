const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  takeScreenshot:       ()       => ipcRenderer.invoke('take-screenshot'),
  takeThumbnail:        ()       => ipcRenderer.invoke('take-thumbnail'),
  classifyScreen:       (payload) => ipcRenderer.invoke('classify-screen', payload),
  getConfig:            ()       => ipcRenderer.invoke('get-config'),
  createSession:        (data)   => ipcRenderer.invoke('create-session', data),
  endSession:           (data)   => ipcRenderer.invoke('end-session', data),
  pauseSession:         ()       => ipcRenderer.invoke('pause-session'),
});
