import type { ViewId } from './types';

const TITLES: Record<ViewId, { t: string; s: string }> = {
  network: { t: 'live network', s: 'who is locked in right now' },
  history: { t: 'gemma debriefs', s: 'sessions, scored & summarized' },
  graveyard: { t: 'the graveyard', s: "sessions that didn't survive" },
  hardware: { t: 'hardware', s: 'program the physical rules' },
};

type Props = {
  view: ViewId;
  sessionActive: boolean;
  telemetryOpen: boolean;
  onToggleTelemetry: () => void;
  onSignOut?: () => void;
};

export function Header({
  view,
  sessionActive,
  telemetryOpen,
  onToggleTelemetry,
  onSignOut,
}: Props) {
  const meta = TITLES[view];
  return (
    <div className="mb-8 flex items-start justify-between gap-5 border-b border-line px-10 pb-7 pt-8">
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          cohort / {view}
        </div>
        <h1 className="m-0 font-serif text-[38px] font-light italic leading-[1.1] tracking-[-0.03em]">
          {meta.t}
        </h1>
        <div className="mt-1.5 font-serif text-sm italic text-ink-dim">{meta.s}</div>
      </div>
      <div className="flex items-center gap-3">
        {sessionActive && (
          <div className="flex items-center gap-2 rounded border border-amber/25 bg-amber/[0.08] px-3 py-1.5 text-amber">
            <span className="inline-block h-1.5 w-1.5 animate-pulse-fast rounded-full bg-amber" />
            <span className="font-mono text-[11px] tracking-[0.12em]">SESSION LIVE</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleTelemetry}
          className="flex items-center gap-2.5 rounded border border-line-mid bg-transparent px-3 py-1.5 text-ink-dim transition-colors hover:bg-white/[0.03]"
        >
          <span className="font-mono text-[11px] tracking-[0.1em]">
            {telemetryOpen ? 'HIDE' : 'SHOW'} TELEMETRY
          </span>
          <kbd className="rounded border border-line bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-ink-faint">
            Cmd T
          </kbd>
        </button>
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="rounded border border-line-mid bg-transparent px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:border-amber/35 hover:bg-amber/[0.06] hover:text-amber"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
