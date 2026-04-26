import { useEffect, useRef, useState } from 'react';
import { Section } from '../shared_ui/section';
import { FriendCard, type Friend } from '../friends/friend_card';

type ProfileRow = {
  id: string;
  username: string;
  orb_color: string;
  hardware_status: 'docked' | 'offline';
  current_activity: string;
  last_ping: string;
};

type LiveState = {
  status: 'docked' | 'undocked' | 'offline';
  workflowGroup?: string;
  totalPauseMs?: number;
  pauseStart?: number;
  sessionStartedAt?: string;
  plannedDurationMinutes?: number;
  pickupCount: number;
};

type NudgeEvent = {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  sentAt: string;
};

function getFriendRemainingSeconds(live?: LiveState): number | null {
  if (!live?.sessionStartedAt || !live.plannedDurationMinutes) return null;

  const startedAtMs = Date.parse(live.sessionStartedAt);
  if (Number.isNaN(startedAtMs)) return null;

  const totalSessionMs = live.plannedDurationMinutes * 60 * 1000;
  const totalPauseMs = live.totalPauseMs ?? 0;
  const effectiveNow = live.status === 'undocked' && live.pauseStart != null ? live.pauseStart : Date.now();
  const activeElapsedMs = Math.max(0, effectiveNow - startedAtMs - totalPauseMs);

  return Math.max(0, Math.ceil((totalSessionMs - activeElapsedMs) / 1000));
}

function profileToFriend(p: ProfileRow, live?: LiveState): Friend {
  const state =
    live?.status === 'undocked'
      ? 'pause'
      : live?.status === 'docked'
        ? 'docked'
        : p.hardware_status === 'docked'
          ? 'docked'
          : 'offline';

  return {
    id: p.id,
    name: p.username,
    task:
      state === 'docked'
        ? live?.workflowGroup ?? p.current_activity
        : state === 'pause'
          ? 'paused'
          : 'offline',
    rem: getFriendRemainingSeconds(live),
    color: p.orb_color ?? null,
    state,
    pickup: live?.pickupCount ?? null,
  };
}

type Props = {
  userId: string | null;
  fmt: (s: number) => string;
};

