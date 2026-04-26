import { useEffect, useMemo, useState } from 'react';
import { Section } from '../shared_ui/section';
import { SessionRow, type Session } from './session_row';
import { cn } from '../shared_ui/cn';

type DBSession = {
  id: string;
  started_at: string;
  ended_at?: string | null;
  planned_duration_minutes?: number;
  duration_mins?: number;          // mock data only
  workflow_group?: string;
  flow_score?: number | null;
  pause_minutes_used?: number;
  pause_minutes?: number;
  ai_summary?: string | null;
  productive_duration_seconds?: number;
  distracted_duration_seconds?: number;
  distracted_occurrences?: number;
  idle_duration_seconds?: number;
  idle_occurrences?: number;
  phone_lift_count?: number;
  total_work_duration_seconds?: number;
  conversation_history?: unknown[] | null;
};

type ChatMessage = Session['chatLog'][number];

type CalendarCell = {
  date: Date;
  inMonth: boolean;
  key: string;
  sessions: DBSession[];
};

const TASK_COLORS = ['#E8A87C', '#7CB0E8', '#B89AE8', '#9CE8A8', '#E8756B', '#7FA075'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtDuration(mins: number): string {
  if (mins < 1) return '<1m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function dbSessionToRow(s: DBSession, index: number): Session {
  const date = new Date(s.started_at);
  const label = `${date.toLocaleDateString('en-US', { weekday: 'long' })} / ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}`;

  const totalSeconds = s.total_work_duration_seconds ?? durationFromDates(s.started_at, s.ended_at ?? undefined);
  let dur: string;
  if (totalSeconds != null) {
    dur = formatDuration(totalSeconds);
  } else if (s.ended_at) {
    const elapsedMins = Math.round((Date.parse(s.ended_at) - Date.parse(s.started_at)) / 60000);
    dur = fmtDuration(elapsedMins);
  } else if (s.duration_mins != null) {
    dur = fmtDuration(s.duration_mins);
  } else if (s.planned_duration_minutes != null) {
    dur = `~${fmtDuration(s.planned_duration_minutes)}`;
  } else {
    dur = '--';
  }
  return {
    date: label,
    dur,
    flow: s.flow_score ?? 0,
    lifts: s.phone_lift_count ?? 0,
    task: s.workflow_group ?? 'focus session',
    color: TASK_COLORS[index % TASK_COLORS.length] ?? '#E8A87C',
    productive: formatDuration(s.productive_duration_seconds ?? 0),
    distracted: formatDuration(s.distracted_duration_seconds ?? 0),
    distractedOccurrences: s.distracted_occurrences ?? 0,
    idle: formatDuration(s.idle_duration_seconds ?? 0),
    idleOccurrences: s.idle_occurrences ?? 0,
    total: totalSeconds != null ? formatDuration(totalSeconds) : dur,
    summary: s.ai_summary ?? null,
    chatLog: normalizeConversationHistory(s.conversation_history),
  };
}

function normalizeConversationHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): ChatMessage[] => {
    if (!item || typeof item !== 'object') return [];
    const entry = item as { role?: unknown; parts?: unknown; content?: unknown; text?: unknown };
    const role = entry.role === 'model' || entry.role === 'assistant'
      ? 'assistant'
      : entry.role === 'user'
        ? 'user'
        : 'system';
    const text = extractConversationText(entry);
    return text ? [{ role, text }] : [];
  });
}

