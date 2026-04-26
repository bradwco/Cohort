import { useEffect, useRef, useState } from "react";
import type { OnboardingData } from "../state/onboarding";
import { Section } from "../shared_ui/section";
import { Slider } from "./slider";
import { cn } from "../shared_ui/cn";

type ElevenLabsMode = 'hardware' | 'elevenlabs';
type ElevenLabsSettings = { mode: ElevenLabsMode; apiKey: string; voiceId: string };

const DEFAULT_EL_SETTINGS: ElevenLabsSettings = { mode: 'hardware', apiKey: '', voiceId: '' };

function VoiceAnnouncementsSection() {
  const [settings, setSettings] = useState<ElevenLabsSettings>(DEFAULT_EL_SETTINGS);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [showKey, setShowKey] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || !window.api) return;
    loaded.current = true;
    void window.api.getElevenLabsSettings().then((s) => {
      if (s) setSettings(s as ElevenLabsSettings);
    });
  }, []);

  async function handleSave() {
    if (!window.api) return;
    setSaveState('saving');
    try {
      await window.api.setElevenLabsSettings(settings as unknown as Record<string, unknown>);
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 1400);
    } catch {
      setSaveState('error');
    }
  }

  async function handleTest() {
    if (!window.api) return;
    setTestState('testing');
    const ok = await window.api.testElevenLabsVoice(settings as unknown as Record<string, unknown>);
    setTestState(ok ? 'ok' : 'fail');
    window.setTimeout(() => setTestState('idle'), 3000);
  }

  const isElevenLabs = settings.mode === 'elevenlabs';

  return (
    <Section title="voice announcements">
      <div className="rounded-md border border-line bg-bg-deeper/60 p-4 flex flex-col gap-4">
        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2">
          {(['hardware', 'elevenlabs'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, mode }))}
              className={cn(
                'rounded border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-all hover:-translate-y-0.5',
                settings.mode === mode
                  ? 'border-amber/35 bg-amber/[0.08] text-amber'
                  : 'border-line text-ink-faint hover:border-line-mid hover:text-ink',
              )}
            >
              {mode === 'hardware' ? 'hardware (sd card)' : 'elevenlabs (personalized)'}
            </button>
          ))}
        </div>

        {/* ElevenLabs config */}
        {isElevenLabs && (
          <div className="flex flex-col gap-3">
            <div>
              <Label>api key</Label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk_..."
                  className="min-w-0 flex-1 rounded border border-line-mid bg-white/[0.02] px-3 py-2 font-mono text-[11px] text-ink outline-none focus:border-amber/45"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="rounded border border-line px-2 py-1 font-mono text-[9px] text-ink-faint transition-colors hover:text-ink"
                >
                  {showKey ? 'hide' : 'show'}
                </button>
              </div>
            </div>

            <div>
              <Label>voice id</Label>
              <input
                type="text"
                value={settings.voiceId}
                onChange={(e) => setSettings((prev) => ({ ...prev, voiceId: e.target.value }))}
                placeholder="pNInz6obpgDQGcFmaJgB"
                className="mt-1.5 w-full rounded border border-line-mid bg-white/[0.02] px-3 py-2 font-mono text-[11px] text-ink outline-none focus:border-amber/45"
              />
              <div className="mt-1 font-mono text-[9px] text-ink-faint">
                find voice ids at elevenlabs.io/voice-lab
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={!settings.apiKey || !settings.voiceId || testState === 'testing'}
                className="rounded border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint transition-colors hover:border-amber/35 hover:text-amber disabled:opacity-40"
              >
                {testState === 'testing' ? 'playing...' : testState === 'ok' ? 'played ✓' : testState === 'fail' ? 'failed' : 'test voice'}
              </button>
              <div className="font-mono text-[9px] text-ink-faint">
                plays a sample through your speakers
              </div>
            </div>

            <div className="border-t border-line pt-3 font-mono text-[9px] text-ink-faint leading-relaxed">
              <div className="mb-1 uppercase tracking-[0.1em]">personalized for these events</div>
              {[
                'launching session',
                're-docking phone',
                'lifting phone',
                'cohort member joins',
                'cohort member leaves',
                'ending session',
                'idle activity detected',
                'distracted activity detected',
              ].map((ev) => (
                <div key={ev} className="flex items-center gap-1.5 py-0.5">
                  <span className="text-amber/60">·</span> {ev}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saveState === 'saving'}
          className="self-start rounded border border-amber/35 bg-amber/[0.08] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber transition-colors hover:bg-amber/[0.12] disabled:opacity-40"
        >
          {saveState === 'saving' ? 'saving' : saveState === 'saved' ? 'saved' : 'save'}
        </button>
        {saveState === 'error' && (
          <div className="font-mono text-[10px] text-amber">couldn't save settings</div>
        )}
      </div>
    </Section>
  );
}

type Props = {
  profile: OnboardingData;
  userId: string | null;
  brightness: number;
  setBrightness: (v: number) => void;
  breathSpeed: number;
  setBreathSpeed: (v: number) => void;
  taskColor: string;
  setTaskColor: (v: string) => void;
  onSignOut: () => void;
  onProfileUpdate: (patch: Partial<OnboardingData>) => void;
};

const PAUSE_BUDGETS = ["3 min", "5 min", "10 min"];
const BRIGHTNESS_LABELS = ["off", "dim", "medium", "bright", "max"];
const BREATH_LABELS = ["still", "slow", "natural", "quick", "fast"];

const COLORS = [
  { id: "amber", label: "amber", hex: "#E8A87C" },
  { id: "blue", label: "blue", hex: "#7CB0E8" },
  { id: "green", label: "green", hex: "#9CE8A8" },
  { id: "purple", label: "purple", hex: "#B89AE8" },
  { id: "coral", label: "coral", hex: "#E8756B" },
  { id: "moss", label: "moss", hex: "#7FA075" },
  { id: "gold", label: "gold", hex: "#D8B75C" },
  { id: "slate", label: "slate", hex: "#51616B" },
];

export function SettingsView({
  profile,
  userId,
  brightness,
  setBrightness,
  breathSpeed,
  setBreathSpeed,
  taskColor,
  setTaskColor,
  onSignOut,
  onProfileUpdate,
}: Props) {
  const [pauseBudget, setPauseBudget] = useState("3 min");
  const [usernameDraft, setUsernameDraft] = useState(profile.username);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    setUsernameDraft(profile.username);
  }, [profile.username]);

  const saveUsername = async () => {
    const next = usernameDraft.trim();
    if (!next) return;

    setSaveState("saving");
    try {
      if (userId && window.api) {
        await window.api.updateProfile(userId, { username: next });
      }
      onProfileUpdate({ username: next });
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1400);
    } catch {
      setSaveState("error");
    }
  };

  const deleteData = () => {
    if (!window.confirm("Delete local Cohort data and sign out?")) return;
    window.localStorage.clear();
    onSignOut();
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-6">
      <div className="grid gap-6">
        <Section title="Pause Budget" meta={pauseBudget}>
          <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
            <div className="grid grid-cols-3 gap-2">
              {PAUSE_BUDGETS.map((budget) => (
                <button
                  key={budget}
                  type="button"
                  onClick={() => setPauseBudget(budget)}
                  className={cn(
                    "rounded border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-all hover:-translate-y-0.5",
                    pauseBudget === budget
                      ? "border-amber/35 bg-amber/[0.08] text-amber"
                      : "border-line text-ink-faint hover:border-line-mid hover:text-ink",
                  )}
                >
                  {budget}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <div className="grid grid-cols-2 gap-6">
          <Section title="led brightness" meta={`${brightness}%`}>
            <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
              <Slider value={brightness} onChange={setBrightness} />
              <LabelRow labels={BRIGHTNESS_LABELS} />
            </div>
          </Section>

          <Section title="breathing speed" meta={`${breathSpeed}%`}>
            <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
              <Slider value={breathSpeed} onChange={setBreathSpeed} />
              <LabelRow labels={BREATH_LABELS} />
            </div>
          </Section>

          <Section title="color theme" meta="orb glow">
            <div className="grid grid-cols-4 gap-2.5">
              {COLORS.map((color) => {
                const active = taskColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setTaskColor(color.id)}
                    className={cn(
                      "rounded-md border bg-bg-deeper/60 p-4 text-left transition-all hover:-translate-y-0.5",
                      active
                        ? "border-amber/35 bg-amber/[0.08] text-amber"
                        : "border-line text-ink-dim hover:border-line-mid",
                    )}
                  >
                    <span
                      className="mb-3 block h-8 w-8 rounded-full border border-white/10"
                      style={{
                        background: color.hex,
                        boxShadow: active ? `0 0 22px ${color.hex}99` : undefined,
                      }}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                      {color.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <VoiceAnnouncementsSection />
        <Section title="Account">
          <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
            <Label>Username</Label>
            <div className="mt-2 flex gap-2">
              <input
                value={usernameDraft}
                onChange={(event) => {
                  setUsernameDraft(event.target.value);
                  setSaveState("idle");
                }}
                className="min-w-0 flex-1 rounded border border-line-mid bg-white/[0.02] px-3 py-2 font-mono text-[11px] text-ink outline-none focus:border-amber/45"
              />
              <button
                type="button"
                onClick={() => void saveUsername()}
                disabled={!usernameDraft.trim() || saveState === "saving"}
                className="rounded border border-amber/35 bg-amber/[0.08] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber transition-colors hover:bg-amber/[0.12] disabled:opacity-40"
              >
                {saveState === "saving"
                  ? "saving"
                  : saveState === "saved"
                    ? "saved"
                    : "save"}
              </button>
            </div>
            {saveState === "error" && (
              <div className="mt-2 font-mono text-[10px] text-amber">
                couldn't save username
              </div>
            )}
          </div>

          <div className="mt-3 grid gap-2">
            <DangerButton onClick={onSignOut}>Logout</DangerButton>
            <DangerButton onClick={deleteData}>Delete Data</DangerButton>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Label({ children }: { children: string }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
      {children}
    </div>
  );
}

function LabelRow({ labels }: { labels: string[] }) {
  return (
    <div className="mt-3 grid grid-cols-5 gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

function DangerButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-red-400/25 bg-red-400/[0.06] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-red-300 transition-all hover:-translate-y-0.5 hover:bg-red-400/[0.1]"
    >
      {children}
    </button>
  );
}
