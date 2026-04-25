import { ipcMain } from 'electron';
import { CH } from './channels';
import {
  getProfile,
  updateProfile,
  getFriendsWithProfiles,
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
} from '../mqtt';

export function registerIpcHandlers(): void {
  ipcMain.handle(CH.PING, () => 'pong');

  // --- Profiles ---
  ipcMain.handle(CH.PROFILE_GET, (_e, userId: string) => getProfile(userId));

  ipcMain.handle(CH.PROFILE_UPDATE, (_e, userId: string, updates: Parameters<typeof updateProfile>[1]) =>
    updateProfile(userId, updates),
  );

  // --- Friends ---
  ipcMain.handle(CH.FRIENDS_LIST, (_e, userId: string) => getFriendsWithProfiles(userId));

  // --- Sessions ---
  ipcMain.handle(
    CH.SESSION_START,
    async (_e, userId: string, workflowGroup: string, durationMins: number) => {
      const session = await startSession(userId, workflowGroup, durationMins);
      if (session) setActiveSessionId(session.id);
      return session;
    },
  );

  ipcMain.handle(
    CH.SESSION_END,
    async (_e, pauseMinutes: number, flowScore: number, aiSummary: string) => {
      const sessionId = getActiveSessionId();
      if (!sessionId) return;
      await endSession(sessionId, pauseMinutes, flowScore, aiSummary);
      setActiveSessionId(null);
    },
  );

  ipcMain.handle(CH.SESSION_HISTORY, (_e, userId: string) => getSessionHistory(userId));

  // --- Activity logs ---
  ipcMain.handle(
    CH.ACTIVITY_LOG,
    (_e, sessionId: string, userId: string, eventType: Parameters<typeof logActivity>[2], eventDetail: Record<string, unknown>) =>
      logActivity(sessionId, userId, eventType, eventDetail),
  );

  ipcMain.handle(CH.ACTIVITY_LOGS_GET, (_e, sessionId: string) =>
    getSessionActivityLogs(sessionId),
  );

  // --- MQTT ---
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

  // --- Hardware simulator ---
  ipcMain.handle(CH.HW_SIMULATE, (_e, userId: string, payload: Record<string, unknown>) =>
    simulateHardwareEvent(userId, payload),
  );
}
