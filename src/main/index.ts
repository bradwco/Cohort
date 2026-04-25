import { app, BrowserWindow, ipcMain } from 'electron';
import { createMainWindow } from './windows/main_window';

app.whenReady().then(() => {
  ipcMain.handle('app:ping', () => 'pong');

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
