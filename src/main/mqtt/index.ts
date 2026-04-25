import mqtt, { MqttClient } from 'mqtt';
import { BrowserWindow } from 'electron';
import { updateProfile, startSession, logActivity } from '../supabase';

let client: MqttClient | null = null;
let currentUserId: string | null = null;
let activeSessionId: string | null = null;
let pauseStart: number | null = null;
let totalPauseMs = 0;

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
    console.warn('MQTT_URL not set — skipping MQTT connection');
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
    handleIncoming(topic, payload.toString());
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

// --- Simulate hardware events without a real ESP32 ---

export async function simulateHardwareEvent(
  userId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  currentUserId = userId;
  await handleOwnOrbState(payload);
}

// --- Inbound hardware event handling ---

async function handleIncoming(topic: string, raw: string): Promise<void> {
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); } catch { return; }

  // Own orb state
  if (currentUserId && topic === `focus-orb/${currentUserId}/state`) {
    await handleOwnOrbState(payload);
    return;
  }

  // Friend orb state — forward to renderer
  const friendMatch = topic.match(/^focus-orb\/(.+)\/state$/);
  if (friendMatch) {
    broadcastToRenderer('mqtt:friend-state', { userId: friendMatch[1], ...payload });
  }
}

async function handleOwnOrbState(payload: Record<string, unknown>): Promise<void> {
  const status = payload.status as string | undefined;

  if (status === 'docked') {
    const duration = (payload.duration as number) ?? 60;

    // Start a new session if none active
    if (!activeSessionId && currentUserId) {
      const session = await startSession(currentUserId, 'Focus Session', duration);
      if (session) activeSessionId = session.id;
    }

    await updateProfile(currentUserId!, { hardware_status: 'docked' });
    pauseStart = null;
    broadcastToRenderer('mqtt:own-state', { status: 'docked', sessionId: activeSessionId });
  }

  if (status === 'undocked') {
    // Start pause budget timer
    pauseStart = Date.now();

    if (activeSessionId && currentUserId) {
      await logActivity(activeSessionId, currentUserId, 'hardware_break', { sensor: 'undocked' });
    }

    await updateProfile(currentUserId!, { hardware_status: 'offline' });
    broadcastToRenderer('mqtt:own-state', { status: 'undocked', pauseStart });
  }

  if (status === 'redocked' && pauseStart !== null) {
    totalPauseMs += Date.now() - pauseStart;
    pauseStart = null;
    await updateProfile(currentUserId!, { hardware_status: 'docked' });
    broadcastToRenderer('mqtt:own-state', { status: 'docked', totalPauseMs });
  }
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
