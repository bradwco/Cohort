import { useState } from 'react';
import { motion } from 'motion/react';
import { PixelOrbMini } from '../orb_character/pixel_orb_mini';
import { cn, hexA } from '../shared_ui/cn';

export type Friend = {
  id: string;
  name: string;
  task: string;
  rem: number | null;
  color: string | null;
  state: 'docked' | 'pause' | 'offline';
  pickup: number | null;
};

type Props = {
  friend: Friend;
  delay: number;
  fmt: (s: number) => string;
  incomingNudge?: boolean;
  onNudge: (friend: Friend) => void;
};

export function FriendCard({ friend, delay, fmt, incomingNudge = false, onNudge }: Props) {
  const [hover, setHover] = useState(false);
  const [nudged, setNudged] = useState(false);
  const offline = friend.state === 'offline';
  const paused = friend.state === 'pause';
  const color = friend.color ?? '#3a3d4a';

  const handleNudge = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNudge(friend);
    setNudged(true);
    setTimeout(() => setNudged(false), 1200);
  };

  return (
    <motion.div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: offline ? 0.45 : 1, y: 0 }}
      transition={{
        delay: delay / 1000,
        duration: 0.6,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      style={{
        boxShadow:
          hover && !offline
            ? `0 0 0 1px ${hexA(color, 0.4)}, 0 24px 60px -20px ${hexA(color, 0.3)}`
            : '0 0 0 1px rgba(232, 227, 216, 0.08)',
        background:
          hover && !offline
            ? `linear-gradient(135deg, ${hexA(color, 0.04)} 0%, transparent 70%)`
            : 'rgba(232, 227, 216, 0.02)',
      }}
      className="relative overflow-hidden rounded-md px-[18px] pb-3.5 pt-[18px] transition-all duration-300"
    >
      {!offline && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-0 h-px opacity-60"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }}
        />
      )}

      <div className="mb-3.5 flex items-center gap-3">
        <PixelOrbMini color={color} pulse={!offline && !paused} flash={nudged || incomingNudge} />
        <div className="min-w-0 flex-1">
          <div className="font-serif text-base italic text-ink">{friend.name}</div>
          <div className="mt-0.5 font-mono text-[10px] tracking-wide text-ink-faint">
            {friend.task}
          </div>
          {incomingNudge && (
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-amber">
              nudged you just now
            </div>
          )}
        </div>
        {offline && (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
            offline
          </span>
        )}
        {paused && (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-cool-blue">
            paused
          </span>
        )}
        {!offline && !paused && (
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse-fast rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
        )}
      </div>

      {!offline && friend.rem != null && (
        <div className="mb-3">
          <div className="h-[3px] overflow-hidden rounded bg-white/[0.06]">
            <div
              className="h-full rounded transition-[width] duration-300"
              style={{
                width: paused ? '20%' : '64%',
                background: `linear-gradient(90deg, ${hexA(color, 0.3)}, ${color})`,
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] tracking-wide text-ink-dim">
            <span>{fmt(friend.rem)} remaining</span>
            <span className="text-ink-faint">{friend.pickup ?? 0} lifts</span>
          </div>
        </div>
      )}

      <button
        onClick={handleNudge}
        className={cn(
          'w-full rounded border px-0 py-[7px] font-mono text-[11px] tracking-wide transition-all duration-200',
          nudged ? '' : 'border-line-mid bg-transparent text-ink-dim hover:bg-white/[0.03]',
        )}
        style={
          nudged
            ? {
                background: hexA(color, 0.15),
                borderColor: color,
                color,
              }
            : undefined
        }
      >
        {nudged ? 'nudge sent' : offline ? 'send nudge' : 'nudge'}
      </button>
    </motion.div>
  );
}
