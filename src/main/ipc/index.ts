import { BrowserWindow, desktopCapturer, ipcMain, powerMonitor, screen, shell } from 'electron';
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
  removeFriend,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  getCohorts,
  createCohort,
  joinCohort,
  leaveCohort,
  getSharedCohortProfiles,
  getCohortMembers,
  startSession,
  endSession,
  getSessionHistory,
  logActivity,
  getSessionActivityLogs,
} from "../supabase";
import { queryAgent, type AgentRequest } from "../agent";
import {
  initMqtt,
  publishCommand,
  subscribeFriends,
  getPauseStats,
  setActiveSessionId,
  setActiveSessionDetails,
  getActiveSessionId,
  getActiveSessionSnapshot,
  simulateHardwareEvent,
  resetPauseStats,
  resumePause,
  markPaused,
} from '../mqtt';
import {
  calculateFlowScore,
  finishSessionMetrics,
  recordFocusState,
  startSessionMetrics,
} from '../session_metrics';

let activePlannedDurationMinutes = 50;

type IpcHandlerOptions = {
  onResumeSession?: () => void;
};

export function registerIpcHandlers(options: IpcHandlerOptions = {}): void {
  ipcMain.handle(CH.PING, () => "pong");

  // Profiles
  ipcMain.handle(CH.PROFILE_GET, (_e, userId: string) => getProfile(userId));
  ipcMain.handle(CH.PROFILE_UPDATE, (_e, userId, updates) =>
    updateProfile(userId, updates),
  );

  // Friends
  ipcMain.handle(CH.FRIENDS_LIST, (_e, userId: string) =>
    getFriendsWithProfiles(userId),
  );
  ipcMain.handle(CH.PROFILE_SEARCH, (_e, username: string) =>
    searchProfileByUsername(username),
  );
  ipcMain.handle(CH.FRIEND_ADD, (_e, userId, friendId) =>
    addFriend(userId, friendId),
  );
  ipcMain.handle(CH.FRIEND_REQUESTS_LIST, (_e, userId: string) =>
    getFriendRequests(userId),
  );
  ipcMain.handle(CH.FRIEND_REQUEST_SEND, (_e, a, b) =>
    sendFriendRequest(a, b),
  );
  ipcMain.handle(CH.FRIEND_REQUEST_ACCEPT, (_e, userId, requestId) =>
    acceptFriendRequest(userId, requestId),
  );
  ipcMain.handle(CH.FRIEND_REMOVE, (_e, userId, friendId) =>
    removeFriend(userId, friendId),
  );

  ipcMain.handle(CH.FRIEND_NUDGE_SEND, (_e, fromUserId, toUserId, fromName) => {
    const payload = {
      fromUserId,
      toUserId,
      fromName,
      sentAt: new Date().toISOString(),
    };
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(PUSH.FRIEND_NUDGE, payload);
    }
  });

  // Cohorts
  ipcMain.handle(CH.COHORTS_LIST, (_e, userId) => getCohorts(userId));
  ipcMain.handle(CH.COHORT_CREATE, (_e, userId, name) =>
    createCohort(userId, name),
  );
  ipcMain.handle(CH.COHORT_JOIN, (_e, userId, inviteCode) =>
    joinCohort(userId, inviteCode),
  );
  ipcMain.handle(CH.COHORT_SHARED_PROFILES, (_e, userId) =>
    getSharedCohortProfiles(userId),
  );
  ipcMain.handle(CH.COHORT_MEMBERS, (_e, cohortId) =>
    getCohortMembers(cohortId),
  );
  ipcMain.handle(CH.COHORT_LEAVE, (_e, userId, cohortId) =>
    leaveCohort(userId, cohortId),
  );

  // Pause session
  ipcMain.handle("pause-session", () => {
    const pausedAt = new Date().toISOString();
    void markPaused(pausedAt);

    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(PUSH.SESSION_PAUSED, { pausedAt });
    }
  });

  // Resume session
  ipcMain.handle(CH.SESSION_RESUME, async () => {
    const result = await resumePause({ openOverlay: false });
    options.onResumeSession?.();
    return result;
  });

  // Sessions
  ipcMain.handle(
    CH.SESSION_START,
    async (_e, userId: string, workflowGroup: string, durationMins: number) => {
      activePlannedDurationMinutes = durationMins;
      const session = await startSession(userId, workflowGroup, durationMins);
      if (session) {
        setActiveSessionId(session.id);
        setActiveSessionDetails({
          sessionStartedAt: session.started_at,
          workflowGroup,
          plannedDurationMinutes: durationMins,
        });
        startSessionMetrics(session.id, session.started_at);
      }
      return session;
    },
  );
  ipcMain.handle(CH.SESSION_END, async (_e, pauseMinutes: number, flowScore: number, aiSummary: string) => {
    const sessionId = getActiveSessionId();
    if (!sessionId) return;
    const metrics = finishSessionMetrics(sessionId);
    await endSession(sessionId, pauseMinutes, metrics ? calculateFlowScore(metrics) : flowScore, aiSummary, undefined, metrics ?? undefined);
    setActiveSessionId(null);
  });

  ipcMain.handle(CH.SESSION_HISTORY, (_e, userId) =>
    getSessionHistory(userId),
  );

  // Agent
  ipcMain.handle(CH.AGENT_QUERY, async (_e, request: AgentRequest) => {
    try {
      return await queryAgent(request);
    } catch (e) {
      return { text: "agent unavailable", error: String(e) };
    }
  });

  // Activity logs
  ipcMain.handle(CH.ACTIVITY_LOG, (_e, sid, uid, type, detail) =>
    logActivity(sid, uid, type, detail),
  );

  ipcMain.handle(CH.ACTIVITY_LOGS_GET, (_e, sessionId) =>
    getSessionActivityLogs(sessionId),
  );

  // MQTT
  ipcMain.handle(CH.MQTT_INIT, (_e, userId) => initMqtt(userId));
  ipcMain.handle(CH.MQTT_PUBLISH_COMMAND, (_e, userId, cmd) =>
    publishCommand(userId, cmd),
  );
  ipcMain.handle(CH.MQTT_SUBSCRIBE_FRIENDS, (_e, ids) =>
    subscribeFriends(ids),
  );
  ipcMain.handle(CH.MQTT_PAUSE_STATS, () => getPauseStats());

  // Hardware simulation
  ipcMain.handle(CH.HW_SIMULATE, (_e, userId, payload) =>
    simulateHardwareEvent(userId, payload),
  );

  // Session storage
  ipcMain.handle(CH.SAVE_USER_SESSION, (_e, userId, email) => {
    const filePath = nodePath.join(os.tmpdir(), "cohort-user.json");
    fs.writeFileSync(
      filePath,
      JSON.stringify({ userId, email, savedAt: new Date().toISOString() }),
    );
  });

  // External links (still allowed)
  ipcMain.handle(CH.OPEN_EXTERNAL, (_e, url) => shell.openExternal(url));

  // AUTH WINDOW (stays inside Electron)
  ipcMain.handle(CH.OPEN_AUTH_WINDOW, (event, url) =>
    openAuthWindow(url, BrowserWindow.fromWebContents(event.sender)),
  );

  // Overlay
  ipcMain.on('set-ignore-mouse-events', (event, ignore: boolean) => {
    BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, { forward: true });
  });

  // Config
  ipcMain.handle('get-config', () => {
    const snapshot = getActiveSessionSnapshot();
    return {
      SESSION_STARTED_AT: snapshot.sessionStartedAt ?? '',
      TOTAL_PAUSE_MS: snapshot.totalPauseMs,
      ACTIVE_WORKFLOW_GROUP: snapshot.workflowGroup ?? '',

      GEMINI_API_KEY: (import.meta.env.GEMINI_API_KEY as string) ?? '',
      LOCAL_VLM_URL: (import.meta.env.LOCAL_VLM_URL as string) ?? 'http://127.0.0.1:11434/api/chat',
      LOCAL_VLM_MODEL: (import.meta.env.LOCAL_VLM_MODEL as string) ?? 'moondream',
      SUPABASE_URL: (import.meta.env.SUPABASE_URL as string) ?? '',
      SUPABASE_ANON_KEY: (import.meta.env.SUPABASE_ANON_KEY as string) ?? '',

      USER_ID: getOverlayUserId(),
      SESSION_ID: getActiveSessionId() ?? '',
      PLANNED_DURATION_MINUTES: snapshot.plannedDurationMinutes ?? activePlannedDurationMinutes,
    };
  });

  // create-session
  ipcMain.handle('create-session', async (_e, { plannedDurationMinutes, workflowGroup }: { plannedDurationMinutes?: number; workflowGroup: string }) => {
    const userId = getOverlayUserId();
    if (!userId) return null;

    const duration = plannedDurationMinutes ?? 60;
    activePlannedDurationMinutes = duration;

    const session = await startSession(userId, workflowGroup, duration);

    if (session) {
      setActiveSessionId(session.id);
      setActiveSessionDetails({
        sessionStartedAt: session.started_at,
        workflowGroup,
        plannedDurationMinutes: duration,
      });
      startSessionMetrics(session.id, session.started_at);
    }

    return session?.id ?? null;
  });

  ipcMain.handle('end-session', async (_e, { sessionId, flowScore, conversationHistory }: { sessionId: string; flowScore: number | null; conversationHistory: unknown[] }) => {
    if (!sessionId) return;
    const userId = getOverlayUserId();
    const metrics = finishSessionMetrics(sessionId);
    await endSession(
      sessionId,
      0,
      metrics ? calculateFlowScore(metrics) : flowScore ?? 0,
      '',
      conversationHistory,
      metrics ?? undefined,
    );
    if (userId) await updateProfile(userId, { hardware_status: 'offline' });
    setActiveSessionId(null);
    resetPauseStats();
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('mqtt:own-state', { status: 'offline' });
    }
  });

  ipcMain.handle('get-system-idle-secs', () => powerMonitor.getSystemIdleTime());

  ipcMain.handle('overlay-pause', async () => {
    const userId = getOverlayUserId();
    if (!userId) return;
    await simulateHardwareEvent(userId, { status: 'undocked' });
  });

  ipcMain.handle('update-focus-state', (_e, state: string) => {
    const userId = getOverlayUserId();
    if (!userId) return;
    recordFocusState(state);
    return updateProfile(userId, {
      focus_state: state as 'productive' | 'distracted' | 'idle' | 'offline',
    });
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

    const resolvedEndpoint = endpoint || (import.meta.env.LOCAL_VLM_URL as string) || 'http://127.0.0.1:11434/api/chat';
    const resolvedModel = model || (import.meta.env.LOCAL_VLM_MODEL as string) || 'moondream';

    const resp = await fetch(resolvedEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: resolvedModel,
        stream: false,
        messages: [{ role: 'user', content: prompt, images: [base64] }],
      }),
    });

    if (!resp.ok) throw new Error(`Local classifier ${resp.status}`);

    const data = (await resp.json()) as { message?: { content?: string }; response?: string };
    const text = String(data.message?.content ?? data.response ?? '').toLowerCase().trim();
    if (text.includes('distracted') || text.includes('distraction')) return 'distracted';
    if (text.includes('admin')) return 'admin';
    if (text.includes('deep')) return 'deep_work';
    if (text.includes('productive')) return 'deep_work';
    return 'distracted';
  });
}

