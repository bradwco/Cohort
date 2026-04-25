import { BreathingOrb } from '../orb_character/breathing_orb';

type Props = {
  secondsLeft: number;
  fmt: (s: number) => string;
  orbColor: string;
};

export function HeroStage({ secondsLeft, fmt, orbColor }: Props) {
  return (
    <div className="relative mb-8 flex min-h-[380px] items-center justify-center overflow-hidden rounded-lg border border-line bg-gradient-to-b from-amber/[0.02] to-transparent">
      <div className="relative flex flex-col items-center gap-8 px-8 py-14">
        <BreathingOrb color={orbColor} size={196} />
        <div className="flex flex-col items-center gap-2.5 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-dim">
            focused · cohort sync
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-[88px] font-light leading-none tracking-[-0.04em] text-ink tabular-nums">
              {fmt(secondsLeft)}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-wide text-ink-dim">
            <span>
              flow score <strong className="text-amber">94</strong>
            </span>
            <span className="text-ink-faint">·</span>
            <span>0 lifts</span>
            <span className="text-ink-faint">·</span>
            <span>
              pause budget <strong>2:48</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
