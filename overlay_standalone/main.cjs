const { app, BrowserWindow, screen, ipcMain, desktopCapturer } = require('electron');
const path = require('node:path');
const fs   = require('node:fs');
const os   = require('node:os');

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

function getStoredUserId() {
  try {
    const filePath = path.join(os.tmpdir(), 'cohort-user.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('[userId] read from file:', data.userId);
    return data.userId ?? null;
  } catch (e) {
    console.warn('[userId] file read failed:', e.message, '— using env.USER_ID');
    return env.USER_ID ?? null;
  }
}

ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
  BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.handle('get-config', () => ({
  GEMINI_API_KEY:    env.GEMINI_API_KEY    || '',
  LOCAL_VLM_URL:     env.LOCAL_VLM_URL     || 'http://127.0.0.1:11434/api/chat',
  LOCAL_VLM_MODEL:   env.LOCAL_VLM_MODEL   || 'moondream',
  SUPABASE_URL:      env.SUPABASE_URL      || '',
  SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || '',
  USER_ID:           getStoredUserId()     || '',
}));

ipcMain.handle('create-session', async (_event, { plannedDurationMinutes, workflowGroup }) => {
  const url    = (env.SUPABASE_URL || '').replace(/\/$/, '');
  const key    = env.SUPABASE_ANON_KEY || '';
  const userId = getStoredUserId();
  if (!url || !key) throw new Error('Supabase not configured');

  const resp = await fetch(`${url}/rest/v1/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Prefer':        'return=representation',
    },
    body: JSON.stringify({
      user_id:                  userId,
      workflow_group:           workflowGroup,
      planned_duration_minutes: plannedDurationMinutes,
      started_at:               new Date().toISOString(),
      pause_minutes_used:       0,
    }),
  });
  if (!resp.ok) throw new Error(`Supabase create-session ${resp.status}: ${await resp.text()}`);
  const rows = await resp.json();
  return rows[0]?.id ?? null;
});

ipcMain.handle('end-session', async (_event, { sessionId, flowScore, conversationHistory }) => {
  const url = (env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_ANON_KEY || '';
  if (!url || !key || !sessionId) return;

  const resp = await fetch(`${url}/rest/v1/sessions?id=eq.${sessionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      ended_at:             new Date().toISOString(),
      pause_minutes_used:   0,
      flow_score:           flowScore ?? null,
      conversation_history: conversationHistory ?? [],
    }),
  });
  if (!resp.ok) console.warn(`[session] end-session ${resp.status}: ${await resp.text()}`);
});

ipcMain.handle('take-screenshot', async () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });
  return sources[0]?.thumbnail.toDataURL() ?? null;
});

ipcMain.handle('take-thumbnail', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 960, height: 540 },
  });
  return sources[0]?.thumbnail.toDataURL() ?? null;
});

ipcMain.handle('classify-screen', async (_event, { imageDataUrl, endpoint, model }) => {
  const base64 = imageDataUrl.split(',')[1];
  const prompt = [
    'Classify this screen for a focus timer.',
    'Use context, not just app names.',
    'Return exactly one label:',
    'deep_work = coding, writing, design, studying, technical reading',
    'admin = calendar, email, settings, planning, short operational work',
    'distracted = entertainment, shopping, social feeds, games, memes, unrelated browsing',
  ].join('\n');

  const resp = await fetch(endpoint || env.LOCAL_VLM_URL || 'http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || env.LOCAL_VLM_MODEL || 'moondream',
      stream: false,
      messages: [{
        role: 'user',
        content: prompt,
        images: [base64],
      }],
    }),
  });

  if (!resp.ok) throw new Error(`Local classifier ${resp.status}`);

  const data = await resp.json();
  const text = String(data.message?.content ?? data.response ?? '').toLowerCase().trim();
  if (text.includes('distracted') || text.includes('distraction')) return 'distracted';
  if (text.includes('admin')) return 'admin';
  if (text.includes('deep')) return 'deep_work';
  if (text.includes('productive')) return 'deep_work';
  return 'distracted';
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
  win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(createOverlay);
app.on('window-all-closed', () => app.quit());
