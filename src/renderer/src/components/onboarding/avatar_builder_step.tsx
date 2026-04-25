import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Shuffle } from "lucide-react";
import type { AvatarTraits, OnboardingData } from "../../state/onboarding";
import { Button } from "../../shared_ui/button";
import { cn, hexA } from "../../shared_ui/cn";
import {
  checkUsernameAvailable,
  isSupabaseConfigured,
} from "../../lib/supabase_auth";
import {
  AVATAR_TABS,
  DEFAULT_AVATAR_TAB,
  type AvatarTraitKey,
  getAvatarOption,
} from "./avatar_options";
import { PixelAvatar } from "./pixel_avatar";
import {
  onboardingEase,
  riseItem,
  shellStagger,
  stepStage,
} from "./motion_presets";

type Props = {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  direction: number;
};

const PRESET_TEMPLATES: { name: string; avatar: AvatarTraits }[] = [
  {
    name: "study mode",
    avatar: {
      skin: "rose",
      hair: "soft",
      eyes: "warm",
      outfit: "hoodie",
      accessory: "rounds",
      background: "amber",
    },
  },
  {
    name: "night coder",
    avatar: {
      skin: "warm",
      hair: "spike",
      eyes: "focus",
      outfit: "jacket",
      accessory: "visor",
      background: "purple",
    },
  },
  {
    name: "quiet reader",
    avatar: {
      skin: "peach",
      hair: "bob",
      eyes: "sleepy",
      outfit: "sweater",
      accessory: "none",
      background: "green",
    },
  },
  {
    name: "lab partner",
    avatar: {
      skin: "deep",
      hair: "crop",
      eyes: "bright",
      outfit: "work",
      accessory: "pin",
      background: "blue",
    },
  },
  {
    name: "library hero",
    avatar: {
      skin: "gold",
      hair: "cap",
      eyes: "warm",
      outfit: "crew",
      accessory: "phones",
      background: "gold",
    },
  },
  {
    name: "sunrise sprint",
    avatar: {
      skin: "cool",
      hair: "halo",
      eyes: "bright",
      outfit: "tunic",
      accessory: "star",
      background: "coral",
    },
  },
];

type AvailStatus = "idle" | "checking" | "available" | "taken" | "error";

