import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { BrowserWindow } from 'electron';
import { PUSH } from '../ipc/channels';
import { simulateHardwareEvent } from '../mqtt';
import { getProfile } from '../supabase';

type SerialMode = 'disconnected' | 'connecting' | 'connected';

let port: SerialPort | null = null;
let activeUserId: string | null = null;
let mode: SerialMode = 'disconnected';
let lastFocusState: string | null = null;
let heartbeatSeen = false;

function env(name: string): string {
  return (import.meta.env[name] as string | undefined) ?? process.env[name] ?? '';
}

export async function initHardwareSerial(userId: string): Promise<void> {
  activeUserId = userId;
  console.log(`[serial] using logged-in user ${userId}`);

  const transport = env('HARDWARE_TRANSPORT').toLowerCase();
  if (transport === 'off' || transport === 'none' || transport === 'sim' || transport === 'simulator') {
    mode = 'disconnected';
    broadcastSerialStatus(false);
    console.log('[serial] disabled by HARDWARE_TRANSPORT');
    return;
  }
  if (transport && transport !== 'serial' && transport !== 'usb') return;
  if (port?.isOpen) {
    void syncHardwareColor(userId);
    return;
  }
  if (mode === 'connecting') return;

  mode = 'connecting';
  const path = await resolvePortPath().catch((err) => {
    console.log('[serial] port scan skipped:', err instanceof Error ? err.message : String(err));
    return null;
  });
  if (!path) {
    console.log('[serial] no hardware serial port found; simulator can still be used');
    mode = 'disconnected';
    heartbeatSeen = false;
    broadcastSerialStatus(false);
    return;
  }

  const baudRate = Number(env('HARDWARE_SERIAL_BAUD') || 9600);

  port = new SerialPort({ path, baudRate, autoOpen: false });

  port.on('error', (err) => {
    console.warn('[serial] error:', err.message);
  });

  port.on('close', () => {
    console.warn('[serial] closed');
    mode = 'disconnected';
    port = null;
    heartbeatSeen = false;
    broadcastSerialStatus(false);
  });

  await new Promise<void>((resolve, reject) => {
    port!.open((err) => {
      if (err) {
        mode = 'disconnected';
        port = null;
        heartbeatSeen = false;
        broadcastSerialStatus(false);
        reject(err);
        return;
      }
      resolve();
    });
  }).catch((err) => {
    console.log('[serial] unavailable; simulator can still be used:', err instanceof Error ? err.message : String(err));
  });

  if (!port?.isOpen) {
    mode = 'disconnected';
    port = null;
    heartbeatSeen = false;
    broadcastSerialStatus(false);
    return;
  }

  port.set({ dtr: false, rts: false }, (err) => {
    if (err) console.warn('[serial] control-line setup failed:', err.message);
  });

  mode = 'connected';
  console.log(`[serial] connected ${path} @ ${baudRate}`);
  void syncHardwareColor(userId);

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
  parser.on('data', (raw: string) => {
    void handleSerialLine(raw);
  });
}

export function destroyHardwareSerial(): void {
  activeUserId = null;
  lastFocusState = null;
  heartbeatSeen = false;
  broadcastSerialStatus(false);
  if (port?.isOpen) port.close();
  port = null;
  mode = 'disconnected';
}

export function sendHardwareSerialCommand(command: string): void {
  if (!port?.isOpen) return;
  port.write(command);
}

async function syncHardwareColor(userId: string): Promise<void> {
  try {
    const profile = await getProfile(userId);
    const color = normalizeHexColor(profile?.orb_color);
    if (!color) return;
    sendHardwareSerialCommand(`C${color}\n`);
    console.log(`[serial] working color #${color}`);
  } catch (err) {
    console.warn('[serial] color sync failed:', err instanceof Error ? err.message : String(err));
  }
}

function normalizeHexColor(value?: string | null): string | null {
  const trimmed = value?.trim().replace(/^#/, '') ?? '';
  return /^[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toUpperCase() : null;
}

export function sendFocusStateToHardwareSerial(state: string): void {
  if (state === lastFocusState) return;

  if (state === 'distracted') sendHardwareSerialCommand('2');
  else if (lastFocusState === 'distracted') sendHardwareSerialCommand('3');

  if (state === 'idle') sendHardwareSerialCommand('5');
  else if (lastFocusState === 'idle') sendHardwareSerialCommand('7');

  lastFocusState = state;
}

async function resolvePortPath(): Promise<string | null> {
  const configured = env('HARDWARE_SERIAL_PORT');
  const ports = await SerialPort.list();
  console.log('[serial] detected ports:', ports.map((p) => `${p.path} ${p.friendlyName ?? p.manufacturer ?? ''}`.trim()).join(', ') || 'none');

  if (configured) {
    const configuredPort = ports.find((p) => p.path.toLowerCase() === configured.toLowerCase());
    if (configuredPort) return configuredPort.path;
    console.log(`[serial] configured port ${configured} is not present; simulator can still be used`);
    return null;
  }

  const usbPorts = ports.filter((p) => {
    const haystack = [
      p.path,
      p.manufacturer,
      p.friendlyName,
      p.vendorId,
      p.productId,
    ].filter(Boolean).join(' ').toLowerCase();

    if (haystack.includes('bthenum') || haystack.includes('bluetooth')) return false;

    return (
      Boolean(p.vendorId && p.productId) ||
      haystack.includes('esp') ||
      haystack.includes('usb') ||
      haystack.includes('uart') ||
      haystack.includes('ch340') ||
      haystack.includes('cp210') ||
      haystack.includes('silicon labs')
    );
  });

  const likelyEsp32 = usbPorts.find((p) => {
    const haystack = [
      p.path,
      p.manufacturer,
      p.friendlyName,
      p.vendorId,
      p.productId,
    ].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes('303a') || haystack.includes('esp') || haystack.includes('cp210') || haystack.includes('ch340');
  });

  return likelyEsp32?.path ?? usbPorts[0]?.path ?? null;
}

async function handleSerialLine(raw: string): Promise<void> {
  const line = raw.trim();
  if (!line) return;

  console.log(`[serial] ${line}`);

  if (line.startsWith('HEARTBEAT:')) {
    if (!heartbeatSeen) {
      heartbeatSeen = true;
      broadcastSerialStatus(true);
    }
    return;
  }

  const jsonStart = line.indexOf('{');
  if (jsonStart < 0 || !activeUserId) return;

  try {
    const payload = JSON.parse(line.slice(jsonStart)) as Record<string, unknown>;
    await simulateHardwareEvent(activeUserId, payload);
    syncStateFromPayload(payload);
  } catch (err) {
    console.warn('[serial] ignored malformed hardware payload:', err instanceof Error ? err.message : String(err));
  }
}

function syncStateFromPayload(payload: Record<string, unknown>): void {
  if (payload.event === 'end_session' || payload.status === 'offline') {
    sendHardwareSerialCommand('O');
    return;
  }

  if (payload.status === 'undocked') {
    sendHardwareSerialCommand('P');
    return;
  }

  if (payload.status === 'docked' || payload.status === 'redocked') {
    sendHardwareSerialCommand('W');
  }
}

function broadcastSerialStatus(connected: boolean): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(PUSH.HARDWARE_SERIAL_STATUS, { connected });
  }
}
