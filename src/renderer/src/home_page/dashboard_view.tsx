import { useEffect, useState } from 'react';
import { PixelOrb } from '../orb_character/pixel_orb';
import { PixelOrbMini } from '../orb_character/pixel_orb_mini';
import { PixelAvatar } from '../components/onboarding/pixel_avatar';
import { SparkIcon } from '../shared_ui/icons';
import { cn } from '../shared_ui/cn';
import type { AvatarTraits, OnboardingData } from '../state/onboarding';

type OrbStatus = 'offline' | 'docked' | 'undocked';

type ProfileRow = {
  id: string;
  username: string;
  orb_color: string;
  hardware_status: 'docked' | 'offline';
  current_activity: string;
  last_ping: string;
  avatar?: AvatarTraits | null;
};

type LiveState = {
  status: 'docked' | 'undocked' | 'offline';
  workflowGroup?: string;
  sessionStartedAt?: string;
  pickupCount: number;
};

type DBSession = {
  id: string;
  started_at: string;
  duration_mins?: number;
  workflow_group?: string;
  flow_score?: number;
};

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

function formatElapsed(startedAt?: string): string {
  if (!startedAt) return 'live now';
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

type Props = {
  userId: string | null;
  profile: OnboardingData;
  secondsElapsed: number;
  fmt: (s: number) => string;
  orbStatus: OrbStatus;
  liftCount: number;
  totalPauseMs: number;
  currentWorkflow: string;
  sessionPausedAt: string | null;
  pauseBudgetMinutes: number;
  onEndSession: () => void;
};

type AgentResponse = {
  text?: string;
  error?: string;
};

export function DashboardView({
  userId,
  profile,
  secondsElapsed,
  fmt,
  orbStatus,
  liftCount,
  totalPauseMs,
  currentWorkflow,
  sessionPausedAt,
  pauseBudgetMinutes,
  onEndSession,
}: Props) {
  const sessionActive = orbStatus !== 'offline';
  const isPaused = sessionActive && sessionPausedAt !== null;
  const goalSecs = profile.sessionLength * 60;
  const goalReached = sessionActive && secondsElapsed >= goalSecs;
  const flowScore = sessionActive
    ? computeFlowScore(liftCount, totalPauseMs, profile.sessionLength)
    : null;

  const [sessions, setSessions] = useState<DBSession[]>([]);
  const [friends, setFriends] = useState<ProfileRow[]>([]);
  const [liveStates, setLiveStates] = useState<Map<string, LiveState>>(new Map());
  const [, setNowTick] = useState(Date.now());
  const [agentInsight, setAgentInsight] = useState('Complete your first session to receive a personalized insight.');
  const [insightLoading, setInsightLoading] = useState(false);

  const streak = computeStreak(sessions);
  const orbColor = isPaused ? '#7CB0E8'
    : orbStatus === 'docked' ? '#E8A87C'
    : orbStatus === 'undocked' ? '#7CB0E8'
    : '#3a3d4a';

  useEffect(() => {
    if (!userId || !window.api) return;
    void window.api.getSessionHistory(userId).then((rows) => setSessions((rows as DBSession[]) ?? []));
    void Promise.all([
      window.api.getFriends(userId),
      window.api.getSharedCohortProfiles(userId),
    ]).then(([friendRows, cohortRows]) => {
      const merged = new Map<string, ProfileRow>();
      for (const row of [...((friendRows as ProfileRow[]) ?? []), ...((cohortRows as ProfileRow[]) ?? [])]) {
        merged.set(row.id, row);
      }
      setFriends(Array.from(merged.values()));
    });
  }, [userId]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!window.api || friends.length === 0) return;
    void window.api.subscribeFriends(friends.map((friend) => friend.id));
  }, [friends]);

  useEffect(() => {
    if (!window.api) return;
    const cleanup = window.api.onFriendState((raw) => {
      const data = raw as { userId: string; status: string; workflowGroup?: string; sessionStartedAt?: string };
      setLiveStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId) ?? { status: 'offline', pickupCount: 0 };
        next.set(data.userId, {
          status: data.status as LiveState['status'],
          workflowGroup: data.workflowGroup ?? existing.workflowGroup,
          sessionStartedAt: data.sessionStartedAt ?? existing.sessionStartedAt,
          pickupCount: existing.pickupCount,
        });
        return next;
      });
    });
    return () => { cleanup(); };
  }, []);

  useEffect(() => {
    if (!userId || !window.api) {
      setInsightLoading(false);
      setAgentInsight('Sign in to receive personalized dashboard insights.');
      return;
    }

    let cancelled = false;
    setInsightLoading(true);

    void window.api.queryAgent({
      intent: 'dashboard_insight',
      userId,
      context: {
        session_active: sessionActive,
        current_workflow: currentWorkflow || null,
        lift_count: liftCount,
        total_pause_minutes: Math.floor(totalPauseMs / 60000),
        planned_duration_minutes: profile.sessionLength,
        recent_session_count: sessions.length,
        streak_days: streak,
      },
    }).then((response) => {
      if (cancelled) return;
      const data = response as AgentResponse;
      const text = data.text?.trim();
      if (text) {
        setAgentInsight(text);
        return;
      }
      if (sessions.length === 0) {
        setAgentInsight('Complete your first session to receive a personalized insight.');
        return;
      }
      setAgentInsight(data.error ? `agent unavailable: ${data.error}` : 'agent unavailable');
    }).catch((error) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      setAgentInsight(`agent unavailable: ${message}`);
    }).finally(() => {
      if (!cancelled) setInsightLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    currentWorkflow,
    liftCount,
    profile.sessionLength,
    sessionActive,
    sessions.length,
    streak,
    totalPauseMs,
    userId,
  ]);

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
              ? isPaused
                ? 'session paused'
                : orbStatus === 'undocked'
                  ? 'paused — phone lifted'
                  : goalReached
                    ? `goal reached — ${currentWorkflow || 'keep going'}`
                    : `focused — ${currentWorkflow || 'session active'}`
              : 'waiting for hardware'}
          </div>

          <div
            className={cn(
              'mt-3 font-serif text-[88px] font-light italic leading-none tracking-[-0.04em] tabular-nums',
              !sessionActive && 'text-ink-faint',
              sessionActive && !isPaused && !goalReached && 'text-ink',
              isPaused && 'text-cool-blue',
              goalReached && !isPaused && 'text-amber',
            )}
          >
            {sessionActive ? fmt(secondsElapsed) : '--:--'}
          </div>

          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            {sessionActive
              ? `elapsed · goal ${profile.sessionLength}m`
              : 'dock your phone to start a session'}
          </div>

          {goalReached && !isPaused && (
            <div className="mt-3 rounded border border-amber/40 bg-amber/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber">
              session goal reached ✓
            </div>
          )}

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

          {sessionPausedAt && sessionActive && (
            <PauseBudgetBanner
              pausedAt={sessionPausedAt}
              budgetMinutes={pauseBudgetMinutes}
            />
          )}

          {sessionActive && (
            <button
              onClick={onEndSession}
              className="mt-5 rounded border border-line-mid px-5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint transition-colors hover:border-red-500/40 hover:text-red-400"
            >
              End Session
            </button>
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
                  const activity = live?.workflowGroup ?? f.current_activity ?? 'in session';
                  const elapsedFrom = live?.sessionStartedAt ?? (f.hardware_status === 'docked' ? f.last_ping : undefined);
                  return (
                    <div key={f.id} className="flex items-center gap-2.5">
                      <ProfileAvatar profile={f} color={f.orb_color ?? '#E8A87C'} pulse />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-serif text-sm italic">{f.username}</div>
                        <div className="truncate font-mono text-[9px] text-ink-faint">
                          {activity}
                        </div>
                        <div className="font-mono text-[9px] text-amber">
                          {formatElapsed(elapsedFrom)}
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
              {insightLoading ? 'asking gemma...' : agentInsight}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileAvatar({
  profile,
  color,
  pulse = false,
}: {
  profile?: ProfileRow;
  color?: string;
  pulse?: boolean;
}) {
  if (profile?.avatar) {
    return (
      <div className={cn('h-[30px] w-[30px] shrink-0', pulse && 'animate-pulse')}>
        <PixelAvatar avatar={profile.avatar} size={30} />
      </div>
    );
  }

  return <PixelOrbMini color={color} pulse={pulse} />;
}

function PauseBudgetBanner({ pausedAt, budgetMinutes }: { pausedAt: string; budgetMinutes: number }) {
  const elapsedMs = Date.now() - Date.parse(pausedAt);
  const elapsedMin = Math.floor(elapsedMs / 60000);
  const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
  const budgetMs = budgetMinutes * 60 * 1000;
  const remainingMs = Math.max(0, budgetMs - elapsedMs);
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);
  const overBudget = elapsedMs >= budgetMs;

  return (
    <div className={cn(
      'mt-4 rounded border px-4 py-3 font-mono text-[10px]',
      overBudget
        ? 'border-red-500/40 bg-red-500/10 text-red-400'
        : 'border-amber/30 bg-amber/10 text-amber',
    )}>
      <div className="uppercase tracking-[0.12em]">
        {overBudget ? 'pause budget exceeded — session ending' : 'session paused — overlay closed'}
      </div>
      <div className="mt-1 text-[9px] text-ink-faint">
        {overBudget
          ? `paused ${elapsedMin}m ${elapsedSec}s`
          : `${remainingMin}m ${remainingSec}s remaining before auto-end`}
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
