import { useEffect, useRef, useState } from 'react';
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
  ended_at?: string | null;
  duration_mins?: number;
  workflow_group?: string;
  flow_score?: number | null;
  total_work_duration_seconds?: number;
  phone_lift_count?: number;
};

function formatLastSessionDuration(s: DBSession): string {
  const totalSeconds =
    s.total_work_duration_seconds ??
    (s.ended_at ? Math.max(0, Math.round((Date.parse(s.ended_at) - Date.parse(s.started_at)) / 1000)) : null);
  if (totalSeconds == null) return s.duration_mins != null ? `${s.duration_mins}m` : '--';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

function formatLastSessionWhen(startedAt: string): string {
  const ms = Date.now() - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms < 0) return '';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

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

function formatPause(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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
}: Props) {
  const sessionActive = orbStatus !== 'offline';
  const flowScore = sessionActive
    ? computeFlowScore(liftCount, totalPauseMs, profile.sessionLength)
    : null;

  const [sessions, setSessions] = useState<DBSession[]>([]);
  const [friends, setFriends] = useState<ProfileRow[]>([]);
  const [liveStates, setLiveStates] = useState<Map<string, LiveState>>(new Map());
  const [, setNowTick] = useState(Date.now());
  const [agentInsight, setAgentInsight] = useState('Complete your first session to receive a personalized insight.');
  const [insightLoading, setInsightLoading] = useState(false);
  const insightInFlight = useRef(false);
  const insightBackoffUntil = useRef(0);
  const INSIGHT_FAILURE_BACKOFF_MS = 30_000;
  const INSIGHT_DEBOUNCE_MS = 1_500;

  const streak = computeStreak(sessions);
  const lastSession = !sessionActive ? sessions[0] ?? null : null;
  const hasLastSession = lastSession != null;
  const orbColor = orbStatus === 'docked' ? '#E8A87C'
    : orbStatus === 'undocked' ? '#7CB0E8'
    : hasLastSession ? '#E8A87C'
    : '#3a3d4a';

  useEffect(() => {
    if (!userId || !window.api) return;
    if (orbStatus !== 'offline') return;
    void window.api.getSessionHistory(userId).then((rows) => setSessions((rows as DBSession[]) ?? []));
  }, [userId, orbStatus]);

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

    if (insightInFlight.current) return;
    if (Date.now() < insightBackoffUntil.current) return;

    let cancelled = false;
    const debounceId = window.setTimeout(() => {
      if (cancelled) return;
      insightInFlight.current = true;
      setInsightLoading(true);

      void window.api!.queryAgent({
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
          insightBackoffUntil.current = 0;
          return;
        }
        if (sessions.length === 0) {
          setAgentInsight('Complete your first session to receive a personalized insight.');
          return;
        }
        if (data.error) {
          insightBackoffUntil.current = Date.now() + INSIGHT_FAILURE_BACKOFF_MS;
        }
        setAgentInsight(data.error ? `agent unavailable: ${data.error}` : 'agent unavailable');
      }).catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        insightBackoffUntil.current = Date.now() + INSIGHT_FAILURE_BACKOFF_MS;
        setAgentInsight(`agent unavailable: ${message}`);
      }).finally(() => {
        insightInFlight.current = false;
        if (!cancelled) setInsightLoading(false);
      });
    }, INSIGHT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceId);
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

  const primaryLabel = sessionActive ? 'Elapsed time' : hasLastSession ? 'Last session' : 'No session yet';
  const primaryValue = sessionActive
    ? fmt(secondsElapsed)
    : hasLastSession
      ? formatLastSessionDuration(lastSession!)
      : '--:--';
  const sessionContext = sessionActive
    ? currentWorkflow || 'focus session'
    : hasLastSession
      ? lastSession!.workflow_group ?? 'focus session'
      : 'Dock your phone to begin.';
  const sessionHint = sessionActive
    ? orbStatus === 'undocked'
      ? 'Put your phone back on the dock to resume focus.'
      : 'Keep the phone docked. Cohort tracks lifts and pause time automatically.'
    : hasLastSession
      ? `Finished ${formatLastSessionWhen(lastSession!.started_at)}. Dock your phone when you are ready for another round.`
      : 'Start by placing your phone on the dock. The timer begins when hardware reports docked.';
  const liftMetric = sessionActive
    ? String(liftCount)
    : hasLastSession && lastSession!.phone_lift_count != null
      ? String(lastSession!.phone_lift_count)
      : '--';

  return (
    <div className="grid h-[calc(100vh-148px)] min-h-0 grid-cols-[minmax(0,1fr)_320px] gap-5 overflow-hidden pb-5">
      <div className="min-h-0">
        <section className="h-full min-h-0 rounded-md border border-line bg-bg-deeper/60 p-5">
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-5">
            <div className="max-w-xl">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                <strong className="text-amber">{primaryLabel}</strong> / {sessionContext}
              </div>
              <p className="mt-3 font-serif text-lg italic leading-snug text-ink-dim">
                <strong className="text-ink">{sessionActive ? 'Stay with it.' : 'Start here.'}</strong>{' '}
                {sessionHint}
              </p>
            </div>

            <div className="flex min-w-0 flex-col items-center justify-center text-center">
              <PixelOrb color={orbColor} size={196} glow={0} />
              <div
                className={cn(
                  'mt-6 font-serif text-[clamp(60px,7.5vw,98px)] font-light italic leading-none tabular-nums',
                  sessionActive ? 'text-ink' : hasLastSession ? 'text-ink-dim' : 'text-ink-faint',
                )}
              >
                {primaryValue}
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                live readout
              </div>
              <div className="grid grid-cols-3 gap-3">
                <DetailMetric
                  label="Orb state"
                  value={orbStatus}
                  tone={sessionActive ? 'amber' : 'muted'}
                  active={sessionActive}
                />
                <DetailMetric
                  label="Pause used"
                  value={sessionActive ? formatPause(totalPauseMs) : '--'}
                  tone={totalPauseMs > 0 ? 'amber' : 'muted'}
                />
                <DetailMetric
                  label="Phone lifts"
                  value={liftMetric}
                  tone={liftCount > 0 ? 'blue' : 'muted'}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside className="flex min-h-0 flex-col gap-4">
        <section className="min-h-0 flex-1 rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">friends online</div>
            <div className="font-mono text-[10px] text-amber">
              {activeFriends.length} active
            </div>
          </div>
          {activeFriends.length === 0 ? (
            <div className="flex h-[calc(100%-36px)] items-center justify-center text-center font-mono text-[10px] text-ink-faint">
              no friends online right now
            </div>
          ) : (
            <div className="flex max-h-full flex-col gap-2 overflow-hidden">
              {activeFriends.slice(0, 6).map((f) => {
                const live = liveStates.get(f.id);
                const activity = live?.workflowGroup ?? f.current_activity ?? 'in session';
                const elapsedFrom = live?.sessionStartedAt ?? (f.hardware_status === 'docked' ? f.last_ping : undefined);
                return (
                  <div key={f.id} className="flex items-center gap-2.5 rounded border border-line/70 bg-white/[0.02] px-2.5 py-2">
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
        </section>

        <section className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-2.5 flex items-center gap-1.5">
            <SparkIcon />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber">
              gemma / insight
            </span>
          </div>
          <div className="max-h-28 overflow-hidden font-serif text-sm italic leading-relaxed text-ink-dim">
            {insightLoading ? 'asking gemma...' : agentInsight}
          </div>
        </section>
      </aside>
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

function DetailMetric({
  label,
  value,
  tone = 'muted',
  active = false,
}: {
  label: string;
  value: string;
  tone?: 'amber' | 'blue' | 'muted';
  active?: boolean;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-deeper/60 px-4 py-3">
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </div>
      <div className="flex items-center gap-2">
        {active && <span className="h-1.5 w-1.5 animate-pulse-fast rounded-full bg-amber" />}
        <strong
          className={cn(
            'font-serif text-2xl font-normal italic',
            tone === 'amber' && 'text-amber',
            tone === 'blue' && 'text-cool-blue',
            tone === 'muted' && 'text-ink',
          )}
        >
          {value}
        </strong>
      </div>
    </div>
  );
}
