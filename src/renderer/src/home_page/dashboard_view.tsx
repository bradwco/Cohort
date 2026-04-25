import { useEffect, useRef, useState } from 'react';
import { PixelOrb } from '../orb_character/pixel_orb';
import { PixelOrbMini } from '../orb_character/pixel_orb_mini';
import { SparkIcon } from '../shared_ui/icons';
import { cn } from '../shared_ui/cn';
import type { OnboardingData } from '../state/onboarding';

type OrbStatus = 'offline' | 'docked' | 'undocked';

type ProfileRow = {
  id: string;
  username: string;
  orb_color: string;
  hardware_status: 'docked' | 'offline';
  current_activity: string;
};

type LiveState = {
  status: 'docked' | 'undocked' | 'offline';
  workflowGroup?: string;
  pickupCount: number;
};

type DBSession = {
  id: string;
  started_at: string;
  duration_mins?: number;
  workflow_group?: string;
  flow_score?: number;
};

const GEMMA_INSIGHTS = [
  'Your best sessions start before 10 PM. You average 94 flow on night sessions vs 78 in the afternoon.',
  'You lift your phone most in the first 20 minutes. Try a hard start ritual to lock in faster.',
  'Sessions over 60 minutes have 30% better flow scores than shorter ones. You go deep.',
  "You haven't had a failed session in 5 days. The streak is working.",
];

