import mqtt, { MqttClient } from 'mqtt';
import { BrowserWindow } from 'electron';
import { updateProfile, startSession, logActivity } from '../supabase';

type OrbPayload = {
  status?: 'docked' | 'undocked' | 'redocked' | 'offline';
  duration?: number;
  workflowGroup?: string;
  totalPauseMs?: number;
  sessionStartedAt?: string;
  plannedDurationMinutes?: number;
  pauseStart?: number;
  origin?: 'desktop-sim' | 'orb';
};

let client: MqttClient | null = null;
let currentUserId: string | null = null;
let activeSessionId: string | null = null;
let pauseStart: number | null = null;
let totalPauseMs = 0;
const simulatedFriendPauses = new Map<string, { pauseStart: number | null; totalPauseMs: number }>();

export function getMqttClient(): MqttClient | null {
  return client;
}

export function getActiveSessionId(): string | null {
  return activeSessionId;
}

export function setActiveSessionId(id: string | null): void {
  activeSessionId = id;
}

export function initMqtt(userId: string): void {
  currentUserId = userId;

  const url = import.meta.env.MQTT_URL as string;
  const username = import.meta.env.MQTT_USER as string;
  const password = import.meta.env.MQTT_PASS as string;

  if (!url) {
    console.warn('MQTT_URL not set - skipping MQTT connection');
    return;
  }

  client = mqtt.connect(url, {
    username,
    password,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  client.on('connect', () => {
    console.log('[MQTT] Connected');
    client!.subscribe(`focus-orb/${userId}/state`);
    broadcastToRenderer('mqtt:connected', { userId });
  });

  client.on('reconnect', () => console.log('[MQTT] Reconnecting...'));
  client.on('error', (err) => console.error('[MQTT] Error:', err.message));

  client.on('message', (topic, payload) => {
    void handleIncoming(topic, payload.toString());
  });
}

export function subscribeFriends(friendIds: string[]): void {
  if (!client?.connected) return;
  for (const id of friendIds) {
    client.subscribe(`focus-orb/${id}/state`);
  }
}

export function publishCommand(userId: string, command: Record<string, unknown>): void {
  if (!client?.connected) return;
  client.publish(`focus-orb/${userId}/command`, JSON.stringify(command));
}

export function destroyMqtt(): void {
  client?.end();
  client = null;
  currentUserId = null;
  activeSessionId = null;
  pauseStart = null;
  totalPauseMs = 0;
}

export async function simulateHardwareEvent(userId: string, payload: Record<string, unknown>): Promise<void> {
  if (currentUserId && userId !== currentUserId) {
    await handleSimulatedFriendState(userId, payload as OrbPayload);
    return;
  }

  currentUserId = userId;
  await handleOwnOrbState(payload as OrbPayload);
}

async function handleIncoming(topic: string, raw: string): Promise<void> {
  let payload: OrbPayload;
  try {
    payload = JSON.parse(raw) as OrbPayload;
  } catch {
    return;
  }

  if (currentUserId && topic === `focus-orb/${currentUserId}/state`) {
    if (payload.origin === 'desktop-sim') return;
    await handleOwnOrbState(payload);
    return;
  }

  const friendMatch = topic.match(/^focus-orb\/(.+)\/state$/);
  if (friendMatch) {
    broadcastToRenderer('mqtt:friend-state', { userId: friendMatch[1], ...payload });
  }
}

async function handleOwnOrbState(payload: OrbPayload): Promise<void> {
  const status = payload.status;

  if (status === 'docked') {
    const duration = payload.plannedDurationMinutes ?? payload.duration ?? 60;
    const workflowGroup = payload.workflowGroup ?? 'Focus Session';
    const sessionStartedAt = payload.sessionStartedAt ?? new Date().toISOString();

    if (!activeSessionId && currentUserId) {
      const session = await startSession(currentUserId, workflowGroup, duration);
      if (session) activeSessionId = session.id;
    }

    await updateProfile(currentUserId!, {
      hardware_status: 'docked',
      current_activity: workflowGroup,
    });
    pauseStart = null;

    const ownPayload = {
      status: 'docked',
      sessionId: activeSessionId,
      duration,
      workflowGroup,
      totalPauseMs: payload.totalPauseMs ?? totalPauseMs,
      sessionStartedAt,
      plannedDurationMinutes: duration,
    };

    broadcastToRenderer('mqtt:own-state', ownPayload);
    publishOwnState({ ...ownPayload, origin: 'desktop-sim' });
    return;
  }

  if (status === 'undocked') {
    pauseStart = payload.pauseStart ?? Date.now();

    if (activeSessionId && currentUserId) {
      await logActivity(activeSessionId, currentUserId, 'hardware_break', { sensor: 'undocked' });
    }

    await updateProfile(currentUserId!, { hardware_status: 'offline' });
    const ownPayload = {
      status: 'undocked',
      pauseStart,
      totalPauseMs,
      sessionStartedAt: payload.sessionStartedAt,
      plannedDurationMinutes: payload.plannedDurationMinutes ?? payload.duration,
      workflowGroup: payload.workflowGroup,
    };
    broadcastToRenderer('mqtt:own-state', ownPayload);
    publishOwnState({ ...ownPayload, origin: 'desktop-sim' });
    return;
  }

  if (status === 'redocked' && pauseStart !== null) {
    totalPauseMs += Date.now() - pauseStart;
    pauseStart = null;
    await updateProfile(currentUserId!, { hardware_status: 'docked' });
    const ownPayload = {
      status: 'docked',
      totalPauseMs,
      sessionId: activeSessionId,
      sessionStartedAt: payload.sessionStartedAt,
      plannedDurationMinutes: payload.plannedDurationMinutes ?? payload.duration,
      workflowGroup: payload.workflowGroup,
    };
    broadcastToRenderer('mqtt:own-state', ownPayload);
    publishOwnState({ ...ownPayload, origin: 'desktop-sim' });
    return;
  }

  if (status === 'offline') {
    pauseStart = null;
    totalPauseMs = 0;
    activeSessionId = null;
    await updateProfile(currentUserId!, { hardware_status: 'offline' });
    const ownPayload = { status: 'offline' };
    broadcastToRenderer('mqtt:own-state', ownPayload);
    publishOwnState({ ...ownPayload, origin: 'desktop-sim' });
  }
}

async function handleSimulatedFriendState(userId: string, payload: OrbPayload): Promise<void> {
  const status = payload.status;
  const existing = simulatedFriendPauses.get(userId) ?? { pauseStart: null, totalPauseMs: 0 };

  if (status === 'docked') {
    const workflowGroup = payload.workflowGroup ?? 'Focus Session';
    const plannedDurationMinutes = payload.plannedDurationMinutes ?? payload.duration ?? 60;
    const sessionStartedAt = payload.sessionStartedAt ?? new Date().toISOString();
    simulatedFriendPauses.set(userId, { pauseStart: null, totalPauseMs: existing.totalPauseMs });
    await updateProfile(userId, {
      hardware_status: 'docked',
      current_activity: workflowGroup,
    });
    broadcastToRenderer('mqtt:friend-state', {
      userId,
      status: 'docked',
      workflowGroup,
      totalPauseMs: existing.totalPauseMs,
      sessionStartedAt,
      plannedDurationMinutes,
    });
    return;
  }

  if (status === 'undocked') {
    const nextPauseStart = payload.pauseStart ?? Date.now();
    simulatedFriendPauses.set(userId, { ...existing, pauseStart: nextPauseStart });
    await updateProfile(userId, { hardware_status: 'offline' });
    broadcastToRenderer('mqtt:friend-state', {
      userId,
      status: 'undocked',
      pauseStart: nextPauseStart,
      totalPauseMs: existing.totalPauseMs,
      sessionStartedAt: payload.sessionStartedAt,
      plannedDurationMinutes: payload.plannedDurationMinutes ?? payload.duration,
      workflowGroup: payload.workflowGroup,
    });
    return;
  }

  if (status === 'redocked') {
    const total =
      existing.pauseStart != null ? existing.totalPauseMs + (Date.now() - existing.pauseStart) : existing.totalPauseMs;
    simulatedFriendPauses.set(userId, { pauseStart: null, totalPauseMs: total });
    await updateProfile(userId, { hardware_status: 'docked' });
    broadcastToRenderer('mqtt:friend-state', {
      userId,
      status: 'docked',
      totalPauseMs: total,
      sessionStartedAt: payload.sessionStartedAt,
      plannedDurationMinutes: payload.plannedDurationMinutes ?? payload.duration,
      workflowGroup: payload.workflowGroup,
    });
    return;
  }

  if (status === 'offline') {
    simulatedFriendPauses.set(userId, { pauseStart: null, totalPauseMs: 0 });
    await updateProfile(userId, { hardware_status: 'offline' });
    broadcastToRenderer('mqtt:friend-state', { userId, status: 'offline' });
  }
}

function publishOwnState(payload: Record<string, unknown>): void {
  if (!client?.connected || !currentUserId) return;
  client.publish(`focus-orb/${currentUserId}/state`, JSON.stringify(payload), { retain: true });
}

function broadcastToRenderer(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, data);
  }
}

export function getPauseStats(): { pauseStart: number | null; totalPauseMs: number } {
  return { pauseStart, totalPauseMs };
}

export function resetPauseStats(): void {
  pauseStart = null;
  totalPauseMs = 0;
}
