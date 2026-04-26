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
  productive: string;
  distracted: string;
  distractedOccurrences: number;
  idle: string;
  idleOccurrences: number;
  total: string;
  summary: string | null;
  chatLog: Array<{
    role: 'user' | 'assistant' | 'system';
    text: string;
  }>;
  conversationHistory?: unknown[] | null;
};

type ConversationTurn = {
  role: 'user' | 'assistant' | 'system';
  text: string;
};

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function extractPartText(part: unknown): string {
  if (typeof part === 'string') return part;
  if (!part || typeof part !== 'object') return '';
  const record = part as Record<string, unknown>;
  return getString(record.text) || getString(record.content);
}

function extractMessageText(entry: unknown): string {
  if (typeof entry === 'string') return entry.trim();
  if (!entry || typeof entry !== 'object') return '';

  const record = entry as Record<string, unknown>;
  const direct = getString(record.text) || getString(record.content) || getString(record.message);
  if (direct) return direct;

  const parts = Array.isArray(record.parts) ? record.parts : Array.isArray(record.content) ? record.content : null;
  if (!parts) return '';

  return parts.map(extractPartText).filter(Boolean).join('\n').trim();
}

function normalizeRole(value: unknown): ConversationTurn['role'] {
  const role = getString(value).toLowerCase();
  if (role === 'model' || role === 'assistant') return 'assistant';
  if (role === 'user') return 'user';
  return 'system';
}

function formatConversation(history: unknown[] | null | undefined): ConversationTurn[] {
  if (!Array.isArray(history)) return [];

  return history
    .map((entry) => {
      const role =
        entry && typeof entry === 'object'
          ? normalizeRole((entry as Record<string, unknown>).role)
          : 'system';
      const text = extractMessageText(entry);
      return text ? { role, text } : null;
    })
    .filter((turn): turn is ConversationTurn => Boolean(turn));
}

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

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded border border-line bg-bg-deeper/60 px-3 py-2.5">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </div>
      <div className="font-serif text-xl italic tabular-nums text-ink">{value}</div>
      {sub && <div className="mt-1 font-mono text-[9px] text-ink-faint">{sub}</div>}
    </div>
  );
}

function ChatReplay({ messages }: { messages: Session['chatLog'] }) {
  if (messages.length === 0) {
    return (
      <div className="rounded border border-line bg-bg-deeper/50 px-4 py-6 text-center">
        <div className="font-serif text-base italic text-ink-dim">no chat log available</div>
      </div>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded border border-line bg-bg-deeper/50 p-3">
      <div className="flex flex-col gap-2.5">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === 'user' ? 'ml-auto max-w-[78%]' : 'mr-auto max-w-[78%]'}
          >
            <div
              className={
                message.role === 'user'
                  ? 'rounded border border-cool-blue/30 bg-cool-blue/10 px-3 py-2'
                  : 'rounded border border-line-mid bg-white/[0.035] px-3 py-2'
              }
            >
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                {message.role === 'assistant' ? 'gemma' : message.role}
              </div>
              <div className="whitespace-pre-wrap break-words font-serif text-sm italic leading-relaxed text-ink-dim">
                {message.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SessionRow({ session, delay }: { session: Session; delay: number }) {
  const [open, setOpen] = useState(false);
  const conversation = formatConversation(session.conversationHistory);
  const hasConversation = conversation.length > 0;

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
          <Stat label="flow" value={session.flow || '--'} accent />
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
                  SESSION METRICS
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <MetricCard label="productive" value={session.productive} />
                <MetricCard label="all work" value={session.total} />
                <MetricCard label="phone lifts" value={session.lifts} />
                <MetricCard
                  label="distracted"
                  value={session.distracted}
                  sub={`${session.distractedOccurrences} occurrences`}
                />
                <MetricCard
                  label="idle"
                  value={session.idle}
                  sub={`${session.idleOccurrences} occurrences`}
                />
                <MetricCard label="flow score" value={session.flow || '--'} />
              </div>
              <div className="mt-4 max-w-[720px] font-serif text-sm italic leading-[1.7] text-ink-dim">
                {session.summary ||
                  `Productive time accounted for ${session.productive} of ${session.total}, with ${session.distractedOccurrences} distracted and ${session.idleOccurrences} idle stretches.`}
              </div>
              <div className="mt-5">
                <div className="mb-2.5 flex items-center gap-1.5">
                  <SparkIcon />
                  <span className="font-mono text-[10px] tracking-[0.14em] text-amber">
                    CHAT REPLAY
                  </span>
                </div>
                <ChatReplay messages={session.chatLog} />
              </div>

              {hasConversation && (
                <div className="mt-5 flex max-w-[760px] flex-col gap-3 border-t border-line pt-4">
                  <div className="flex items-center gap-1.5">
                    <SparkIcon />
                    <span className="font-mono text-[10px] tracking-[0.14em] text-amber">
                      GEMMA - CONVERSATION
                    </span>
                  </div>
                  {conversation.map((turn, index) => (
                    <div
                      key={`${turn.role}-${index}`}
                      className="rounded border border-line bg-bg-deeper/70 px-3.5 py-3"
                    >
                      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                        {turn.role === 'assistant' ? 'Gemma' : turn.role}
                      </div>
                      <div className="whitespace-pre-wrap font-serif text-sm leading-[1.65] text-ink-dim">
                        {turn.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