/**
 * ✅ AUTH FIX: IN-ELECTRON WINDOW (no external browser)
 */
let authResolver: ((url: string) => void) | null = null;

function openAuthWindow(
  url: string,
  parent: BrowserWindow | null,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const authWin = new BrowserWindow({
      width: 520,
      height: 720,
      parent: parent ?? undefined,
      modal: Boolean(parent),
      show: false,
      autoHideMenuBar: true,
      backgroundColor: "#08090f",
      titleBarStyle: "hidden",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
    });

    let done = false;

    const finish = (url: string) => {
      if (done) return;
      done = true;
      resolve(url);
      authWin.close();
    };

    const fail = () => {
      if (done) return;
      done = true;
      reject(new Error("Auth window closed"));
    };

    const handle = (next: string) => {
      if (!next.startsWith("cohort://")) return false;
      finish(next);
      return true;
    };

    authWin.once("ready-to-show", () => authWin.show());
    authWin.once("closed", fail);

    authWin.webContents.on("will-navigate", (e, url) => {
      if (handle(url)) e.preventDefault();
    });

    authWin.webContents.on("will-redirect", (e, url) => {
      if (handle(url)) e.preventDefault();
    });

    authWin.loadURL(url).catch(fail);
  });
}

export function resolveAuthCallback(url: string) {
  if (authResolver) {
    authResolver(url);
    authResolver = null;
  }
}

function getOverlayUserId(): string {
  try {
    const filePath = nodePath.join(os.tmpdir(), "cohort-user.json");
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return data.userId ?? "";
  } catch {
    return "";
  }
}