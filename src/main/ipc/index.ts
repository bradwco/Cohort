import {
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  screen,
  shell,
} from "electron";
import * as fs from "fs";
import * as nodePath from "path";
import * as os from "os";
import { CH, PUSH } from "./channels";
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
} from "../mqtt";

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
  ipcMain.handle(CH.SESSION_START, async (_e, userId, group, mins) => {
    activePlannedDurationMinutes = mins;

    const session = await startSession(userId, group, mins);

    if (session) {
      setActiveSessionId(session.id);
      setActiveSessionDetails({
        sessionStartedAt: session.started_at,
        workflowGroup: group,
        plannedDurationMinutes: mins,
      });
    }

    return session;
  });

  ipcMain.handle(CH.SESSION_END, async (_e, pause, score, summary) => {
    const sessionId = getActiveSessionId();
    if (!sessionId) return;

    await endSession(sessionId, pause, score, summary);
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

  // AUTH WINDOW (FIXED: stays inside Electron)
  ipcMain.handle(CH.OPEN_AUTH_WINDOW, (event, url) =>
    openAuthWindow(url, BrowserWindow.fromWebContents(event.sender)),
  );

  // Overlay
  ipcMain.on("set-ignore-mouse-events", (event, ignore) => {
    BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, {
      forward: true,
    });
  });

  // Config
  ipcMain.handle("get-config", () => {
    const snapshot = getActiveSessionSnapshot();

    return {
      SESSION_STARTED_AT: snapshot.sessionStartedAt ?? "",
      TOTAL_PAUSE_MS: snapshot.totalPauseMs,
      ACTIVE_WORKFLOW_GROUP: snapshot.workflowGroup ?? "",

      GEMINI_API_KEY: import.meta.env.GEMINI_API_KEY ?? "",
      LOCAL_VLM_URL:
        import.meta.env.LOCAL_VLM_URL ?? "http://127.0.0.1:11434/api/chat",
      LOCAL_VLM_MODEL: import.meta.env.LOCAL_VLM_MODEL ?? "moondream",
      SUPABASE_URL: import.meta.env.SUPABASE_URL ?? "",
      SUPABASE_ANON_KEY: import.meta.env.SUPABASE_ANON_KEY ?? "",

      USER_ID: getOverlayUserId(),
      SESSION_ID: getActiveSessionId() ?? "",
      PLANNED_DURATION_MINUTES:
        snapshot.plannedDurationMinutes ?? activePlannedDurationMinutes,
    };
  });

  // create-session
  ipcMain.handle("create-session", async (_e, { plannedDurationMinutes, workflowGroup }) => {
    const userId = getOverlayUserId();
    if (!userId) return null;

    activePlannedDurationMinutes = plannedDurationMinutes;

    const session = await startSession(userId, workflowGroup, plannedDurationMinutes);

    if (session) {
      setActiveSessionId(session.id);
      setActiveSessionDetails({
        sessionStartedAt: session.started_at,
        workflowGroup,
        plannedDurationMinutes,
      });
    }

    return session?.id ?? null;
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