// Minimal standalone Electron entry — runs ONLY the overlay window.
// No connection to the main app's source. Iterate on index.html, re-run, repeat.
//
// To wire this into the main app later, copy the BrowserWindow setup +
// the three setX(...) calls into src/main/windows/overlay_window.ts.

const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createOverlay() {
  const win = new BrowserWindow({
    width: 360,
    height: 220,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Cluely / Discord-style flags:
  win.setAlwaysOnTop(true, 'screen-saver');                            // beat fullscreen apps
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });  // follow across desktops/spaces

  // Click-through is OFF during dev so you can drag the window and click the button.
  // Flip on later for production: win.setIgnoreMouseEvents(true, { forward: true });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createOverlay);
app.on('window-all-closed', () => app.quit());
