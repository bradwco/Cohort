// Minimal standalone Electron entry — runs ONLY the overlay window.
// Pinned to the middle of the right edge of the primary display, not movable.
//
// Window is intentionally wider than the visible column (~280px vs ~72px)
// so hover-name tooltips on the avatars can render to the LEFT of the column
// without being clipped by the window edge.

const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('node:path');

function createOverlay() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = workArea.width;
  const height = workArea.height;

  const win = new BrowserWindow({
    width,
    height,
    x: workArea.x,
    y: workArea.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Cluely / Discord-style flags:
  win.setAlwaysOnTop(true, 'screen-saver');                            // beat fullscreen apps
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });  // follow across desktops/spaces

  // Click-through stays OFF so the avatar hover, timer, and stop button work.
  // For production we'll toggle it on via setIgnoreMouseEvents(true, { forward: true })
  // and flip it off only when the cursor enters an interactive element.

  // Click-through by default; renderer toggles off when cursor is over UI.
  win.setIgnoreMouseEvents(true, { forward: true });

  ipcMain.on('set-ignore-mouse-events', (_, ignore) => {
    win.setIgnoreMouseEvents(ignore, { forward: true });
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createOverlay);
app.on('window-all-closed', () => app.quit());