function extractConversationText(entry: { parts?: unknown; content?: unknown; text?: unknown }): string {
  if (typeof entry.text === 'string') return entry.text.trim();
  if (typeof entry.content === 'string') return entry.content.trim();
  if (!Array.isArray(entry.parts)) return '';

  return entry.parts
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const maybeText = (part as { text?: unknown }).text;
      return typeof maybeText === 'string' ? maybeText.trim() : '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function durationFromDates(startedAt: string, endedAt?: string): number | null {
  if (!endedAt) return null;
  const started = Date.parse(startedAt);
  const ended = Date.parse(endedAt);
  if (!Number.isFinite(started) || !Number.isFinite(ended)) return null;
  return Math.max(0, Math.round((ended - started) / 1000));
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

const MOCK_DB_SESSIONS: DBSession[] = [
  {
    id: 'mock-1',
    started_at: '2026-04-25T20:14:00',
    duration_mins: 124,
    flow_score: 94,
    phone_lift_count: 4,
    productive_duration_seconds: 6420,
    distracted_duration_seconds: 540,
    distracted_occurrences: 2,
    idle_duration_seconds: 480,
    idle_occurrences: 1,
    total_work_duration_seconds: 7440,
    workflow_group: 'reading / biochem',
    conversation_history: [
      { role: 'user', parts: [{ text: 'Can you help me summarize this pathway?' }, { text: '[screenshot]' }] },
      { role: 'model', parts: [{ text: 'Yes. Focus on the enzyme sequence and the regulation points first.' }] },
    ],
  },
  {
    id: 'mock-2',
    started_at: '2026-04-25T14:30:00',
    duration_mins: 90,
    flow_score: 88,
    phone_lift_count: 7,
    productive_duration_seconds: 4380,
    distracted_duration_seconds: 600,
    distracted_occurrences: 3,
    idle_duration_seconds: 420,
    idle_occurrences: 2,
    total_work_duration_seconds: 5400,
    workflow_group: 'math / 200a pset',
  },
  {
    id: 'mock-3',
    started_at: '2026-04-24T21:45:00',
    duration_mins: 192,
    flow_score: 97,
    phone_lift_count: 2,
    productive_duration_seconds: 10620,
    distracted_duration_seconds: 360,
    distracted_occurrences: 1,
    idle_duration_seconds: 540,
    idle_occurrences: 1,
    total_work_duration_seconds: 11520,
    workflow_group: 'coding / cs188',
  },
  {
    id: 'mock-4',
    started_at: '2026-04-19T11:00:00',
    duration_mins: 48,
    flow_score: 71,
    phone_lift_count: 12,
    productive_duration_seconds: 1980,
    distracted_duration_seconds: 540,
    distracted_occurrences: 4,
    idle_duration_seconds: 360,
    idle_occurrences: 2,
    total_work_duration_seconds: 2880,
    workflow_group: 'reading / biochem',
  },
];

type Props = {
  userId: string | null;
};

export function HistoryView({ userId }: Props) {
  const [sessions, setSessions] = useState<DBSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState(() => localDateKey(new Date()));

  useEffect(() => {
    if (!userId || !window.api) {
      setSessions(MOCK_DB_SESSIONS);
      setLoading(false);
      return;
    }
    void window.api.getSessionHistory(userId).then((rows) => {
      const dbRows = (rows as DBSession[]) ?? [];
      setSessions(dbRows.length > 0 ? dbRows : MOCK_DB_SESSIONS);
      setLoading(false);
    });
  }, [userId]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, DBSession[]>();
    for (const session of sessions) {
      const key = localDateKey(new Date(session.started_at));
      map.set(key, [...(map.get(key) ?? []), session]);
    }
    return map;
  }, [sessions]);

  const calendarCells = useMemo(
    () => buildMonthCells(monthCursor, sessionsByDay),
    [monthCursor, sessionsByDay],
  );

  const selectedSessions = sessionsByDay.get(selectedKey) ?? [];
  const selectedLabel = new Date(`${selectedKey}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const goMonth = (delta: number) => {
    setMonthCursor((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta, 1);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-[360px_minmax(0,1fr)] gap-6">
      <Section
        title="session calendar"
        meta={monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      >
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-5 flex items-center justify-between">
            <div className="font-serif text-xl italic">
              {monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="flex gap-2">
              <MonthButton onClick={() => goMonth(-1)} label="prev" />
              <MonthButton onClick={() => goMonth(1)} label="next" />
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-2">
            {WEEKDAYS.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell) => {
              const selected = selectedKey === cell.key;
              const hasSessions = cell.sessions.length > 0;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedKey(cell.key)}
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-full border font-mono text-[11px] transition-all',
                    selected
                      ? 'border-amber/45 bg-amber/[0.18] text-amber'
                      : 'border-transparent text-ink hover:border-line-mid hover:bg-white/[0.03]',
                    !cell.inMonth && 'text-ink-faint',
                  )}
                >
                  {cell.date.getDate()}
                  {hasSessions && (
                    <span
                      className={cn(
                        'absolute bottom-1 h-1 w-1 rounded-full',
                        selected ? 'bg-amber' : 'bg-cool-blue',
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section
        title="past sessions"
        meta={loading ? 'loading...' : `${selectedSessions.length} on ${selectedLabel}`}
      >
        {selectedSessions.length === 0 && !loading ? (
          <div className="rounded-md border border-line bg-bg-deeper/60 py-12 text-center">
            <div className="font-serif text-xl italic text-ink-dim">no sessions on this day</div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              pick a marked day to inspect past sessions
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {selectedSessions.map((s, i) => (
              <SessionRow key={s.id ?? i} session={dbSessionToRow(s, i)} delay={i * 50} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function buildMonthCells(monthCursor: Date, sessionsByDay: Map<string, DBSession[]>): CalendarCell[] {
  const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = localDateKey(date);
    return {
      date,
      key,
      inMonth: date.getMonth() === monthCursor.getMonth(),
      sessions: sessionsByDay.get(key) ?? [],
    };
  });
}

function MonthButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded border border-line text-ink-faint transition-colors hover:border-line-mid hover:text-ink"
    >
      {label === 'prev' ? '<' : '>'}
    </button>
  );
}
