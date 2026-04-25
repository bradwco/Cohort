import { useState } from 'react';
import { cn } from '../shared_ui/cn';

type Props = {
  groups: string[];
  activeGroup: string | null;
  onSelect: (name: string) => void;
  onAdd: (name: string) => void;
};

export function SquadsBar({ groups, activeGroup, onSelect, onAdd }: Props) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput('');
    setAdding(false);
  }

  return (
    <div className="mb-6 flex items-center gap-4 rounded-md border border-line bg-bg-panel px-[18px] py-3.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        active squad
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2">
        {groups.length === 0 && !adding && (
          <span className="font-mono text-[10px] text-ink-faint">no squads yet</span>
        )}

        {groups.map((g) => (
          <button
            key={g}
            onClick={() => onSelect(g)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 font-serif text-[13px] italic transition-colors',
              activeGroup === g
                ? 'border-amber-dim bg-amber/[0.08] text-amber'
                : 'border-line-mid bg-transparent text-ink-dim hover:bg-white/[0.03]',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {g}
          </button>
        ))}

        {adding ? (
          <form onSubmit={submit} className="flex items-center gap-1">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="squad name…"
              className="rounded-full border border-amber/40 bg-white/[0.04] px-3 py-1.5 font-serif text-[13px] italic text-ink placeholder-ink-faint outline-none focus:border-amber/60"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-full border border-amber/40 bg-amber/10 px-3 py-1.5 font-mono text-[10px] text-amber disabled:opacity-40"
            >
              add
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setInput(''); }}
              className="rounded-full border border-line-mid px-3 py-1.5 font-mono text-[10px] text-ink-faint hover:text-ink"
            >
              cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-line-mid px-3 py-1.5 font-mono text-[11px] text-ink-faint hover:bg-white/[0.03]"
          >
            + new squad
          </button>
        )}
      </div>
    </div>
  );
}
