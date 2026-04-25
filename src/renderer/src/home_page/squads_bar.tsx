import { cn } from '../shared_ui/cn';

const SQUADS = [
  { name: 'O-Chem Study Group', active: true, members: 4 },
  { name: 'Hackathon Team', active: false, members: 5 },
  { name: 'Roommates', active: false, members: 3 },
];

export function SquadsBar() {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-md border border-line bg-bg-panel px-[18px] py-3.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        active squad
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        {SQUADS.map((sq) => (
          <button
            key={sq.name}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 font-serif text-[13px] italic transition-colors',
              sq.active
                ? 'border-amber-dim bg-amber/[0.08] text-amber'
                : 'border-line-mid bg-transparent text-ink-dim hover:bg-white/[0.03]',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {sq.name}
            <span className="ml-1 font-mono text-[10px] opacity-60">{sq.members}</span>
          </button>
        ))}
        <button className="rounded-full border border-dashed border-line-mid px-3 py-1.5 font-mono text-[11px] text-ink-faint hover:bg-white/[0.03]">
          + new squad
        </button>
      </div>
    </div>
  );
}