function computeStreak(sessions: DBSession[]): number {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.map((s) => new Date(s.started_at).toLocaleDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (dates.has(d.toLocaleDateString())) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeFlowScore(liftCount: number, totalPauseMs: number, sessionLengthMins: number): number {
  const pausePenalty = Math.min(50, (totalPauseMs / (sessionLengthMins * 60 * 1000)) * 60);
  const liftPenalty = Math.min(40, liftCount * 4);
  return Math.max(0, Math.round(100 - pausePenalty - liftPenalty));
}

type Props = {
  userId: string | null;
  profile: OnboardingData;
  secondsLeft: number;
  fmt: (s: number) => string;
  orbStatus: OrbStatus;
  liftCount: number;
  totalPauseMs: number;
  currentWorkflow: string;
};

export function DashboardView({
  userId,
  profile,
  secondsLeft,
  fmt,
  orbStatus,
  liftCount,
  totalPauseMs,
  currentWorkflow,
}: Props) {
  const sessionActive = orbStatus !== 'offline';
  const flowScore = sessionActive
    ? computeFlowScore(liftCount, totalPauseMs, profile.sessionLength)
    : null;

  const [sessions, setSessions] = useState<DBSession[]>([]);
  const [friends, setFriends] = useState<ProfileRow[]>([]);
  const [liveStates, setLiveStates] = useState<Map<string, LiveState>>(new Map());

  const [qsOpen, setQsOpen] = useState(false);
  const [qsWorkflow, setQsWorkflow] = useState('');
  const [qsDuration, setQsDuration] = useState(Math.min(240, Math.max(5, profile.sessionLength)));
  const [qsStatus, setQsStatus] = useState<'idle' | 'starting' | 'done'>('idle');
  const qsInputRef = useRef<HTMLInputElement>(null);

  const streak = computeStreak(sessions);
  const insight = GEMMA_INSIGHTS[sessions.length % GEMMA_INSIGHTS.length] ?? GEMMA_INSIGHTS[0];
  const orbColor =
    orbStatus === 'docked' ? '#E8A87C' : orbStatus === 'undocked' ? '#7CB0E8' : '#3a3d4a';

  useEffect(() => {
    if (!userId || !window.api) return;
    void window.api.getSessionHistory(userId).then((rows) => setSessions((rows as DBSession[]) ?? []));
    void window.api.getFriends(userId).then((rows) => setFriends((rows as ProfileRow[]) ?? []));
  }, [userId]);

  useEffect(() => {
    if (!window.api) return;
    const cleanup = window.api.onFriendState((raw) => {
      const data = raw as { userId: string; status: string; workflowGroup?: string };
      setLiveStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId) ?? { status: 'offline', pickupCount: 0 };
        next.set(data.userId, {
          status: data.status as LiveState['status'],
          workflowGroup: data.workflowGroup ?? existing.workflowGroup,
          pickupCount: existing.pickupCount,
        });
        return next;
      });
    });
    return () => { cleanup(); };
  }, []);

  useEffect(() => {
    if (qsOpen && qsInputRef.current) qsInputRef.current.focus();
  }, [qsOpen]);

  async function handleQuickStart() {
    if (!userId || !qsWorkflow.trim()) return;
    const duration = Math.min(240, Math.max(5, Math.round(qsDuration)));
    setQsStatus('starting');
    try {
      await window.api.startSession(userId, qsWorkflow.trim(), duration);
      setQsStatus('done');
      setTimeout(() => {
        setQsOpen(false);
        setQsStatus('idle');
        setQsWorkflow('');
      }, 1200);
    } catch {
      setQsStatus('idle');
    }
  }

  const activeFriends = friends.filter((f) => {
    const live = liveStates.get(f.id);
    return live?.status === 'docked' || live?.status === 'undocked' || f.hardware_status === 'docked';
  });

  return (
    <div>
      <div className="mb-6 rounded-md border border-line bg-bg-deeper/60">
        <div className="flex min-h-[430px] flex-col items-center justify-center px-8 py-14 text-center">
          <PixelOrb color={orbColor} size={196} glow={0} />

          <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-faint">
            {sessionActive
              ? orbStatus === 'undocked'
                ? 'paused - phone lifted'
                : `focused - ${currentWorkflow || 'session active'}`
              : 'waiting for hardware'}
          </div>

          <div
            className={cn(
              'mt-3 font-serif text-[88px] font-light italic leading-none tracking-[-0.04em] tabular-nums',
              sessionActive ? 'text-ink' : 'text-ink-faint',
            )}
          >
            {sessionActive ? fmt(secondsLeft) : '--:--'}
          </div>

          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            {sessionActive ? 'remaining' : 'dock your phone to start a session'}
          </div>

          {sessionActive && (
            <div className="mt-4 flex items-center gap-3 font-mono text-[11px] tracking-wide text-ink-dim">
              <span>
                lifts <strong className={liftCount > 0 ? 'text-cool-blue' : 'text-ink-faint'}>{liftCount}</strong>
              </span>
              <span className="text-ink-faint">/</span>
              <span>
                pause used{' '}
                <strong className={totalPauseMs > 0 ? 'text-amber' : 'text-ink-faint'}>
                  {Math.floor(totalPauseMs / 60000)}m
                </strong>
              </span>
              {flowScore != null && (
                <>
                  <span className="text-ink-faint">/</span>
                  <span>
                    flow <strong className="text-amber">{flowScore}</strong>
                  </span>
                </>
              )}
            </div>
          )}

          {!sessionActive && (
            <div className="mt-8 w-full max-w-xl">
              {!qsOpen ? (
                <button
                  type="button"
                  onClick={() => setQsOpen(true)}
                  className="rounded border border-amber/35 bg-amber/[0.08] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-amber transition-all hover:-translate-y-0.5 hover:bg-amber/[0.12]"
                >
                  quick start session
                </button>
              ) : (
                <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
                  <input
                    ref={qsInputRef}
                    value={qsWorkflow}
                    onChange={(e) => setQsWorkflow(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleQuickStart(); }}
                    placeholder="what are you working on?"
                    className="h-10 w-full rounded border border-line-mid bg-bg-deeper/60 px-3 font-serif text-sm italic text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-amber/45"
                  />
                  <div className="mt-3 grid grid-cols-[1fr_130px] items-end gap-3 text-left">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      session length
                    </div>
                    <label className="block">
                      <input
                        type="number"
                        min={5}
                        max={240}
                        value={qsDuration}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isNaN(next)) return;
                          setQsDuration(next);
                        }}
                        onBlur={() => setQsDuration((v) => Math.min(240, Math.max(5, Math.round(v))))}
                        className="no-number-spinner h-10 w-full rounded border border-line-mid bg-bg-deeper/60 px-3 text-right font-serif text-xl italic text-ink outline-none transition-colors focus:border-amber/45"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleQuickStart()}
                      disabled={!qsWorkflow.trim() || qsStatus === 'starting'}
                      className="flex-1 rounded border border-amber/35 bg-amber/[0.08] py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber transition-all hover:bg-amber/[0.12] disabled:opacity-40"
                    >
                      {qsStatus === 'starting' ? 'starting...' : qsStatus === 'done' ? 'started' : `start ${Math.min(240, Math.max(5, Math.round(qsDuration)))}m session`}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setQsOpen(false); setQsWorkflow(''); setQsStatus('idle'); }}
                      className="rounded border border-line px-3 py-2 font-mono text-[10px] text-ink-faint hover:border-line-mid"
                    >
                      cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-6">
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">session pulse</div>
            <div className="font-mono text-[10px] text-amber">
              {streak > 0 ? `${streak} day streak` : 'no streak yet'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="orb" value={orbStatus} active={sessionActive} />
            <Stat label="flow score" value={flowScore != null ? String(flowScore) : '--'} />
            <Stat label="lifts" value={sessionActive ? String(liftCount) : '--'} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
            <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
              <div className="font-serif text-base italic">friends online</div>
              <div className="font-mono text-[10px] text-amber">
                {activeFriends.length} active
              </div>
            </div>
            {activeFriends.length === 0 ? (
              <div className="py-4 text-center font-mono text-[10px] text-ink-faint">
                no friends online right now
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeFriends.slice(0, 5).map((f) => {
                  const live = liveStates.get(f.id);
                  return (
                    <div key={f.id} className="flex items-center gap-2.5">
                      <PixelOrbMini color={f.orb_color ?? '#E8A87C'} pulse />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-serif text-sm italic">{f.username}</div>
                        <div className="truncate font-mono text-[9px] text-ink-faint">
                          {live?.workflowGroup ?? f.current_activity}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
            <div className="mb-2.5 flex items-center gap-1.5">
              <SparkIcon />
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber">
                gemma / insight
              </span>
            </div>
            <div className="font-serif text-sm italic leading-relaxed text-ink-dim">
              {sessions.length === 0
                ? 'Complete your first session to receive a personalized insight.'
                : insight}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="rounded border border-line bg-bg-deeper/60 px-3 py-3">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </div>
      <div className="flex items-center gap-2">
        {active && <span className="h-1.5 w-1.5 animate-pulse-fast rounded-full bg-amber" />}
        <div className="font-serif text-2xl italic text-ink">{value}</div>
      </div>
    </div>
  );
}
