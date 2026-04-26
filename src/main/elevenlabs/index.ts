import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { getProfile } from '../supabase';

export type ElevenLabsMode = 'hardware' | 'elevenlabs';

export interface ElevenLabsSettings {
  mode: ElevenLabsMode;
  apiKey: string;
  voiceId: string;
}

export type VoiceEvent =
  | 'session_start'
  | 'session_end'
  | 'phone_lift'
  | 'phone_redock'
  | 'cohort_member_join'
  | 'cohort_member_leave'
  | 'idle'
  | 'distracted';

const DEFAULT_SETTINGS: ElevenLabsSettings = {
  mode: 'hardware',
  apiKey: '',
  voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam
};

// Cooldown: don't repeat the same event within 60 seconds
const EVENT_COOLDOWN_MS = 60_000;
const lastEventTimes = new Map<VoiceEvent, number>();

// Current user context set at login
let currentUsername = '';

export function setCurrentUsername(username: string): void {
  currentUsername = username;
}

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'elevenlabs-settings.json');
}

export function getElevenLabsSettings(): ElevenLabsSettings {
  try {
    const raw = readFileSync(getSettingsPath(), 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) as Partial<ElevenLabsSettings> };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveElevenLabsSettings(settings: ElevenLabsSettings): void {
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}

function buildMessage(
  event: VoiceEvent,
  ctx: { username?: string; workflowGroup?: string; memberName?: string },
): string {
  const name = ctx.username ?? currentUsername ?? 'hey';
  const member = ctx.memberName ?? 'a cohort member';
  const task = ctx.workflowGroup;

  switch (event) {
    case 'session_start':
      return task
        ? `${name}, starting ${task}. Let's get in the zone.`
        : `${name}, your session is starting. Time to focus.`;
    case 'session_end':
      return `Session complete. Great work, ${name}.`;
    case 'phone_lift':
      return `${name}, you picked up your phone.`;
    case 'phone_redock':
      return `Phone docked. Back in focus, ${name}.`;
    case 'cohort_member_join':
      return `${member} joined the session.`;
    case 'cohort_member_leave':
      return `${member} left the session.`;
    case 'idle':
      return `${name}, looks like you went idle. Stay on track.`;
    case 'distracted':
      return `${name}, you seem distracted. Refocus.`;
  }
}

async function generateSpeech(text: string, settings: ElevenLabsSettings): Promise<{ buffer: Buffer } | { error: string }> {
  if (!settings.apiKey || !settings.voiceId) return { error: 'missing api key or voice id' };

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'xi-api-key': settings.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error('[ElevenLabs] API error:', res.status, body);
      try {
        const parsed = JSON.parse(body) as { detail?: { message?: string; code?: string } };
        const msg = parsed.detail?.message ?? body;
        return { error: msg };
      } catch {
        return { error: `API error ${res.status}` };
      }
    }

    return { buffer: Buffer.from(await res.arrayBuffer()) };
  } catch (err) {
    console.error('[ElevenLabs] fetch error:', err);
    return { error: String(err) };
  }
}

function broadcastAudio(buffer: Buffer): void {
  const base64 = buffer.toString('base64');
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('elevenlabs:play-audio', base64);
  }
}

export async function triggerVoiceEvent(
  event: VoiceEvent,
  ctx: { workflowGroup?: string; memberName?: string; memberUserId?: string } = {},
): Promise<void> {
  const settings = getElevenLabsSettings();
  if (settings.mode !== 'elevenlabs' || !settings.apiKey) return;

  // Enforce cooldown for noisy events
  const now = Date.now();
  const last = lastEventTimes.get(event) ?? 0;
  if (now - last < EVENT_COOLDOWN_MS) return;
  lastEventTimes.set(event, now);

  // Resolve member name from userId if needed
  let memberName = ctx.memberName;
  if (ctx.memberUserId && !memberName) {
    try {
      const profile = await getProfile(ctx.memberUserId);
      if (profile) memberName = profile.username;
    } catch {
      // fall through with undefined
    }
  }

  const text = buildMessage(event, { username: currentUsername, workflowGroup: ctx.workflowGroup, memberName });
  const result = await generateSpeech(text, settings);
  if ('buffer' in result) broadcastAudio(result.buffer);
  else console.error('[ElevenLabs] voice event failed:', result.error);
}

export async function testVoice(settingsOverride?: Partial<ElevenLabsSettings>, text?: string): Promise<boolean> {
  const settings = { ...getElevenLabsSettings(), ...settingsOverride };
  if (!settings.apiKey || !settings.voiceId) return false;
  const result = await generateSpeech(
    text ?? `Hey ${currentUsername || 'there'}, Cohort voice is ready. Focus mode activated.`,
    settings,
  );
  if ('buffer' in result) {
    broadcastAudio(result.buffer);
    return true;
  }
  return false;
}
