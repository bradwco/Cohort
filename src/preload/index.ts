import { contextBridge, ipcRenderer } from 'electron';
import { CH, PUSH } from '../main/ipc/channels';

const api = {
  // Profiles
  getProfile: (userId: string) => ipcRenderer.invoke(CH.PROFILE_GET, userId),
  updateProfile: (userId: string, updates: Record<string, unknown>) =>
    ipcRenderer.invoke(CH.PROFILE_UPDATE, userId, updates),

  // Friends
  getFriends: (userId: string) => ipcRenderer.invoke(CH.FRIENDS_LIST, userId),

  // Sessions
  startSession: (userId: string, workflowGroup: string, durationMins: number) =>
    ipcRenderer.invoke(CH.SESSION_START, userId, workflowGroup, durationMins),
  endSession: (pauseMinutes: number, flowScore: number, aiSummary: string) =>
    ipcRenderer.invoke(CH.SESSION_END, pauseMinutes, flowScore, aiSummary),
  getSessionHistory: (userId: string) => ipcRenderer.invoke(CH.SESSION_HISTORY, userId),

  // Activity logs
  logActivity: (sessionId: string, userId: string, eventType: string, eventDetail: Record<string, unknown>) =>
    ipcRenderer.invoke(CH.ACTIVITY_LOG, sessionId, userId, eventType, eventDetail),
  getActivityLogs: (sessionId: string) => ipcRenderer.invoke(CH.ACTIVITY_LOGS_GET, sessionId),

  // MQTT
  initMqtt: (userId: string) => ipcRenderer.invoke(CH.MQTT_INIT, userId),
  publishCommand: (userId: string, command: Record<string, unknown>) =>
    ipcRenderer.invoke(CH.MQTT_PUBLISH_COMMAND, userId, command),
  subscribeFriends: (friendIds: string[]) =>
    ipcRenderer.invoke(CH.MQTT_SUBSCRIBE_FRIENDS, friendIds),
  getPauseStats: () => ipcRenderer.invoke(CH.MQTT_PAUSE_STATS),

  // Push listeners (hardware → renderer)
  onMqttConnected: (cb: (data: unknown) => void) =>
    ipcRenderer.on(PUSH.MQTT_CONNECTED, (_e, data) => cb(data)),
  onOwnState: (cb: (data: unknown) => void) =>
    ipcRenderer.on(PUSH.MQTT_OWN_STATE, (_e, data) => cb(data)),
  onFriendState: (cb: (data: unknown) => void) =>
    ipcRenderer.on(PUSH.MQTT_FRIEND_STATE, (_e, data) => cb(data)),

  // Hardware simulator (dev only)
  simulateHardware: (userId: string, payload: Record<string, unknown>) =>
    ipcRenderer.invoke(CH.HW_SIMULATE, userId, payload),

  // Cleanup
  offOwnState: (cb: (data: unknown) => void) =>
    ipcRenderer.off(PUSH.MQTT_OWN_STATE, cb as never),
  offFriendState: (cb: (data: unknown) => void) =>
    ipcRenderer.off(PUSH.MQTT_FRIEND_STATE, cb as never),
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
