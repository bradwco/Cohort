import { useEffect, useState } from "react";
import type { OnboardingData } from "../state/onboarding";
import { Section } from "../shared_ui/section";
import { Slider } from "./slider";
import { cn } from "../shared_ui/cn";

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

      <div>
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
