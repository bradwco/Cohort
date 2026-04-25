import { useEffect, useState } from "react";
import type { OnboardingData } from "../state/onboarding";
import { Section } from "../shared_ui/section";
import { Slider } from "./slider";
import { cn } from "../shared_ui/cn";

type Props = {
  profile: OnboardingData;
  userId: string | null;
  onSignOut: () => void;
  onProfileUpdate: (patch: Partial<OnboardingData>) => void;
};

const PAUSE_BUDGETS = ["3 min", "5 min", "10 min"];

export function SettingsView({
  profile,
  userId,
  onSignOut,
  onProfileUpdate,
}: Props) {
  const [pauseBudget, setPauseBudget] = useState("3 min");
  const [monkMode, setMonkMode] = useState(false);
  const [penalty, setPenalty] = useState(false);
  const [hudOpacity, setHudOpacity] = useState(100);
  const [borderEffect, setBorderEffect] = useState(false);
  const [zenAutoCollapse, setZenAutoCollapse] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(profile.username);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    setUsernameDraft(profile.username);
  }, [profile.username]);

  const setSessionLength = (value: string) => {
    const next = Number(value);
    if (Number.isNaN(next)) return;
    onProfileUpdate({
      sessionLength: Math.min(180, Math.max(10, Math.round(next))),
    });
  };

  const setAutoStart = (value: boolean) => {
    onProfileUpdate({
      preferences: {
        ...profile.preferences,
        autoStartOnDock: value,
      },
    });
  };

  const updateHudOpacity = (value: number) => {
    setHudOpacity(value);
    document.documentElement.style.setProperty(
      "--hud-opacity",
      String(value / 100),
    );
  };

  const updateBorderEffect = (value: boolean) => {
    setBorderEffect(value);
    document.documentElement.classList.toggle("border-glow", value);
  };

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
      <div>
        <Section title="Focus Rules">
          <div className="grid gap-3">
            <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Label>Pause Budget</Label>
              </div>
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

            <LocalOnlyToggle
              label="Zero Budget (monk mode)"
              value={monkMode}
              onChange={setMonkMode}
            />
            <LocalOnlyToggle
              label="Penalty"
              value={penalty}
              onChange={setPenalty}
            />

            <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 rounded-md border border-line bg-bg-deeper/60 p-4">
              <label>
                <Label>Default Session Length</Label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={profile.sessionLength}
                  onChange={(event) => setSessionLength(event.target.value)}
                  className="no-number-spinner mt-2 w-full rounded border border-line-mid bg-white/[0.02] px-3 py-2 font-serif text-2xl italic text-ink outline-none focus:border-amber/45"
                />
              </label>
              <div className="self-end font-mono text-[10px] leading-relaxed text-ink-faint">
                Sets the default timer used by the dashboard and hardware
                simulator.
              </div>
            </div>

            <ToggleRow
              label="Auto Start on Dock"
              value={profile.preferences.autoStartOnDock}
              onChange={setAutoStart}
              description="Start a session when the orb detects your phone docked."
            />
          </div>
        </Section>

        <Section title="Overlay">
          <div className="grid gap-3">
            <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Label>HUD Opacity</Label>
                <span className="font-mono text-[10px] text-amber">
                  {hudOpacity}%
                </span>
              </div>
              <Slider value={hudOpacity} onChange={updateHudOpacity} />
            </div>

            <ToggleRow
              label="Border Effect"
              value={borderEffect}
              onChange={updateBorderEffect}
              description="Adds a subtle glow class to the document root."
            />

            <LocalOnlyToggle
              label="Zen Mode Auto Collapse"
              value={zenAutoCollapse}
              onChange={setZenAutoCollapse}
            />
          </div>
        </Section>
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

function ToggleRow({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "flex items-center gap-4 rounded-md border p-4 text-left transition-all hover:-translate-y-0.5",
        value
          ? "border-amber/35 bg-amber/[0.08]"
          : "border-line bg-bg-deeper/60 hover:border-line-mid",
      )}
    >
      <TogglePill value={value} />
      <span>
        <span className="block font-serif text-sm italic text-ink">
          {label}
        </span>
        {description && (
          <span className="mt-1 block font-mono text-[10px] leading-relaxed text-ink-faint">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

function LocalOnlyToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "flex items-center gap-4 rounded-md border p-4 text-left transition-all hover:-translate-y-0.5",
        value
          ? "border-amber/35 bg-amber/[0.08]"
          : "border-line bg-bg-deeper/60 hover:border-line-mid",
      )}
    >
      <TogglePill value={value} />
      <span className="flex-1">
        <span className="block font-serif text-sm italic text-ink">
          {label}
        </span>
      </span>
    </button>
  );
}

function TogglePill({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors",
        value
          ? "border-amber/40 bg-amber/20"
          : "border-line-mid bg-white/[0.02]",
      )}
    >
      <span
        className={cn(
          "h-3.5 w-3.5 rounded-full transition-transform",
          value ? "translate-x-4 bg-amber" : "bg-ink-faint",
        )}
      />
    </span>
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
