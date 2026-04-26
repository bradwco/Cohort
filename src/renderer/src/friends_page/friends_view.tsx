import { useEffect, useRef, useState } from 'react';
import { PixelOrbMini } from '../orb_character/pixel_orb_mini';
import { PixelAvatar } from '../components/onboarding/pixel_avatar';
import { cn } from '../shared_ui/cn';
import type { AvatarTraits } from '../state/onboarding';
import { supabase } from '../lib/supabase_auth';

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

type CohortRow = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
};

type CohortMemberRow = ProfileRow & { streak: number };

type FriendRequestRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester?: ProfileRow | null;
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

function formatElapsed(startedAt?: string): string {
  if (!startedAt) return 'live now';
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

async function leaveCohortDirect(userId: string, cohortId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('cohort_members')
    .delete()
    .eq('cohort_id', cohortId)
    .eq('user_id', userId);
  if (error) {
    console.error('[leaveCohort] authenticated delete error:', error.message);
    return false;
  }

  const { data, error: verifyError } = await supabase
    .from('cohort_members')
    .select('cohort_id')
    .eq('cohort_id', cohortId)
    .eq('user_id', userId)
    .limit(1);
  if (verifyError) {
    console.error('[leaveCohort] authenticated verify error:', verifyError.message);
    return false;
  }

  return (data ?? []).length === 0;
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
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [cohortName, setCohortName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [cohortStatus, setCohortStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [copiedCohortId, setCopiedCohortId] = useState<string | null>(null);
  const [leavingCohortId, setLeavingCohortId] = useState<string | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [cohortMembersMap, setCohortMembersMap] = useState<Map<string, CohortMemberRow[]>>(new Map());
  const [loadingCohortId, setLoadingCohortId] = useState<string | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequestRow[]>([]);
  const [sharedCohortProfiles, setSharedCohortProfiles] = useState<ProfileRow[]>([]);

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
    void Promise.all([
      window.api.getProfile(userId),
      window.api.getFriends(userId),
      window.api.getFriendRequests(userId),
      window.api.getSharedCohortProfiles(userId),
    ]).then(([profile, rows, requests, sharedProfiles]) => {
      setMe((profile as ProfileRow | null) ?? null);
      setProfiles((rows as ProfileRow[]) ?? []);
      setFriendRequests((requests as FriendRequestRow[]) ?? []);
      setSharedCohortProfiles((sharedProfiles as ProfileRow[]) ?? []);
    });
    void window.api.getCohorts(userId).then((rows) => setCohorts((rows as CohortRow[]) ?? []));
  }, [userId]);

  useEffect(() => {
    if (!window.api) return;
    const ids = Array.from(new Set([...profiles, ...sharedCohortProfiles].map((p) => p.id)));
    if (ids.length === 0) return;
    void window.api.subscribeFriends(ids);
  }, [profiles, sharedCohortProfiles]);

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
    const request = await window.api.sendFriendRequest(userId, (searchResult as ProfileRow).id);
    if (request) {
      setAddStatus('done');
      setSearchInput('');
      setSearchResult(null);
    } else {
      setAddStatus('error');
    }
  }

  async function handleAcceptRequest(request: FriendRequestRow) {
    if (!userId) return;
    const ok = await window.api.acceptFriendRequest(userId, request.id);
    if (!ok) return;
    setFriendRequests((prev) => prev.filter((item) => item.id !== request.id));
    if (request.requester) {
      setProfiles((prev) => (
        prev.some((profile) => profile.id === request.requester!.id)
          ? prev
          : [...prev, request.requester!]
      ));
    } else {
      const rows = await window.api.getFriends(userId);
      setProfiles((rows as ProfileRow[]) ?? []);
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

  async function handleCreateCohort() {
    if (!userId || !cohortName.trim()) return;
    setCohortStatus('saving');
    const cohort = await window.api.createCohort(userId, cohortName.trim()) as CohortRow | null;
    if (cohort) {
      setCohorts((prev) => [cohort, ...prev.filter((item) => item.id !== cohort.id)]);
      setCohortName('');
      setCohortStatus('idle');
    } else {
      setCohortStatus('error');
    }
  }

  async function handleJoinCohort() {
    if (!userId || !joinCode.trim()) return;
    setCohortStatus('saving');
    const cohort = await window.api.joinCohort(userId, joinCode.trim()) as CohortRow | null;
    if (cohort) {
      const rows = await window.api.getCohorts(userId);
      setCohorts((rows as CohortRow[]) ?? [cohort]);
      const sharedProfiles = await window.api.getSharedCohortProfiles(userId);
      setSharedCohortProfiles((sharedProfiles as ProfileRow[]) ?? []);
      setJoinCode('');
      setCohortStatus('idle');
    } else {
      setCohortStatus('error');
    }
  }

  async function handleLeaveCohort(cohort: CohortRow) {
    if (!userId || !window.api) return;

    setLeavingCohortId(cohort.id);
    setCohortStatus('saving');
    try {
      let ok = await window.api.leaveCohort(userId, cohort.id);
      if (!ok) {
        ok = await leaveCohortDirect(userId, cohort.id);
      }
      if (!ok) {
        setCohortStatus('error');
        return;
      }

      if (selectedCohortId === cohort.id) setSelectedCohortId(null);
      setCohortMembersMap((prev) => {
        const next = new Map(prev);
        next.delete(cohort.id);
        return next;
      });

      const [rows, sharedProfiles] = await Promise.all([
        window.api.getCohorts(userId),
        window.api.getSharedCohortProfiles(userId),
      ]);
      setCohorts((rows as CohortRow[]) ?? []);
      setSharedCohortProfiles((sharedProfiles as ProfileRow[]) ?? []);
      setCohortStatus('idle');
    } catch (err) {
      console.error('[leaveCohort] server error:', err);
      setCohortStatus('error');
    } finally {
      setLeavingCohortId(null);
    }
  }

  async function handleToggleCohort(cohort: CohortRow) {
    if (selectedCohortId === cohort.id) {
      setSelectedCohortId(null);
      return;
    }
    setSelectedCohortId(cohort.id);
    if (cohortMembersMap.has(cohort.id)) return;
    setLoadingCohortId(cohort.id);
    const members = await window.api.getCohortMembers(cohort.id);
    const memberList = (members as CohortMemberRow[]) ?? [];
    setCohortMembersMap((prev) => {
      const next = new Map(prev);
      next.set(cohort.id, memberList);
      return next;
    });
    if (memberList.length > 0 && window.api) {
      void window.api.subscribeFriends(memberList.map((m) => m.id));
    }
    setLoadingCohortId(null);
  }

  async function handleCopyCohort(cohort: CohortRow) {
    try {
      await navigator.clipboard.writeText(`COHORT-${cohort.invite_code}`);
    } catch {
      // Clipboard may be unavailable in some Electron contexts; still reflect the click.
    }
    setCopiedCohortId(cohort.id);
    window.setTimeout(() => setCopiedCohortId(null), 1400);
  }

  const onlineCount = profiles.filter((p) => {
    const live = liveStates.get(p.id);
    return live?.status === 'docked' || live?.status === 'undocked' || p.hardware_status === 'docked';
  }).length;
  const cohortOnlineCount = sharedCohortProfiles.filter((p) => {
    const live = liveStates.get(p.id);
    return live?.status === 'docked' || live?.status === 'undocked' || p.hardware_status === 'docked';
  }).length;

  const acceptedIds = new Set(profiles.map((profile) => profile.id));
  const cohortCandidates = sharedCohortProfiles.filter((profile) => !acceptedIds.has(profile.id));

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
                {addStatus === 'adding' ? 'sending...' : addStatus === 'done' ? 'sent' : addStatus === 'error' ? 'join same cohort first' : 'request'}
              </button>
            </div>
          )}
        </div>

        {/* Pending requests */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">pending requests</div>
            <div className="font-mono text-[10px] text-ink-faint">{friendRequests.length}</div>
          </div>
          {friendRequests.length === 0 ? (
            <div className="py-3 text-center font-mono text-[10px] text-ink-faint">
              no pending requests
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {friendRequests.map((request) => (
                <div key={request.id} className="flex items-center gap-3 rounded border border-line bg-white/[0.02] px-3 py-2">
                  <ProfileAvatar profile={request.requester ?? undefined} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif text-sm italic">@{request.requester?.username ?? 'cohort user'}</div>
                    <div className="font-mono text-[9px] text-ink-faint">wants to focus with you</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAcceptRequest(request)}
                    className="rounded border border-amber/40 bg-amber/10 px-2.5 py-1 font-mono text-[10px] text-amber"
                  >
                    accept
                  </button>
                </div>
              ))}
            </div>
          )}
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
                    <ProfileAvatar profile={p} color={color} pulse={status === 'online'} flash={nudged} />
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-sm italic">@{p.username}</div>
                      <div className="font-mono text-[9px] text-ink-faint">{task}</div>
                      {status !== 'offline' && (
                        <div className="font-mono text-[9px] text-amber">
                          {formatElapsed(live?.sessionStartedAt ?? p.last_ping)}
                        </div>
                      )}
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
        {/* Create Cohort */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">create cohort</div>
            <button
              type="button"
              onClick={handleCreateCohort}
              disabled={!cohortName.trim() || cohortStatus === 'saving'}
              className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-amber disabled:opacity-40"
            >
              + create
            </button>
          </div>

          <input
            value={cohortName}
            onChange={(event) => {
              setCohortName(event.target.value);
              setCohortStatus('idle');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleCreateCohort();
            }}
            maxLength={32}
            placeholder="new cohort name"
            className="w-full rounded border border-line-mid bg-bg-deeper/60 px-3 py-2 font-mono text-[11px] text-ink placeholder-ink-faint outline-none focus:border-amber/40"
          />
          <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
            creates a random 6-character join code
          </div>
        </div>

        {/* Join Cohort */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">join cohort</div>
            <button
              type="button"
              onClick={() => void handleJoinCohort()}
              disabled={!joinCode.trim() || cohortStatus === 'saving'}
              className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-amber disabled:opacity-40"
            >
              join
            </button>
          </div>
          <input
            value={joinCode}
            onChange={(event) => {
              setJoinCode(event.target.value.toUpperCase());
              setCohortStatus('idle');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleJoinCohort();
            }}
            placeholder="paste join code"
            className="w-full rounded border border-line-mid bg-bg-deeper/60 px-3 py-2 font-mono text-[11px] uppercase text-ink placeholder-ink-faint outline-none focus:border-amber/40"
          />
          {cohortStatus === 'error' && (
            <div className="mt-2 font-mono text-[10px] text-amber">
              couldn't save cohort
            </div>
          )}
        </div>

        {/* My Cohorts */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">my cohorts</div>
            <div className="font-mono text-[10px] text-ink-faint">{cohorts.length}</div>
          </div>
          {cohorts.length === 0 ? (
            <div className="py-3 text-center font-mono text-[10px] text-ink-faint">
              create a cohort to group focus sessions
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cohorts.map((cohort) => {
                const isOpen = selectedCohortId === cohort.id;
                const members = cohortMembersMap.get(cohort.id);
                const loading = loadingCohortId === cohort.id;
                return (
                  <div key={cohort.id} className="rounded border border-line bg-white/[0.02]">
                    <div className="flex items-start gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleCohort(cohort)}
                        className="min-w-0 flex-1 text-left transition-colors hover:opacity-80"
                      >
                        <div className="truncate font-serif text-sm italic text-ink">{cohort.name}</div>
                        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                          {cohort.member_count ?? 1} member{(cohort.member_count ?? 1) === 1 ? '' : 's'}
                          {' · '}
                          <span className="text-amber/70">{isOpen ? 'collapse ▲' : 'view members ▼'}</span>
                        </div>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => void handleCopyCohort(cohort)}
                          className="rounded border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:border-amber/40 hover:text-amber"
                        >
                          {copiedCohortId === cohort.id ? 'copied' : cohort.invite_code}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleLeaveCohort(cohort)}
                          disabled={leavingCohortId === cohort.id}
                          className="rounded border border-line px-2 py-1 font-mono text-[9px] text-ink-faint transition-colors hover:border-red-500/40 hover:text-red-400"
                        >
                          {leavingCohortId === cohort.id ? 'leaving' : 'leave'}
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-line px-3 pb-2 pt-2">
                        {loading && (
                          <div className="py-2 text-center font-mono text-[9px] text-ink-faint">loading...</div>
                        )}
                        {!loading && members && members.length === 0 && (
                          <div className="py-2 text-center font-mono text-[9px] text-ink-faint">no members found</div>
                        )}
                        {!loading && members && members.map((member) => {
                          const live = liveStates.get(member.id);
                          const memberStatus = live?.status === 'docked' ? 'online'
                            : live?.status === 'undocked' ? 'paused'
                            : member.hardware_status === 'docked' ? 'online'
                            : 'offline';
                          const task = memberStatus === 'online' ? (live?.workflowGroup ?? member.current_activity ?? 'in session')
                            : memberStatus === 'paused' ? 'paused'
                            : 'offline';
                          const elapsed = memberStatus !== 'offline'
                            ? formatElapsed(live?.sessionStartedAt ?? (member.hardware_status === 'docked' ? member.last_ping : undefined))
                            : null;
                          return (
                            <div
                              key={member.id}
                              className={cn('flex items-center gap-2.5 py-1.5', memberStatus === 'offline' && 'opacity-50')}
                            >
                              <ProfileAvatar profile={member} color={member.orb_color ?? '#3a3d4a'} pulse={memberStatus === 'online'} size={26} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-serif text-sm italic">@{member.username}</div>
                                <div className="font-mono text-[9px] text-ink-faint">{task}</div>
                                {elapsed && (
                                  <div className="font-mono text-[9px] text-amber">{elapsed}</div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={cn(
                                  'font-mono text-[9px] uppercase tracking-[0.1em]',
                                  memberStatus === 'online' ? 'text-amber' : memberStatus === 'paused' ? 'text-blue-400' : 'text-ink-faint',
                                )}>
                                  {memberStatus}
                                </span>
                                {member.streak > 0 && (
                                  <span className="font-mono text-[9px] text-ink-faint">{member.streak}d</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cohortCandidates.length > 0 && (
          <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
            <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
              <div className="font-serif text-base italic">same cohort</div>
              <div className="font-mono text-[10px] text-ink-faint">{cohortCandidates.length}</div>
            </div>
            <div className="flex flex-col gap-2">
              {cohortCandidates.slice(0, 4).map((profile) => (
                <div key={profile.id} className="flex items-center gap-2 rounded border border-line bg-white/[0.02] px-2 py-2">
                  <ProfileAvatar profile={profile} color={profile.orb_color ?? '#3a3d4a'} />
                  <span className="min-w-0 flex-1 truncate font-serif text-sm italic">@{profile.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active cohort sessions */}
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2.5">
            <div className="font-serif text-base italic">active sessions</div>
            <span className="font-mono text-[10px] text-amber">
              {cohortOnlineCount} live
            </span>
          </div>
          {sharedCohortProfiles.filter((p) => {
            const s = liveStates.get(p.id);
            return s?.status === 'docked' || p.hardware_status === 'docked';
          }).length === 0 ? (
            <div className="py-3 text-center font-mono text-[10px] text-ink-faint">
              no active sessions
            </div>
          ) : (
            sharedCohortProfiles
              .filter((p) => liveStates.get(p.id)?.status === 'docked' || p.hardware_status === 'docked')
              .map((p) => {
                const live = liveStates.get(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2 py-2">
                    <ProfileAvatar profile={p} color={p.orb_color ?? '#3a3d4a'} pulse size={24} />
                    <span className="font-serif text-sm italic">{p.username}</span>
                    <span className="ml-auto text-right font-mono text-[9px] text-ink-faint">
                      <span className="block text-ink-dim">{live?.workflowGroup ?? p.current_activity ?? 'in session'}</span>
                      <span className="block text-amber">{formatElapsed(live?.sessionStartedAt ?? p.last_ping)}</span>
                    </span>
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
                  <ProfileAvatar profile={p} color={p.orb_color ?? '#3a3d4a'} />
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

function ProfileAvatar({
  profile,
  color,
  pulse = false,
  flash = false,
  size = 30,
}: {
  profile?: ProfileRow;
  color?: string;
  pulse?: boolean;
  flash?: boolean;
  size?: number;
}) {
  if (profile?.avatar) {
    return (
      <div
        className={cn('shrink-0', pulse && 'animate-pulse')}
        style={{ width: size, height: size }}
      >
        <PixelAvatar avatar={profile.avatar} size={size} />
      </div>
    );
  }

  return <PixelOrbMini color={color} pulse={pulse} flash={flash} />;
}
