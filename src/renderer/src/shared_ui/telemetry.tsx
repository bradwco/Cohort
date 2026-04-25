import { motion, AnimatePresence } from 'motion/react';
import type { RefObject } from 'react';
import { cn } from './cn';
import type { TelemetryEvent } from './types';

type Props = {
  feed: TelemetryEvent[];
  feedRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
};

export function Telemetry({ feed, feedRef, onClose }: Props) {
  return (
    <motion.aside
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className="fixed bottom-0 right-0 top-0 z-50 flex w-[380px] flex-col border-l border-line bg-bg-deeper/85 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between border-b border-line px-5 pb-4 pt-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink">
            <span className="inline-block h-1.5 w-1.5 animate-pulse-fast rounded-full bg-amber" />
            <span>telemetry inspector</span>
          </div>
          <div className="mt-1 font-mono text-[9px] tracking-wide text-ink-faint">
            raw mqtt + agent stream · live
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-[26px] w-[26px] items-center justify-center rounded border border-line-mid pb-0.5 text-lg leading-none text-ink-dim transition-colors hover:bg-white/[0.03]"
        >
          ×
        </button>
      </div>

      <div className="flex gap-0 border-b border-line px-5">
        {[
          { id: 'all', label: 'all events', active: true },
          { id: 'mqtt', label: 'mqtt', active: false },
          { id: 'agent', label: 'fetch.ai', active: false },
        ].map((t) => (
          <div
            key={t.id}
            className={cn(
              'cursor-pointer px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em]',
              t.active
                ? 'text-amber shadow-[inset_0_-1px_0_#E8A87C]'
                : 'text-ink-faint',
            )}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div
        ref={feedRef}
        className="scrollbar-thin flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3 font-mono"
      >
        {feed.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-[240px] rounded border border-dashed border-line bg-white/[0.02] px-4 py-5 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                no telemetry yet
              </div>
              <div className="mt-2 text-[10px] leading-relaxed text-ink-dim">
                Live MQTT and agent events will appear here once the real pipeline is connected.
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {feed.map((evt, i) => (
              <motion.div
                key={`${evt.ts}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded border border-line bg-white/[0.02] px-3 py-2.5"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[10px] text-ink-faint">{evt.ts}</span>
                  <span
                    className={cn(
                      'rounded border px-1.5 py-px text-[8px] font-medium tracking-[0.12em]',
                      evt.t === 'mqtt'
                        ? 'border-amber/30 bg-amber/10 text-amber'
                        : 'border-cool-blue/30 bg-cool-blue/10 text-cool-blue',
                    )}
                  >
                    {evt.t === 'mqtt' ? 'MQTT' : 'AGENT'}
                  </span>
                </div>
                <div className="mb-1 break-all text-[10px] text-ink">{evt.topic}</div>
                <div className="break-all text-[9px] leading-relaxed text-ink-dim">
                  {evt.payload}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line px-5 py-3.5">
        <div className="flex justify-between font-mono text-[10px] tracking-wide text-ink-faint">
          <span>broker</span>
          <span className="text-ink">broker.cohort.io:8883</span>
        </div>
        <div className="flex justify-between font-mono text-[10px] tracking-wide text-ink-faint">
          <span>events</span>
          <span className="text-amber">{feed.length}</span>
        </div>
      </div>
    </motion.aside>
  );
}
