import { BrowserWindow, desktopCapturer, ipcMain, screen, shell } from 'electron';
import * as fs from 'fs';
import * as nodePath from 'path';
import * as os from 'os';
import { CH, PUSH } from './channels';
import {
  getProfile,
  updateProfile,
  getFriendsWithProfiles,
  searchProfileByUsername,
  addFriend,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  getCohorts,
  createCohort,
  joinCohort,
  getSharedCohortProfiles,
  startSession,
  endSession,
  getSessionHistory,
  logActivity,
  getSessionActivityLogs,
} from '../supabase';
import {
  initMqtt,
  publishCommand,
  subscribeFriends,
  getPauseStats,
  setActiveSessionId,
  getActiveSessionId,
  simulateHardwareEvent,
  resetPauseStats,
} from '../mqtt';

export function registerIpcHandlers(): void {
  ipcMain.handle(CH.PING, () => 'pong');

  // Profiles
  ipcMain.handle(CH.PROFILE_GET, (_e, userId: string) => getProfile(userId));
  ipcMain.handle(
    CH.PROFILE_UPDATE,
    (_e, userId: string, updates: Parameters<typeof updateProfile>[1]) => updateProfile(userId, updates),
  );

  // Friends
  ipcMain.handle(CH.FRIENDS_LIST, (_e, userId: string) => getFriendsWithProfiles(userId));
  ipcMain.handle(CH.PROFILE_SEARCH, (_e, username: string) => searchProfileByUsername(username));
  ipcMain.handle(CH.FRIEND_ADD, (_e, userId: string, friendId: string) => addFriend(userId, friendId));
  ipcMain.handle(CH.FRIEND_REQUESTS_LIST, (_e, userId: string) => getFriendRequests(userId));
  ipcMain.handle(CH.FRIEND_REQUEST_SEND, (_e, requesterId: string, receiverId: string) => sendFriendRequest(requesterId, receiverId));
  ipcMain.handle(CH.FRIEND_REQUEST_ACCEPT, (_e, userId: string, requestId: string) => acceptFriendRequest(userId, requestId));
  ipcMain.handle(CH.FRIEND_NUDGE_SEND, (_e, fromUserId: string, toUserId: string, fromName: string) => {
    const payload = { fromUserId, toUserId, fromName, sentAt: new Date().toISOString() };
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(PUSH.FRIEND_NUDGE, payload);
    }
  });

  // Cohorts
  ipcMain.handle(CH.COHORTS_LIST, (_e, userId: string) => getCohorts(userId));
  ipcMain.handle(CH.COHORT_CREATE, (_e, userId: string, name: string) => createCohort(userId, name));
  ipcMain.handle(CH.COHORT_JOIN, (_e, userId: string, inviteCode: string) => joinCohort(userId, inviteCode));
  ipcMain.handle(CH.COHORT_SHARED_PROFILES, (_e, userId: string) => getSharedCohortProfiles(userId));

  // Sessions
  ipcMain.handle(
    CH.SESSION_START,
    async (_e, userId: string, workflowGroup: string, durationMins: number) => {
      const session = await startSession(userId, workflowGroup, durationMins);
      if (session) setActiveSessionId(session.id);
      return session;
    },
  );
  ipcMain.handle(CH.SESSION_END, async (_e, pauseMinutes: number, flowScore: number, aiSummary: string) => {
    const sessionId = getActiveSessionId();
    if (!sessionId) return;
    await endSession(sessionId, pauseMinutes, flowScore, aiSummary);
    setActiveSessionId(null);
  });
  ipcMain.handle(CH.SESSION_HISTORY, (_e, userId: string) => getSessionHistory(userId));

  // Activity logs
  ipcMain.handle(
    CH.ACTIVITY_LOG,
    (
      _e,
      sessionId: string,
      userId: string,
      eventType: Parameters<typeof logActivity>[2],
      eventDetail: Record<string, unknown>,
    ) => logActivity(sessionId, userId, eventType, eventDetail),
  );
  ipcMain.handle(CH.ACTIVITY_LOGS_GET, (_e, sessionId: string) => getSessionActivityLogs(sessionId));

  // MQTT
  ipcMain.handle(CH.MQTT_INIT, (_e, userId: string) => {
    initMqtt(userId);
  });
  ipcMain.handle(CH.MQTT_PUBLISH_COMMAND, (_e, userId: string, command: Record<string, unknown>) => {
    publishCommand(userId, command);
  });
  ipcMain.handle(CH.MQTT_SUBSCRIBE_FRIENDS, (_e, friendIds: string[]) => {
    subscribeFriends(friendIds);
  });
  ipcMain.handle(CH.MQTT_PAUSE_STATS, () => getPauseStats());

  // Hardware simulator
  ipcMain.handle(CH.HW_SIMULATE, (_e, userId: string, payload: Record<string, unknown>) =>
    simulateHardwareEvent(userId, payload),
  );

  // Save user session to shared file for overlay_standalone to read
  ipcMain.handle(CH.SAVE_USER_SESSION, (_e, userId: string, email: string) => {
    const filePath = nodePath.join(os.tmpdir(), 'cohort-user.json');
    fs.writeFileSync(filePath, JSON.stringify({ userId, email, savedAt: new Date().toISOString() }));
  });

  // Shell/auth windows
  ipcMain.handle(CH.OPEN_EXTERNAL, (_e, url: string) => shell.openExternal(url));
  ipcMain.handle(CH.OPEN_AUTH_WINDOW, (event, url: string) => openAuthWindow(url, BrowserWindow.fromWebContents(event.sender)));

  // Overlay window IPC
  ipcMain.on('set-ignore-mouse-events', (event, ignore: boolean) => {
    BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.handle('get-config', () => ({
    GEMINI_API_KEY: (import.meta.env.GEMINI_API_KEY as string) ?? '',
    LOCAL_VLM_URL: (import.meta.env.LOCAL_VLM_URL as string) ?? 'http://127.0.0.1:11434/api/chat',
    LOCAL_VLM_MODEL: (import.meta.env.LOCAL_VLM_MODEL as string) ?? 'moondream',
    SUPABASE_URL: (import.meta.env.SUPABASE_URL as string) ?? '',
    SUPABASE_ANON_KEY: (import.meta.env.SUPABASE_ANON_KEY as string) ?? '',
    USER_ID: getOverlayUserId(),
    SESSION_ID: getActiveSessionId() ?? '',
  }));

  ipcMain.handle('create-session', async (_e, { plannedDurationMinutes, workflowGroup }: { plannedDurationMinutes: number; workflowGroup: string }) => {
    const userId = getOverlayUserId();
    if (!userId) return null;
    const session = await startSession(userId, workflowGroup, plannedDurationMinutes);
    if (session) setActiveSessionId(session.id);
    return session?.id ?? null;
  });

  ipcMain.handle(
    'end-session',
    async (_e, { sessionId, flowScore, conversationHistory }: { sessionId: string; flowScore: number | null; conversationHistory: unknown[] }) => {
      if (!sessionId) return;
      const userId = getOverlayUserId();
      await endSession(sessionId, 0, flowScore ?? 0, '', conversationHistory);
      if (userId) await updateProfile(userId, { hardware_status: 'offline' });
      setActiveSessionId(null);
      resetPauseStats();
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('mqtt:own-state', { status: 'offline' });
      }
    },
  );

  ipcMain.handle('update-focus-state', (_e, state: string) => {
    const userId = getOverlayUserId();
    if (!userId) return;
    return updateProfile(userId, {
      focus_state: state as 'productive' | 'distracted' | 'idle' | 'offline',
    });
  });

  ipcMain.handle('take-screenshot', async () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } });
    return sources[0]?.thumbnail.toDataURL() ?? null;
  });

  ipcMain.handle('take-thumbnail', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 960, height: 540 } });
    return sources[0]?.thumbnail.toDataURL() ?? null;
  });

  ipcMain.handle('classify-screen', async (_e, { imageDataUrl, endpoint, model }: { imageDataUrl: string; endpoint?: string; model?: string }) => {
    const base64 = imageDataUrl.split(',')[1];
    const prompt = [
      'Classify this screen for a focus timer.',
      'Use context, not just app names.',
      'Return exactly one label:',
      'deep_work = coding, writing, design, studying, technical reading',
      'admin = calendar, email, settings, planning, short operational work',
      'distracted = entertainment, shopping, social feeds, games, memes, unrelated browsing',
    ].join('\n');
    const ep = endpoint ?? (import.meta.env.LOCAL_VLM_URL as string) ?? 'http://127.0.0.1:11434/api/chat';
    const m  = model    ?? (import.meta.env.LOCAL_VLM_MODEL as string) ?? 'moondream';
    const resp = await fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: m, stream: false, messages: [{ role: 'user', content: prompt, images: [base64] }] }),
    });
    if (!resp.ok) throw new Error(`Local classifier ${resp.status}`);
    const data = await resp.json() as { message?: { content?: string }; response?: string };
    const text = String(data.message?.content ?? data.response ?? '').toLowerCase().trim();
    if (text.includes('distracted') || text.includes('distraction')) return 'distracted';
    if (text.includes('admin')) return 'admin';
    if (text.includes('deep') || text.includes('productive')) return 'deep_work';
    return 'distracted';
  });
}

