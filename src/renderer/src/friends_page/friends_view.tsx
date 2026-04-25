import { useEffect, useRef, useState } from 'react';
import { PixelOrbMini } from '../orb_character/pixel_orb_mini';
import { cn } from '../shared_ui/cn';

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
  sessionStartedAt?: string;
  plannedDurationMinutes?: number;
  totalPauseMs?: number;
  pickupCount: number;
};

type NudgeEvent = {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  sentAt: string;
};

function getFriendStatus(p: ProfileRow, live?: LiveState): 'online' | 'paused' | 'offline' {
  if (live?.status === 'docked') return 'online';
  if (live?.status === 'undocked') return 'paused';
  return p.hardware_status === 'docked' ? 'online' : 'offline';
}

function getFriendTask(p: ProfileRow, live?: LiveState, status?: string): string {
  if (status === 'online') return live?.workflowGroup ?? p.current_activity ?? 'in session';
  if (status === 'paused') return 'paused';
  return 'offline';
}

type Props = {
  userId: string | null;
};

export function FriendsView({ userId }: Props) {
  const [me, setMe] = useState<ProfileRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [liveStates, setLiveStates] = useState<Map<string, LiveState>>(new Map());
  const [nudgeFeed, setNudgeFeed] = useState<NudgeEvent[]>([]);
  const [recentNudges, setRecentNudges] = useState<Record<string, number>>({});
  const [inviteCopied, setInviteCopied] = useState(false);
  const [cohorts, setCohorts] = useState<string[]>([]);

  const [searchInput, setSearchInput] = useState('');
  const [searchResult, setSearchResult] = useState<ProfileRow | null | 'not-found' | 'searching'>(null);
  const [addStatus, setAddStatus] = useState<'idle' | 'adding' | 'done' | 'error'>('idle');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [, setNowTick] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userId || !window.api) return;
    void Promise.all([window.api.getProfile(userId), window.api.getFriends(userId)]).then(([profile, rows]) => {
      setMe((profile as ProfileRow | null) ?? null);
      setProfiles((rows as ProfileRow[]) ?? []);
    });
  }, [userId]);

  useEffect(() => {
    if (!window.api || profiles.length === 0) return;
    void window.api.subscribeFriends(profiles.map((p) => p.id));
  }, [profiles]);

  useEffect(() => {
    if (!window.api) return;
    const cleanup = window.api.onFriendState((raw) => {
      const data = raw as { userId: string; status: string; workflowGroup?: string; totalPauseMs?: number; sessionStartedAt?: string; plannedDurationMinutes?: number };
      setLiveStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId) ?? { status: 'offline', pickupCount: 0 };
        const wasActive = existing.status !== 'offline';
        const pickupCount = data.status === 'undocked' && wasActive ? existing.pickupCount + 1 : existing.pickupCount;
        next.set(data.userId, {
          status: data.status as LiveState['status'],
          workflowGroup: data.workflowGroup ?? existing.workflowGroup,
          totalPauseMs: data.totalPauseMs ?? existing.totalPauseMs,
          sessionStartedAt: data.sessionStartedAt ?? existing.sessionStartedAt,
          plannedDurationMinutes: data.plannedDurationMinutes ?? existing.plannedDurationMinutes,
          pickupCount,
        });
        return next;
      });
    });
    return () => { cleanup(); };
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
    return () => { cleanup(); };
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
    const ok = await window.api.addFriend(userId, (searchResult as ProfileRow).id);
    if (ok) {
      setProfiles((prev) => {
        if (prev.some((p) => p.id === (searchResult as ProfileRow).id)) return prev;
        return [...prev, searchResult as ProfileRow];
      });
      setAddStatus('done');
      setSearchInput('');
      setSearchResult(null);
    } else {
      setAddStatus('error');
    }
  }

  async function handleNudge(friendId: string, friendUsername: string) {
    if (!userId || !window.api) return;
    await window.api.sendFriendNudge(userId, friendId, friendUsername);
  }

  async function handleCopyInvite() {
    const code = userId ? `COHORT-${userId.slice(0, 4).toUpperCase()}` : 'COHORT-LOCAL';
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard may be unavailable in some Electron contexts; still reflect the click.
    }
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1400);
  }

  function handleCreateCohort() {
    setCohorts((prev) => [...prev, `Focus Room ${prev.length + 1}`]);
  }

  const onlineCount = profiles.filter((p) => {
    const live = liveStates.get(p.id);
    return live?.status === 'docked' || live?.status === 'undocked' || p.hardware_status === 'docked';
  }).length;

  const leaderboard = [...(me ? [{ ...me, username: `${me.username} (you)` }] : []), ...profiles]
    .map((p, i) => ({
      ...p,
      streak: (i % 3 === 0 ? 14 : i % 3 === 1 ? 8 : 3) + i,
      sessions: 20 + i * 3,
    }))
    .sort((a, b) => b.streak - a.streak);

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6">
      {/* Left column */}
      <div className="flex flex-col gap-5">
        {/* Nudge feed */}
        {nudgeFeed.length > 0 && (
          <div className="flex flex-col gap-2">
            {nudgeFeed.map((n) => (
              <div key={n.id} className="rounded border border-amber/25 bg-amber/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber">
                {n.fromName} nudged you
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            search friends by username
          </div>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-ink-faint">@</span>
              <input
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="username"
                className="w-full rounded border border-line-mid bg-bg-deeper/60 py-2 pl-6 pr-3 font-mono text-[11px] text-ink placeholder-ink-faint outline-none focus:border-amber/40"
              />
            </div>
          </div>
          {searchResult === 'searching' && (
            <div className="mt-2 font-mono text-[10px] text-ink-faint">searching...</div>
          )}
          {searchResult === 'not-found' && (
            <div className="mt-2 font-mono text-[10px] text-ink-faint">no user found</div>
          )}
          {searchResult && searchResult !== 'searching' && searchResult !== 'not-found' && (
            <div className="mt-2 flex items-center justify-between rounded border border-line bg-white/[0.02] px-3 py-2">
              <span className="font-mono text-[11px] text-ink">@{(searchResult as ProfileRow).username}</span>
              <button
                onClick={() => void handleAdd()}
                disabled={addStatus === 'adding' || addStatus === 'done'}
                className="rounded border border-amber/40 bg-amber/10 px-2.5 py-1 font-mono text-[10px] text-amber transition-opacity disabled:opacity-50"
              >
                {addStatus === 'adding' ? 'adding...' : addStatus === 'done' ? 'added' : addStatus === 'error' ? 'already friends?' : '+ add'}
              </button>
            </div>
          )}
        </div>

        {/* Pending requests */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">pending requests</div>
            <div className="font-mono text-[10px] text-ink-faint">0</div>
          </div>
          <div className="py-3 text-center font-mono text-[10px] text-ink-faint">
            no pending requests
          </div>
        </div>

        {/* Invite by code */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">invite a friend</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">invite code</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded border border-line bg-white/[0.02] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim">
              {userId ? `COHORT-${userId.slice(0, 4).toUpperCase()}` : 'COHORT-LOCAL'}
            </div>
            <button
              type="button"
              onClick={() => void handleCopyInvite()}
              className="rounded border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:border-amber/40 hover:text-amber"
            >
              {inviteCopied ? 'copied' : 'copy'}
            </button>
          </div>
        </div>

        {/* Friends list */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">friends</div>
            <div className="font-mono text-[10px] text-amber">
              {onlineCount} online / {profiles.length} total
            </div>
          </div>
          {profiles.length === 0 ? (
            <div className="py-6 text-center font-mono text-[10px] text-ink-faint">
              no friends yet - add one above
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {profiles.map((p) => {
                const live = liveStates.get(p.id);
                const status = getFriendStatus(p, live);
                const task = getFriendTask(p, live, status);
                const color = p.orb_color ?? '#3a3d4a';
                const nudged = Boolean(recentNudges[p.id]);
                return (
                  <div key={p.id} className={cn('flex items-center gap-3 py-3', status === 'offline' && 'opacity-50')}>
                    <PixelOrbMini color={color} pulse={status === 'online'} flash={nudged} />
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-sm italic">@{p.username}</div>
                      <div className="font-mono text-[9px] text-ink-faint">{task}</div>
                      {nudged && (
                        <div className="font-mono text-[9px] text-amber">nudged you just now</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-mono text-[9px] uppercase tracking-[0.1em]',
                          status === 'online' ? 'text-amber' : status === 'paused' ? 'text-blue-400' : 'text-ink-faint',
                        )}
                      >
                        {status}
                      </span>
                      {status !== 'offline' && (
                        <button
                          type="button"
                          onClick={() => void handleNudge(p.id, p.username)}
                          className="rounded border border-line px-2 py-0.5 font-mono text-[9px] text-ink-faint transition-colors hover:border-amber/40 hover:text-amber"
                        >
                          nudge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-5">
        {/* My Cohorts */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">my cohorts</div>
            <button
              type="button"
              onClick={handleCreateCohort}
              className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-amber"
            >
              + create
            </button>
          </div>
          {cohorts.length === 0 ? (
            <div className="py-3 text-center font-mono text-[10px] text-ink-faint">
              create a cohort to group focus sessions
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cohorts.map((cohort) => (
                <div
                  key={cohort}
                  className="rounded border border-line bg-white/[0.02] px-3 py-2 font-serif text-sm italic text-ink"
                >
                  {cohort}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active cohort sessions */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">active sessions</div>
            <span className="font-mono text-[10px] text-amber">
              {onlineCount} live
            </span>
          </div>
          {profiles.filter((p) => {
            const s = liveStates.get(p.id);
            return s?.status === 'docked';
          }).length === 0 ? (
            <div className="py-3 text-center font-mono text-[10px] text-ink-faint">
              no active sessions
            </div>
          ) : (
            profiles
              .filter((p) => liveStates.get(p.id)?.status === 'docked')
              .map((p) => {
                const live = liveStates.get(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2 py-2">
                    <span className="h-1.5 w-1.5 animate-pulse-fast rounded-full bg-amber shadow-[0_0_6px_#E8A87C]" />
                    <span className="font-serif text-sm italic">{p.username}</span>
                    <span className="ml-auto font-mono text-[9px] text-ink-faint">{live?.workflowGroup ?? '--'}</span>
                  </div>
                );
              })
          )}
        </div>

        {/* Leaderboard */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">leaderboard</div>
            <div className="font-mono text-[9px] text-ink-faint">streak / sessions</div>
          </div>
          {leaderboard.length === 0 ? (
            <div className="py-3 text-center font-mono text-[10px] text-ink-faint">
              add friends to see the leaderboard
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {leaderboard.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center gap-2.5 rounded px-2 py-1.5">
                  <span className="w-4 font-mono text-[10px] text-ink-faint">#{i + 1}</span>
                  <PixelOrbMini color={p.orb_color ?? '#3a3d4a'} />
                  <span className="flex-1 truncate font-serif text-sm italic">{p.username}</span>
                  <span className="font-mono text-[10px] text-amber">{p.streak}d</span>
                  <span className="font-mono text-[10px] text-ink-faint">{p.sessions}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
