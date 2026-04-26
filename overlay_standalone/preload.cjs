const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  takeScreenshot:       ()       => ipcRenderer.invoke('take-screenshot'),
  takeThumbnail:        ()       => ipcRenderer.invoke('take-thumbnail'),
  classifyScreen:       (payload) => ipcRenderer.invoke('classify-screen', payload),
  getConfig:            ()       => ipcRenderer.invoke('get-config'),
  createSession:        (data)   => ipcRenderer.invoke('create-session', data),
  endSession:           (data)   => ipcRenderer.invoke('end-session', data),
<<<<<<< HEAD
  pauseSession:         ()       => ipcRenderer.invoke('pause-session'),
=======
  updateFocusState:     (state)  => ipcRenderer.invoke('update-focus-state', state),
>>>>>>> 5c21c71b6cd8ea341a561471b39da79bc8d967b4
});
