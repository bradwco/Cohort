import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronIcon, SparkIcon } from '../shared_ui/icons';
import { hexA } from '../shared_ui/cn';

export type Session = {
  date: string;
  dur: string;
  flow: number;
  lifts: number;
  task: string;
  color: string;
};

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="text-right">
      <div className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </div>
      <div
        className="font-serif text-[18px] italic tabular-nums"
        style={{ color: accent ? '#E8A87C' : undefined }}
      >
        {value}
      </div>
    </div>
  );
}

export function SessionRow({ session, delay }: { session: Session; delay: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="overflow-hidden rounded-md border border-line bg-bg-panel transition-colors"
    >
      <div
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-4 px-[18px] py-3.5"
      >
        <div className="flex flex-1 items-center gap-4">
          <div
            className="h-10 w-1 rounded-sm"
            style={{
              background: session.color,
              boxShadow: `0 0 12px ${hexA(session.color, 0.5)}`,
            }}
          />
          <div>
            <div className="font-serif text-[15px] italic text-ink">{session.date}</div>
            <div className="mt-0.5 font-mono text-[10px] tracking-wide text-ink-faint">
              {session.task}
            </div>
          </div>
        </div>
        <div className="flex gap-7">
          <Stat label="duration" value={session.dur} />
          <Stat label="lifts" value={session.lifts} />
          <Stat label="flow" value={session.flow} accent />
        </div>
        <div
          className="text-ink-faint transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        >
          <ChevronIcon />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-line bg-amber/[0.02]"
          >
            <div className="px-[22px] pb-5 pt-4">
              <div className="mb-2.5 flex items-center gap-1.5">
                <SparkIcon />
                <span className="font-mono text-[10px] tracking-[0.14em] text-amber">
                  GEMMA · POST-MORTEM
                </span>
              </div>
              <div className="max-w-[720px] font-serif text-sm italic leading-[1.7] text-ink-dim">
                You lifted your phone{' '}
                <strong className="text-ink">{session.lifts} times</strong>, but always
                put it back within 30 seconds. Your focus was sharp, but you study best
                when you take a 10-minute break at the 1-hour mark.
                <br />
                <br />
                <em className="text-amber-dim">Next time, try a 60/10 Pomodoro split.</em>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
