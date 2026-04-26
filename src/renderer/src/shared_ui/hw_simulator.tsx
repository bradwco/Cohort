import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from './cn';

type OrbStatus = 'offline' | 'docked' | 'undocked';

type SimUser = {
  id: string;
  label: string;
  color: string;
};

type ProfileRow = {
  id: string;
  username: string;
  orb_color: string;
};

const NOTE_LIMIT = 80;

type Props = {
  userId: string | null;
  activeGroup: string | null;
  groups: string[];
  initialDuration?: number;
  onAddGroup: (name: string) => void;
  onSelectGroup: (name: string) => void;
  onSessionEnd: () => void;
};

export function HwSimulator({
  userId: currentUserId,
  activeGroup,
  groups,
  initialDuration = 60,
  onAddGroup,
  onSelectGroup,
  onSessionEnd,
}: Props) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<SimUser[]>([]);
  const [userId, setUserId] = useState('');
  const [duration, setDuration] = useState(initialDuration);
  const [status, setStatus] = useState<OrbStatus>('offline');
  const [log, setLog] = useState<string[]>([]);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(initialDuration);
  const [sessionWorkflow, setSessionWorkflow] = useState<string>('Focus Session');
  const [sessionNote, setSessionNote] = useState('');

  useEffect(() => {
    if (!window.api || !currentUserId) return;

    let cancelled = false;
    void Promise.all([window.api.getProfile(currentUserId), window.api.getFriends(currentUserId)]).then(
      ([me, friends]) => {
        if (cancelled) return;

        const simUsers: SimUser[] = [];
        const ownProfile = me as ProfileRow | null;

        if (ownProfile) {
          simUsers.push({
            id: ownProfile.id,
            label: `${ownProfile.username} (You)`,
            color: ownProfile.orb_color ?? '#E8A87C',
          });
        } else {
          simUsers.push({
            id: currentUserId,
            label: 'You',
            color: '#E8A87C',
          });
        }

        for (const friend of (friends as ProfileRow[] | null) ?? []) {
          simUsers.push({
            id: friend.id,
            label: friend.username,
            color: friend.orb_color ?? '#7CB0E8',
          });
        }

        setUsers(simUsers);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (users.length === 0) return;
    if (!users.some((user) => user.id === userId)) {
      setUserId(users[0]!.id);
      setStatus('offline');
      setSessionStartedAt(null);
      setSessionDuration(initialDuration);
      setSessionWorkflow(activeGroup ?? 'Focus Session');
      setSessionNote('');
    }
  }, [activeGroup, initialDuration, userId, users]);

  useEffect(() => {
    if (!window.api) return;
    const cleanup = window.api.onOwnState((raw) => {
      const data = raw as { status?: string };
      if (data.status === 'offline') {
        setStatus('offline');
        setSessionStartedAt(null);
        setSessionDuration(initialDuration);
      }
    });
    return () => { cleanup(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function push(msg: string) {
    setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l.slice(0, 6)]);
  }

  async function fire(payload: Record<string, unknown>): Promise<boolean> {
    if (!userId) return false;

    try {
      await window.api.simulateHardware(userId, payload);
      push(`OK ${JSON.stringify(payload)}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      push(`ERR ${msg.slice(0, 80)}`);
      console.error('[hw-sim]', err);
      return false;
    }
  }

  async function dock() {
    const trimmedNote = sessionNote.trim();
    if (!trimmedNote) return;

    const nextStartedAt = sessionStartedAt ?? new Date().toISOString();
    const nextWorkflow = trimmedNote;
    const payload = {
      status: 'docked',
      duration,
      workflowGroup: nextWorkflow,
      sessionStartedAt: nextStartedAt,
      plannedDurationMinutes: sessionDuration || duration,
    };

    if (await fire(payload)) {
      setStatus('docked');
      setSessionStartedAt(nextStartedAt);
      setSessionDuration(duration);
      setSessionWorkflow(nextWorkflow);
    }
  }

  async function undock() {
    if (
      await fire({
        status: 'undocked',
        sessionStartedAt: sessionStartedAt ?? new Date().toISOString(),
        plannedDurationMinutes: sessionDuration,
        workflowGroup: sessionWorkflow,
      })
    ) {
      setStatus('undocked');
    }
  }

  async function redock() {
    if (
      await fire({
        status: 'redocked',
        sessionStartedAt: sessionStartedAt ?? new Date().toISOString(),
        plannedDurationMinutes: sessionDuration,
        workflowGroup: sessionWorkflow,
      })
    ) {
      setStatus('docked');
    }
  }

  async function endSession() {
    try {
      const wasOwnUser = Boolean(currentUserId && userId === currentUserId);
      await fire({ status: 'offline' });

      if (wasOwnUser) {
        const stats = await window.api.getPauseStats();
        const pauseMin = Math.round((stats as { totalPauseMs: number }).totalPauseMs / 60000);
        await window.api.endSession(pauseMin, 85, 'Simulated session - great work!');
        onSessionEnd();
      }

      push('OK session ended');
      setStatus('offline');
      setSessionStartedAt(null);
      setSessionDuration(duration);
      setSessionWorkflow(activeGroup ?? 'Focus Session');
      setSessionNote('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      push(`ERR ${msg.slice(0, 80)}`);
      console.error('[hw-sim]', err);
    }
  }

  async function sendNudge() {
    if (!window.api || !currentUserId || !userId || userId === currentUserId) return;
    const sender = users.find((user) => user.id === userId);
    await window.api.sendFriendNudge(userId, currentUserId, sender?.label.replace(' (You)', '') ?? 'friend');
    push(`OK nudge -> ${currentUserId}`);
  }

  function submitNewGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = newGroupInput.trim();
    if (!trimmed) return;
    onAddGroup(trimmed);
    setNewGroupInput('');
  }

  const user = users.find((u) => u.id === userId);

  return (
    <div className="fixed bottom-5 left-5 z-[100] font-mono">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded border border-line-mid bg-bg-deeper/90 px-3 py-1.5 text-[10px] uppercase tracking-widest text-ink-dim backdrop-blur hover:text-ink"
      >
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            status === 'docked' && 'bg-amber animate-pulse',
            status === 'undocked' && 'bg-cool-blue animate-pulse',
            status === 'offline' && 'bg-ink-faint',
          )}
        />
        hw sim
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-9 left-0 w-72 rounded border border-line bg-bg-deeper/95 p-4 backdrop-blur-xl"
        >
          <div className="mb-3 text-[9px] uppercase tracking-widest text-ink-faint">Hardware Simulator</div>

          <div className="mb-3">
            <div className="mb-1 text-[9px] text-ink-faint">simulate as</div>
            <div className="flex flex-wrap gap-1.5">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setUserId(u.id);
                    setStatus('offline');
                    setSessionStartedAt(null);
                    setSessionDuration(duration);
                    setSessionWorkflow(activeGroup ?? 'Focus Session');
                    setSessionNote('');
                  }}
                  className={cn(
                    'rounded border px-2 py-1 text-[9px] transition-colors',
                    userId === u.id
                      ? 'border-transparent text-bg-deeper'
                      : 'border-line-mid text-ink-dim hover:text-ink',
                  )}
                  style={userId === u.id ? { backgroundColor: u.color } : undefined}
                >
                  {u.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-1 text-[9px] text-ink-faint">group / squad</div>
            {groups.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1">
                {groups.map((g) => (
                  <button
                    key={g}
                    onClick={() => onSelectGroup(g)}
                    className={cn(
                      'rounded border px-2 py-1 text-[9px] transition-colors',
                      activeGroup === g
                        ? 'border-amber/60 bg-amber/10 text-amber'
                        : 'border-line-mid text-ink-dim hover:text-ink',
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={submitNewGroup} className="flex gap-1">
              <input
                value={newGroupInput}
                onChange={(e) => setNewGroupInput(e.target.value)}
                placeholder="new group..."
                className="min-w-0 flex-1 rounded border border-line-mid bg-white/[0.04] px-2 py-1 text-[9px] text-ink placeholder-ink-faint outline-none focus:border-amber/40"
              />
              <button
                type="submit"
                disabled={!newGroupInput.trim()}
                className="rounded border border-line-mid px-2 py-1 text-[9px] text-ink-dim transition-colors hover:text-ink disabled:opacity-30"
              >
                +
              </button>
            </form>
            {activeGroup && (
              <div className="mt-1 truncate text-[8px] text-ink-faint">
                docking as <span className="text-amber">{activeGroup}</span>
              </div>
            )}
          </div>

          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between text-[9px] text-ink-faint">
              <span>note / what you are doing</span>
              <span>{sessionNote.length}/{NOTE_LIMIT}</span>
            </div>
            <textarea
              value={sessionNote}
              maxLength={NOTE_LIMIT}
              onChange={(e) => {
                setSessionNote(e.target.value);
                if (status === 'offline') setSessionWorkflow(e.target.value.trim() || 'Focus Session');
              }}
              placeholder="e.g. finish econ problem set"
              className="h-16 w-full resize-none rounded border border-line-mid bg-white/[0.04] px-2 py-1.5 text-[9px] leading-4 text-ink placeholder-ink-faint outline-none focus:border-amber/40"
            />
          </div>

          <div className="mb-3">
            <div className="mb-1 text-[9px] text-ink-faint">session duration (min)</div>
            <div className="flex gap-1.5">
              {[30, 45, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDuration(d);
                    if (status === 'offline') setSessionDuration(d);
                  }}
                  className={cn(
                    'rounded border px-2 py-1 text-[9px] transition-colors',
                    duration === d
                      ? 'border-amber/60 bg-amber/10 text-amber'
                      : 'border-line-mid text-ink-dim hover:text-ink',
                  )}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                status === 'docked' && 'bg-amber',
                status === 'undocked' && 'bg-cool-blue',
                status === 'offline' && 'bg-line-mid',
              )}
            />
            <span className="text-[10px] text-ink">{user?.label ?? 'No profile loaded'} / {status}</span>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-1.5">
            <button
              disabled={status === 'docked' || !userId || !sessionNote.trim()}
              onClick={dock}
              className="rounded border border-amber/40 bg-amber/10 px-2 py-1.5 text-[10px] text-amber transition-opacity disabled:opacity-30"
            >
              Dock Phone
            </button>
            <button
              disabled={status !== 'docked' || !userId}
              onClick={undock}
              className="rounded border border-cool-blue/40 bg-cool-blue/10 px-2 py-1.5 text-[10px] text-cool-blue transition-opacity disabled:opacity-30"
            >
              Lift Phone
            </button>
            <button
              disabled={status !== 'undocked' || !userId}
              onClick={redock}
              className="rounded border border-amber/40 bg-amber/10 px-2 py-1.5 text-[10px] text-amber transition-opacity disabled:opacity-30"
            >
              Re-dock
            </button>
            <button
              disabled={status === 'offline' || !userId}
              onClick={endSession}
              className="rounded border border-line-mid px-2 py-1.5 text-[10px] text-ink-dim transition-opacity disabled:opacity-30 hover:text-ink"
            >
              End Session
            </button>
          </div>

          <button
            disabled={!currentUserId || !userId || userId === currentUserId}
            onClick={sendNudge}
            className="mb-3 w-full rounded border border-line-mid px-2 py-1.5 text-[10px] text-ink-dim transition-opacity hover:text-amber disabled:opacity-30"
          >
            Send Nudge To Me
          </button>

          {log.length > 0 && (
            <div className="border-t border-line pt-2">
              {log.map((l, i) => (
                <div key={i} className="truncate text-[8px] leading-5 text-ink-faint">
                  {l}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
