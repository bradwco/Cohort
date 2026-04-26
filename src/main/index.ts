import { app, BrowserWindow } from 'electron';
import { resolve } from 'node:path';
import { createMainWindow } from './windows/main_window';
import { createOverlayWindow } from './windows/overlay_window';
import { registerIpcHandlers } from './ipc';
import { destroyMqtt, setDockedCallback, setOfflineCallback } from './mqtt';

const PROTOCOL = 'cohort';

// Register cohort:// as the default handler so email magic links and OAuth
// callbacks open back in the app instead of the system browser.
if (process.defaultApp) {
  // Dev: electron is launched as "electron .", so we need to pass the script path
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [resolve(process.argv[1]!)]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Windows/Linux require a single-instance lock so deep links from a second
// launch are forwarded to the already-running window instead of opening a dupe.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLink = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (deepLink) sendDeepLink(deepLink);

    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  let mainWin: BrowserWindow | null = null;
  let overlayWin: BrowserWindow | null = null;

  function showOverlay(): void {
    if (overlayWin && !overlayWin.isDestroyed()) {
      mainWin?.hide();
      overlayWin.show();
      overlayWin.focus();
      return;
    }
    mainWin?.hide();
    overlayWin = createOverlayWindow();
    overlayWin.on('closed', () => {
      overlayWin = null;
      mainWin?.show();
      mainWin?.focus();
    });
  }

  function closeOverlay(): void {
    if (overlayWin && !overlayWin.isDestroyed()) overlayWin.close();
  }

  app.whenReady().then(() => {
    registerIpcHandlers({
      onResumeSession: showOverlay,
    });
    mainWin = createMainWindow();

    setDockedCallback(() => {
      showOverlay();
    });

    setOfflineCallback(() => {
      closeOverlay();
    });

    app.on('activate', () => {
      if (!mainWin || mainWin.isDestroyed()) mainWin = createMainWindow();
      else { mainWin.show(); mainWin.focus(); }
    });
  });

  app.on('window-all-closed', () => {
    destroyMqtt();
    if (process.platform !== 'darwin') app.quit();
  });
}

// macOS: deep links arrive via open-url while the app is already running
app.on('open-url', (event, url) => {
  event.preventDefault();
  sendDeepLink(url);
});

function sendDeepLink(url: string) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('app:deep-link', url);
  }
}
