import { contextBridge, ipcRenderer } from 'electron';
import { CH, PUSH } from '../main/ipc/channels';

const api = {
  // Profiles
  getProfile: (userId: string) => ipcRenderer.invoke(CH.PROFILE_GET, userId),
  updateProfile: (userId: string, updates: Record<string, unknown>) =>
    ipcRenderer.invoke(CH.PROFILE_UPDATE, userId, updates),

  // Friends
  getFriends: (userId: string) => ipcRenderer.invoke(CH.FRIENDS_LIST, userId),
  searchProfile: (username: string) => ipcRenderer.invoke(CH.PROFILE_SEARCH, username),
  addFriend: (userId: string, friendId: string) => ipcRenderer.invoke(CH.FRIEND_ADD, userId, friendId),
  getFriendRequests: (userId: string) => ipcRenderer.invoke(CH.FRIEND_REQUESTS_LIST, userId),
  sendFriendRequest: (requesterId: string, receiverId: string) =>
    ipcRenderer.invoke(CH.FRIEND_REQUEST_SEND, requesterId, receiverId),
  acceptFriendRequest: (userId: string, requestId: string) =>
    ipcRenderer.invoke(CH.FRIEND_REQUEST_ACCEPT, userId, requestId),
  removeFriend: (userId: string, friendId: string) =>
    ipcRenderer.invoke(CH.FRIEND_REMOVE, userId, friendId),
  sendFriendNudge: (fromUserId: string, toUserId: string, fromName: string) =>
    ipcRenderer.invoke(CH.FRIEND_NUDGE_SEND, fromUserId, toUserId, fromName),

  // Cohorts
  getCohorts: (userId: string) => ipcRenderer.invoke(CH.COHORTS_LIST, userId),
  createCohort: (userId: string, name: string) => ipcRenderer.invoke(CH.COHORT_CREATE, userId, name),
  joinCohort: (userId: string, inviteCode: string) => ipcRenderer.invoke(CH.COHORT_JOIN, userId, inviteCode),
  getSharedCohortProfiles: (userId: string) => ipcRenderer.invoke(CH.COHORT_SHARED_PROFILES, userId),
  getCohortMembers: (cohortId: string) => ipcRenderer.invoke(CH.COHORT_MEMBERS, cohortId),
  leaveCohort: (userId: string, cohortId: string) => ipcRenderer.invoke(CH.COHORT_LEAVE, userId, cohortId),

  // Sessions
  startSession: (userId: string, workflowGroup: string, durationMins: number) =>
    ipcRenderer.invoke(CH.SESSION_START, userId, workflowGroup, durationMins),
  endSession: (pauseMinutes: number, flowScore: number, aiSummary: string) =>
    ipcRenderer.invoke(CH.SESSION_END, pauseMinutes, flowScore, aiSummary),
  resumeSession: () => ipcRenderer.invoke(CH.SESSION_RESUME),
  getSessionHistory: (userId: string) => ipcRenderer.invoke(CH.SESSION_HISTORY, userId),
  queryAgent: (request: {
    intent: 'dashboard_insight' | 'session_postmortem' | 'chat';
    userId?: string | null;
    context?: Record<string, unknown>;
    message?: string;
  }) => ipcRenderer.invoke(CH.AGENT_QUERY, request),

  // Activity logs
  logActivity: (sessionId: string, userId: string, eventType: string, eventDetail: Record<string, unknown>) =>
    ipcRenderer.invoke(CH.ACTIVITY_LOG, sessionId, userId, eventType, eventDetail),
  getActivityLogs: (sessionId: string) => ipcRenderer.invoke(CH.ACTIVITY_LOGS_GET, sessionId),

  // MQTT
  initMqtt: (userId: string) => ipcRenderer.invoke(CH.MQTT_INIT, userId),
  publishCommand: (userId: string, command: Record<string, unknown>) =>
    ipcRenderer.invoke(CH.MQTT_PUBLISH_COMMAND, userId, command),
  subscribeFriends: (friendIds: string[]) => ipcRenderer.invoke(CH.MQTT_SUBSCRIBE_FRIENDS, friendIds),
  getPauseStats: () => ipcRenderer.invoke(CH.MQTT_PAUSE_STATS),

  // Push listeners
  onMqttConnected: (cb: (data: unknown) => void) => {
    const h = (_e: Electron.IpcRendererEvent, data: unknown) => cb(data);
    ipcRenderer.on(PUSH.MQTT_CONNECTED, h);
    return () => ipcRenderer.off(PUSH.MQTT_CONNECTED, h);
  },
  onOwnState: (cb: (data: unknown) => void) => {
    const h = (_e: Electron.IpcRendererEvent, data: unknown) => cb(data);
    ipcRenderer.on(PUSH.MQTT_OWN_STATE, h);
    return () => ipcRenderer.off(PUSH.MQTT_OWN_STATE, h);
  },
  onFriendState: (cb: (data: unknown) => void) => {
    const h = (_e: Electron.IpcRendererEvent, data: unknown) => cb(data);
    ipcRenderer.on(PUSH.MQTT_FRIEND_STATE, h);
    return () => ipcRenderer.off(PUSH.MQTT_FRIEND_STATE, h);
  },
  onFriendNudge: (cb: (data: unknown) => void) => {
    const h = (_e: Electron.IpcRendererEvent, data: unknown) => cb(data);
    ipcRenderer.on(PUSH.FRIEND_NUDGE, h);
    return () => ipcRenderer.off(PUSH.FRIEND_NUDGE, h);
  },

  // Persist userId to shared file so overlay_standalone can read it
  saveUserSession: (userId: string, email: string): Promise<void> =>
    ipcRenderer.invoke(CH.SAVE_USER_SESSION, userId, email),

  // Open URL in the system browser
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(CH.OPEN_EXTERNAL, url),
  openAuthWindow: (url: string): Promise<string> =>
    ipcRenderer.invoke(CH.OPEN_AUTH_WINDOW, url),

  // Hardware simulator (dev only)
  // Hardware simulator
  simulateHardware: (userId: string, payload: Record<string, unknown>) =>
    ipcRenderer.invoke(CH.HW_SIMULATE, userId, payload),

  onSessionPaused: (cb: (data: unknown) => void) => {
    const h = (_e: Electron.IpcRendererEvent, data: unknown) => cb(data);
    ipcRenderer.on(PUSH.SESSION_PAUSED, h);
    return () => ipcRenderer.off(PUSH.SESSION_PAUSED, h);
  },

  // Deep link
  onDeepLink: (cb: (url: string) => void) => {
    const h = (_e: Electron.IpcRendererEvent, url: unknown) => cb(url as string);
    ipcRenderer.on(PUSH.DEEP_LINK, h);
    return () => ipcRenderer.off(PUSH.DEEP_LINK, h);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