function getOverlayUserId(): string {
  try {
    const filePath = nodePath.join(os.tmpdir(), 'cohort-user.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { userId?: string };
    return data.userId ?? '';
  } catch {
    return '';
  }
}

function openAuthWindow(url: string, parent: BrowserWindow | null): Promise<string> {
  return new Promise((resolve, reject) => {
    const authWin = new BrowserWindow({
      width: 520,
      height: 720,
      parent: parent ?? undefined,
      modal: Boolean(parent),
      show: false,
      autoHideMenuBar: true,
      backgroundColor: '#08090f',
      titleBarStyle: 'hidden',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    let settled = false;

    const finish = (callbackUrl: string) => {
      if (settled) return;
      settled = true;
      resolve(callbackUrl);
      if (!authWin.isDestroyed()) authWin.close();
    };

    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error('Google sign in was closed before it finished.'));
    };

    const maybeFinish = (nextUrl: string) => {
      if (!nextUrl.startsWith('cohort://')) return false;
      finish(nextUrl);
      return true;
    };

    authWin.once('ready-to-show', () => authWin.show());
    authWin.once('closed', fail);

    authWin.webContents.on('will-navigate', (navEvent, nextUrl) => {
      if (maybeFinish(nextUrl)) navEvent.preventDefault();
    });

    authWin.webContents.on('will-redirect', (navEvent, nextUrl) => {
      if (maybeFinish(nextUrl)) navEvent.preventDefault();
    });

    authWin.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
      if (maybeFinish(nextUrl)) return { action: 'deny' };
      return { action: 'allow' };
    });

    authWin.loadURL(url).catch((err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
      if (!authWin.isDestroyed()) authWin.close();
    });
  });
}
