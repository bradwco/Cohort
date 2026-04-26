import { BrowserWindow, shell, nativeImage } from 'electron';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

function loadAppIcon() {
  const iconPath = join(__dirname, '../../resources/icon.ico');
  if (existsSync(iconPath)) return nativeImage.createFromPath(iconPath);
  return undefined;
}

export function createMainWindow(): BrowserWindow {
  const icon = loadAppIcon();
  const win = new BrowserWindow({
    ...(icon ? { icon } : {}),
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#08090f',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#08090f',
      symbolColor: '#f4e7d4',
      height: 34,
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.on('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}
