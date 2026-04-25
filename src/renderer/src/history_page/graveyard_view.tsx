import { motion } from 'motion/react';
import { Section } from '../shared_ui/section';
import { PixelGravestone } from '../orb_character/pixel_gravestone';
import { cn } from '../shared_ui/cn';

const DEAD = [
  { name: 'kyle', dur: '45m', reason: 'drained pause budget', when: '2 days ago', task: 'reading' },
  { name: 'bailey', dur: '12m', reason: 'phone lifted in monk mode', when: '3 days ago', task: 'math' },
  { name: 'casey', dur: '1h 22m', reason: 'session abandoned', when: '5 days ago', task: 'coding' },
  { name: 'kyle', dur: '18m', reason: 'phone lifted in monk mode', when: '1 week ago', task: 'reading' },
];

const LEADERBOARD = [
  { name: 'casey', streak: 31, rate: '0.4/hr' },
  { name: 'kyle', streak: 23, rate: '0.8/hr' },
  { name: 'alex', streak: 18, rate: '1.1/hr' },
  { name: 'emi', streak: 14, rate: '1.3/hr' },
  { name: 'bailey', streak: 6, rate: '2.1/hr' },
];

export function GraveyardView() {
  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-6">
      <Section title="recent failures" meta="4 sessions buried this week">
        <div className="flex flex-col gap-3">
          {DEAD.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i * 60) / 1000, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex items-center gap-3.5 rounded-md border border-line bg-bg-panel px-[18px] py-3.5"
            >
              <div className="h-10 w-9 shrink-0">
                <PixelGravestone />
              </div>
              <div className="flex-1">
                <div className="font-serif text-[15px] italic">
                  <span className="text-ink">{d.name}</span>
                  <span className="text-ink-faint"> · {d.task}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] tracking-wide text-ink-faint">
                  {d.reason}
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif text-base italic text-amber">{d.dur}</div>
                <div className="mt-0.5 font-mono text-[9px] tracking-wide text-ink-faint">
                  {d.when}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section title="streak leaderboard">
        <div className="flex flex-col gap-2">
          {LEADERBOARD.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i * 60) / 1000, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn(
                'flex items-center gap-3.5 rounded-md border px-4 py-3',
                i === 0
                  ? 'border-amber/20 bg-amber/[0.04]'
                  : 'border-line bg-bg-panel',
              )}
            >
              <div className="w-6 font-mono text-[11px] tracking-wide text-ink-faint">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1">
                <div className="font-serif text-[15px] italic">{p.name}</div>
                <div className="mt-0.5 font-mono text-[9px] tracking-wide text-ink-faint">
                  {p.rate} pickup rate
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif text-[22px] italic leading-none text-amber">
                  {p.streak}
                </div>
                <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                  days
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  );
}
