const { app, BrowserWindow, screen, ipcMain, desktopCapturer } = require('electron');
const path = require('node:path');
const fs   = require('node:fs');

function loadEnv() {
  try {
    const envPath = ['.env', '.env.example'].map(f => path.join(__dirname, '..', f)).find(f => fs.existsSync(f));
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    const out = {};
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
    return out;
  } catch { return {}; }
}

const env = loadEnv();

ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
  BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.handle('get-config', () => ({ GEMINI_API_KEY: env.GEMINI_API_KEY || '' }));

ipcMain.handle('take-screenshot', async () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });
  return sources[0]?.thumbnail.toDataURL() ?? null;
});

function createOverlay() {
  const { workArea } = screen.getPrimaryDisplay();

  const win = new BrowserWindow({
    width:  workArea.width,
    height: workArea.height,
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

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createOverlay);
app.on('window-all-closed', () => app.quit());