export function DeskMap({ userId, fmt }: Props) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ProfileRow | null>(null);
  const [liveStates, setLiveStates] = useState<Map<string, LiveState>>(new Map());
  const [recentNudges, setRecentNudges] = useState<Record<string, number>>({});
  const [nudgeFeed, setNudgeFeed] = useState<NudgeEvent[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResult, setSearchResult] = useState<ProfileRow | null | 'not-found' | 'searching'>(null);
  const [addStatus, setAddStatus] = useState<'idle' | 'adding' | 'done' | 'error'>('idle');
  const [, setNowTick] = useState(Date.now());
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!userId || !window.api) return;

    void Promise.all([window.api.getProfile(userId), window.api.getFriends(userId)]).then(([me, rows]) => {
      setCurrentProfile((me as ProfileRow | null) ?? null);
      setProfiles((rows as ProfileRow[]) ?? []);
    });
  }, [userId]);

  useEffect(() => {
    if (!window.api || profiles.length === 0) return;
    void window.api.subscribeFriends(profiles.map((profile) => profile.id));
  }, [profiles]);

  useEffect(() => {
    if (!window.api) return;

    const cleanup = window.api.onFriendState((raw) => {
      const data = raw as {
        userId: string;
        status: string;
        workflowGroup?: string;
        totalPauseMs?: number;
        pauseStart?: number;
        sessionStartedAt?: string;
        plannedDurationMinutes?: number;
      };

      setLiveStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId) ?? { status: 'offline', pickupCount: 0 };
        const wasActive = existing.status !== 'offline';
        const pickupCount = data.status === 'undocked' && wasActive ? existing.pickupCount + 1 : existing.pickupCount;

        next.set(data.userId, {
          status: data.status as LiveState['status'],
          workflowGroup: data.workflowGroup ?? existing.workflowGroup,
          totalPauseMs: data.totalPauseMs ?? existing.totalPauseMs,
          pauseStart: data.pauseStart,
          sessionStartedAt: data.sessionStartedAt ?? existing.sessionStartedAt,
          plannedDurationMinutes: data.plannedDurationMinutes ?? existing.plannedDurationMinutes,
          pickupCount,
        });

        return next;
      });
    });

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!window.api || !userId) return;

    const cleanup = window.api.onFriendNudge((raw) => {
      const data = raw as Omit<NudgeEvent, 'id'>;
      if (data.toUserId !== userId) return;

      const id = `${data.fromUserId}-${data.sentAt}`;
      setNudgeFeed((prev) => [{ ...data, id }, ...prev].slice(0, 3));
      setRecentNudges((prev) => ({ ...prev, [data.fromUserId]: Date.now() }));

      window.setTimeout(() => {
        setRecentNudges((prev) => {
          const next = { ...prev };
          delete next[data.fromUserId];
          return next;
        });
      }, 5000);
    });

    return () => {
      cleanup();
    };
  }, [userId]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchInput(val);
    setSearchResult(null);
    setAddStatus('idle');
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) return;

    searchTimeout.current = setTimeout(async () => {
      setSearchResult('searching');
      const result = await window.api.searchProfile(val.trim());
      setSearchResult((result as ProfileRow | null) ?? 'not-found');
    }, 400);
  }

  async function handleAdd() {
    if (!userId || !searchResult || searchResult === 'not-found' || searchResult === 'searching') return;

    setAddStatus('adding');
    const request = await window.api.sendFriendRequest(userId, (searchResult as ProfileRow).id);

    if (request) {
      setAddStatus('done');
      setSearchInput('');
      setSearchResult(null);
    } else {
      setAddStatus('error');
    }
  }

  async function handleSendNudge(friend: Friend) {
    if (!userId || !currentProfile) return;
    await window.api.sendFriendNudge(userId, friend.id, currentProfile.username || currentProfile.id);
  }

  const friends: Friend[] = profiles.map((p) => profileToFriend(p, liveStates.get(p.id)));
  const docked = friends.filter((f) => f.state === 'docked').length;

  return (
    <Section
      title="desk map"
      meta={
        <>
          <span className="text-amber">{docked}</span> docked · {friends.length - docked} offline
        </>
      }
    >
      {nudgeFeed.length > 0 && (
        <div className="mb-4 space-y-2">
          {nudgeFeed.map((nudge) => (
            <div
              key={nudge.id}
              className="rounded border border-amber/25 bg-amber/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber"
            >
              {nudge.fromName} nudged you
            </div>
          ))}
        </div>
      )}

      <div className="mb-5">
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
          add a friend by their cohort username
        </div>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-ink-faint">
              @
            </span>
            <input
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="username"
              className="w-full rounded border border-line-mid bg-white/[0.03] py-1.5 pl-6 pr-3 font-mono text-[11px] text-ink placeholder-ink-faint outline-none focus:border-amber/40"
            />
          </div>
          {searchResult === 'searching' && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded border border-line bg-bg-deeper/95 px-3 py-2 font-mono text-[10px] text-ink-faint backdrop-blur">
              searching...
            </div>
          )}
          {searchResult && searchResult !== 'searching' && searchResult !== 'not-found' && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 flex items-center justify-between rounded border border-line bg-bg-deeper/95 px-3 py-2 backdrop-blur">
              <div>
                <span className="font-mono text-[11px] text-ink">@{(searchResult as ProfileRow).username}</span>
                {addStatus === 'error' && (
                  <span className="ml-2 font-mono text-[9px] text-red-400">same cohort required</span>
                )}
              </div>
              <button
                onClick={handleAdd}
                disabled={addStatus === 'adding' || addStatus === 'done'}
                className="rounded border border-amber/40 bg-amber/10 px-2.5 py-1 font-mono text-[10px] text-amber transition-opacity disabled:opacity-50"
              >
                {addStatus === 'adding' ? 'sending...' : addStatus === 'done' ? 'sent' : 'request'}
              </button>
            </div>
          )}
          {searchResult === 'not-found' && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded border border-line bg-bg-deeper/95 px-3 py-2 font-mono text-[10px] text-ink-faint backdrop-blur">
              no user found with that username
            </div>
          )}
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="py-10 text-center font-mono text-[11px] text-ink-faint">
          no friends yet - add one above
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {friends.map((friend, i) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              delay={i * 60}
              fmt={fmt}
              incomingNudge={Boolean(recentNudges[friend.id])}
              onNudge={handleSendNudge}
            />
          ))}
        </div>
      )}
    </Section>
  );
}
