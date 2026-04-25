import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './windows/main_window';
import { registerIpcHandlers } from './ipc';
import { destroyMqtt } from './mqtt';

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  destroyMqtt();
  if (process.platform !== 'darwin') app.quit();
});