export function AvatarBuilderStep({ data, update, direction }: Props) {
  const [activeTab, setActiveTab] =
    useState<AvatarTraitKey>(DEFAULT_AVATAR_TAB);
  const [pulseKey, setPulseKey] = useState(0);
  const [availStatus, setAvailStatus] = useState<AvailStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active =
    AVATAR_TABS.find((tab) => tab.id === activeTab) ?? AVATAR_TABS[0];
  const displayName = data.displayName || "you";
  const username = data.username || makeUsername(data.displayName);
  const backdrop =
    getAvatarOption("background", data.avatar.background)?.color ?? "#E8A87C";

  const setAvatarTrait = (trait: AvatarTraitKey, value: string) => {
    update({ avatar: { ...data.avatar, [trait]: value } });
    setPulseKey((key) => key + 1);
  };

  const setDisplayName = (value: string) => {
    update({
      displayName: value,
      username: makeUsername(value),
    });
  };

  const setUsername = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 18);
    update({ username: slug });
  };

  useEffect(() => {
    if (!isSupabaseConfigured() || !username) {
      setAvailStatus("idle");
      return;
    }
    setAvailStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(username);
        setAvailStatus(available ? "available" : "taken");
      } catch {
        setAvailStatus("error");
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  const randomize = () => {
    const avatar = AVATAR_TABS.reduce((next, tab) => {
      const option =
        tab.options[Math.floor(Math.random() * tab.options.length)]!;
      return { ...next, [tab.id]: option.id };
    }, {} as AvatarTraits);
    update({ avatar });
    setPulseKey((key) => key + 1);
  };

  const applyTemplate = (avatar: AvatarTraits) => {
    update({ avatar });
    setPulseKey((key) => key + 1);
  };

  return (
    <motion.div
      key="avatar-builder"
      custom={direction}
      variants={stepStage}
      initial="enter"
      animate="center"
      exit="exit"
      className="grid min-h-[620px] grid-cols-[minmax(380px,0.9fr)_minmax(520px,1.1fr)] gap-8"
    >
      <motion.div
        variants={riseItem}
        className="relative overflow-hidden rounded-lg border border-line bg-bg-deeper/60 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
      >
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(circle at 50% 36%, ${hexA(backdrop, 0.22)}, transparent 48%)`,
          }}
          animate={{ opacity: [0.54, 0.78, 0.54], scale: [0.98, 1.03, 0.98] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex h-full flex-col">
          <motion.div
            variants={shellStagger}
            initial="hidden"
            animate="show"
            className="flex items-start justify-between gap-5"
          >
            <motion.div variants={riseItem}>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber">
                02 / identity
              </div>
              <h1 className="mt-3 font-serif text-[56px] font-light italic leading-none tracking-[-0.04em]">
                Create your signal.
              </h1>
            </motion.div>
            <motion.div
              variants={riseItem}
              whileHover={{ y: -2, rotate: -4 }}
              whileTap={{ scale: 0.96, rotate: 8 }}
              transition={{ duration: 0.18, ease: onboardingEase }}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={randomize}
                title="Randomize avatar"
                aria-label="Randomize avatar"
                className="shrink-0"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18, duration: 0.46, ease: onboardingEase }}
            className="flex flex-1 items-center justify-center py-8"
          >
            <PixelAvatar
              key={pulseKey}
              avatar={data.avatar}
              size={292}
              animated
            />
          </motion.div>

          <motion.div
            variants={riseItem}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3 border-t border-line pt-5"
          >
            <label className="block">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                display name
              </span>
              <input
                value={data.displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="What should Cohort call you?"
                className="h-11 w-full rounded-md border border-line-mid bg-white/[0.03] px-3.5 font-serif text-lg italic text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-amber/50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                handle
              </span>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 flex-1 items-center rounded-md border bg-white/[0.03] px-3 transition-colors",
                    availStatus === "taken"
                      ? "border-red-500/50"
                      : availStatus === "available"
                        ? "border-emerald-500/40"
                        : "border-line-mid",
                  )}
                >
                  <span className="font-mono text-[11px] text-ink-faint">
                    @
                  </span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="handle"
                    className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-amber outline-none placeholder:text-ink-faint"
                  />
                </div>
                <div className="w-20 text-right font-mono text-[9px]">
                  {availStatus === "checking" && (
                    <span className="text-ink-faint">checking…</span>
                  )}
                  {availStatus === "available" && (
                    <span className="text-emerald-400">✓ free</span>
                  )}
                  {availStatus === "taken" && (
                    <span className="text-red-400">✗ taken</span>
                  )}
                  {availStatus === "error" && (
                    <span className="text-ink-faint">—</span>
                  )}
                </div>
              </div>
            </label>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        variants={shellStagger}
        initial="hidden"
        animate="show"
        className="flex min-w-0 flex-col gap-4"
      >
        <motion.div
          variants={riseItem}
          className="rounded-lg border border-line bg-bg-deeper/45 p-4"
        >
          <div className="grid grid-cols-6 gap-1.5">
            {AVATAR_TABS.map((tab) => (
              <motion.button
                key={tab.id}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative h-9 rounded border font-mono text-[10px] uppercase tracking-[0.12em] transition-all",
                  activeTab === tab.id
                    ? "border-amber/35 bg-amber/[0.08] text-amber"
                    : "border-line bg-white/[0.015] text-ink-faint hover:border-line-mid hover:text-ink-dim",
                )}
              >
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="avatar-active-tab"
                    className="absolute inset-0 rounded border border-amber/30 bg-amber/[0.06]"
                    transition={{ duration: 0.28, ease: onboardingEase }}
                  />
                )}
                <span className="relative">{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={riseItem}
          className="min-h-0 flex-1 rounded-lg border border-line bg-bg-deeper/45 p-4"
        >
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <div>
              <div className="font-serif text-2xl font-light italic">
                {active.label}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                {active.options.length} variants
              </div>
            </div>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div className="grid grid-cols-4 gap-3">
            {active.options.map((option, index) => {
              const selected = data.avatar[active.id] === option.id;
              const previewAvatar = { ...data.avatar, [active.id]: option.id };

              return (
                <motion.button
                  key={option.id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.025,
                    duration: 0.24,
                    ease: onboardingEase,
                  }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setAvatarTrait(active.id, option.id)}
                  className={cn(
                    "group relative flex min-h-[124px] flex-col items-center justify-between overflow-hidden rounded-md border p-3 transition-all duration-200",
                    selected
                      ? "border-amber/45 bg-amber/[0.07] shadow-[0_0_30px_rgba(232,168,124,0.08)]"
                      : "border-line bg-white/[0.018] hover:-translate-y-0.5 hover:border-line-mid hover:bg-white/[0.03]",
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="avatar-selected-option"
                      className="pointer-events-none absolute inset-0 rounded-md border border-amber/50"
                      transition={{ duration: 0.26, ease: onboardingEase }}
                    />
                  )}
                  <div className="flex h-16 w-16 items-center justify-center">
                    {active.id === "background" || active.id === "skin" ? (
                      <span
                        className="h-12 w-12 rounded-full border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
                        style={{ background: option.color }}
                      />
                    ) : (
                      <PixelAvatar avatar={previewAvatar} size={70} />
                    )}
                  </div>
                  <div className="mt-2 w-full text-center">
                    <div className="truncate font-serif text-sm italic text-ink">
                      {option.label}
                    </div>
                    <div
                      className="mx-auto mt-2 h-1 w-8 rounded-full"
                      style={{ background: option.accent ?? option.color }}
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={riseItem}>
          <div className="mb-2 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              preset templates
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
              quick starts
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_TEMPLATES.map((template, index) => (
              <motion.button
                key={template.name}
                type="button"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => applyTemplate(template.avatar)}
                className="rounded-md border border-line bg-white/[0.018] px-2 py-2.5 text-center"
                style={{ animation: `fadeUp 0.35s ${index * 45}ms both` }}
              >
                <PixelAvatar avatar={template.avatar} size={48} />
                <div className="mt-1.5 truncate font-mono text-[9px] text-ink-faint">
                  {template.name}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function makeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
}
