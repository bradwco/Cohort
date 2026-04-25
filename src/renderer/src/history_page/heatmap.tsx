import { useMemo } from 'react';

const COLORS = [
  'rgba(232, 227, 216, 0.04)',
  'rgba(232, 168, 124, 0.18)',
  'rgba(232, 168, 124, 0.38)',
  'rgba(232, 168, 124, 0.65)',
  'rgba(232, 168, 124, 0.95)',
];

const level = (v: number) => (v < 0.2 ? 0 : v < 0.4 ? 1 : v < 0.6 ? 2 : v < 0.8 ? 3 : 4);

export function Heatmap() {
  const data = useMemo(
    () => Array.from({ length: 12 * 7 }, () => Math.random()),
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between pl-1 font-mono text-[9px] tracking-[0.1em] text-ink-faint">
        <span>mon</span>
        <span>wed</span>
        <span>fri</span>
      </div>
      <div className="grid grid-flow-col grid-cols-[repeat(12,1fr)] grid-rows-[repeat(7,1fr)] gap-[3px]">
        {data.map((v, i) => (
          <div
            key={i}
            className="aspect-square w-full rounded-sm transition-all"
            style={{
              background: COLORS[level(v)],
              animation: `fadeIn 0.4s ${i * 4}ms backwards`,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex items-center justify-end gap-1 font-mono text-[10px] text-ink-faint">
        <span>less</span>
        {COLORS.map((c, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{ background: c, width: 11, height: 11 }}
          />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
