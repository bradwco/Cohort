import { BreathingOrb } from '../orb_character/breathing_orb';
import { cn } from '../shared_ui/cn';

type Props = {
  secondsLeft: number;
  fmt: (s: number) => string;
  orbColor: string;
  orbStatus: 'offline' | 'docked' | 'undocked';
  liftCount: number;
  totalPauseMs: number;
  currentWorkflow: string;
};

function fmtPause(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function HeroStage({ secondsLeft, fmt, orbColor, orbStatus, liftCount, totalPauseMs, currentWorkflow }: Props) {
  const isActive = orbStatus !== 'offline';
  const isPaused = orbStatus === 'undocked';

  return (
    <div className="relative mb-8 flex min-h-[380px] items-center justify-center overflow-hidden rounded-lg border border-line bg-gradient-to-b from-amber/[0.02] to-transparent">
      <div className="relative flex flex-col items-center gap-8 px-8 py-14">
        <BreathingOrb color={isActive ? orbColor : '#3a3a4a'} size={196} />

        <div className="flex flex-col items-center gap-2.5 text-center">
          {isActive ? (
            <>
              <div className={cn(
                'font-mono text-[10px] uppercase tracking-[0.24em]',
                isPaused ? 'text-cool-blue' : 'text-amber-dim',
              )}>
                {isPaused ? 'paused · phone lifted' : `focused · ${currentWorkflow || 'cohort sync'}`}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  'font-serif text-[88px] font-light leading-none tracking-[-0.04em] tabular-nums transition-colors',
                  isPaused ? 'text-ink-dim' : 'text-ink',
                )}>
                  {fmt(secondsLeft)}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] tracking-wide text-ink-dim">
                <span>
                  lifts <strong className={liftCount > 0 ? 'text-cool-blue' : 'text-ink-faint'}>{liftCount}</strong>
                </span>
                <span className="text-ink-faint">·</span>
                <span>
                  pause used <strong className={totalPauseMs > 0 ? 'text-amber' : 'text-ink-faint'}>{fmtPause(totalPauseMs)}</strong>
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-faint">
                waiting for hardware
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-[88px] font-light leading-none tracking-[-0.04em] text-ink-faint tabular-nums">
                  --:--
                </span>
              </div>
              <div className="font-mono text-[11px] tracking-wide text-ink-faint">
                dock your phone to start a session
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
