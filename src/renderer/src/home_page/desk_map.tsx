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
  pickupCount: number;
};

function profileToFriend(p: ProfileRow, live?: LiveState): Friend {
  const state =
    live?.status === 'undocked' ? 'pause' : live?.status === 'docked' ? 'docked' : 'offline';
  return {
    name: p.username,
    task:
      state === 'docked'
        ? live?.workflowGroup ?? p.current_activity
        : state === 'pause'
          ? 'paused'
          : 'offline',
    rem: state !== 'offline' ? 3600 : null,
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
  const [liveStates, setLiveStates] = useState<Map<string, LiveState>>(new Map());
  const [searchInput, setSearchInput] = useState('');
  const [searchResult, setSearchResult] = useState<ProfileRow | null | 'not-found' | 'searching'>(
    null,
  );
  const [addStatus, setAddStatus] = useState<'idle' | 'adding' | 'done' | 'error'>('idle');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId || !window.api) return;
    window.api
      .getFriends(userId)
      .then((rows) => setProfiles((rows as ProfileRow[]) ?? []));
  }, [userId]);

  useEffect(() => {
    if (!window.api) return;
    return window.api.onFriendState((raw) => {
      const data = raw as { userId: string; status: string; workflowGroup?: string; totalPauseMs?: number };
      setLiveStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId) ?? { status: 'offline', pickupCount: 0 };
        const wasActive = existing.status !== 'offline';
        const pickupCount =
          data.status === 'undocked' && wasActive
            ? existing.pickupCount + 1
            : existing.pickupCount;
        next.set(data.userId, {
          status: data.status as LiveState['status'],
          workflowGroup: data.workflowGroup,
          totalPauseMs: data.totalPauseMs,
          pickupCount,
        });
        return next;
      });
    });
  }, []);

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
      {/* Add friend row */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="add friend by username…"
            className="w-full rounded border border-line-mid bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-ink placeholder-ink-faint outline-none focus:border-amber/40"
          />
          {searchResult && searchResult !== 'searching' && searchResult !== 'not-found' && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded border border-line bg-bg-deeper/95 px-3 py-2 backdrop-blur">
              <span className="font-mono text-[11px] text-ink">{(searchResult as ProfileRow).username}</span>
              <button
                onClick={handleAdd}
                disabled={addStatus === 'adding'}
                className="ml-3 font-mono text-[10px] text-amber underline underline-offset-2 disabled:opacity-50"
              >
                {addStatus === 'adding' ? 'adding…' : addStatus === 'done' ? 'added ✓' : 'add'}
              </button>
            </div>
          )}
          {searchResult === 'not-found' && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded border border-line bg-bg-deeper/95 px-3 py-2 font-mono text-[10px] text-ink-faint backdrop-blur">
              no user found
            </div>
          )}
          {addStatus === 'error' && (
            <div className="mt-1 font-mono text-[9px] text-red-400">could not add — already friends?</div>
          )}
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="py-10 text-center font-mono text-[11px] text-ink-faint">
          no friends yet — add one above
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {friends.map((f, i) => (
            <FriendCard key={f.name} friend={f} delay={i * 60} fmt={fmt} />
          ))}
        </div>
      )}
    </Section>
  );
}
