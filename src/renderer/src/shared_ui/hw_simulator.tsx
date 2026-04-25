import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from './cn';

const USERS = [
  { id: '11111111-1111-1111-1111-111111111111', label: 'Kyle (You)', color: '#E8A87C' },
  { id: '22222222-2222-2222-2222-222222222222', label: 'Alex', color: '#6B8E23' },
  { id: '33333333-3333-3333-3333-333333333333', label: 'Bailey', color: '#7CB0E8' },
];

type OrbStatus = 'offline' | 'docked' | 'undocked';

type Props = {
  activeGroup: string | null;
  groups: string[];
  initialDuration?: number;
  onAddGroup: (name: string) => void;
  onSelectGroup: (name: string) => void;
  onSessionEnd: () => void;
};

export function HwSimulator({
  activeGroup,
  groups,
  initialDuration = 60,
  onAddGroup,
  onSelectGroup,
  onSessionEnd,
}: Props) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(USERS[0]!.id);
  const [duration, setDuration] = useState(initialDuration);
  const [status, setStatus] = useState<OrbStatus>('offline');
  const [log, setLog] = useState<string[]>([]);
  const [newGroupInput, setNewGroupInput] = useState('');

  function push(msg: string) {
    setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l.slice(0, 6)]);
  }

  async function fire(payload: Record<string, unknown>): Promise<boolean> {
    try {
      await window.api.simulateHardware(userId, payload);
      push(`✓ ${JSON.stringify(payload)}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      push(`✗ ${msg.slice(0, 80)}`);
      console.error('[hw-sim]', err);
      return false;
    }
  }

  async function dock() {
    if (await fire({ status: 'docked', duration, workflowGroup: activeGroup ?? 'Focus Session' }))
      setStatus('docked');
  }

  async function undock() {
    if (await fire({ status: 'undocked' })) setStatus('undocked');
  }

  async function redock() {
    if (await fire({ status: 'redocked' })) setStatus('docked');
  }

  async function endSession() {
    try {
      const stats = await window.api.getPauseStats();
      const pauseMin = Math.round((stats as { totalPauseMs: number }).totalPauseMs / 60000);
      await window.api.endSession(pauseMin, 85, 'Simulated session — great work!');
      push('✓ session ended');
      setStatus('offline');
      onSessionEnd();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      push(`✗ ${msg.slice(0, 80)}`);
      console.error('[hw-sim]', err);
    }
  }

  function submitNewGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = newGroupInput.trim();
    if (!trimmed) return;
    onAddGroup(trimmed);
    setNewGroupInput('');
  }

  const user = USERS.find((u) => u.id === userId)!;

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
          <div className="mb-3 text-[9px] uppercase tracking-widest text-ink-faint">
            Hardware Simulator
          </div>

          {/* User selector */}
          <div className="mb-3">
            <div className="mb-1 text-[9px] text-ink-faint">simulate as</div>
            <div className="flex gap-1.5">
              {USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setUserId(u.id)}
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

          {/* Group selector */}
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
                placeholder="new group…"
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

          {/* Duration */}
          <div className="mb-3">
            <div className="mb-1 text-[9px] text-ink-faint">session duration (min)</div>
            <div className="flex gap-1.5">
              {[30, 45, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
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

          {/* State indicator */}
          <div className="mb-3 flex items-center gap-2">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                status === 'docked' && 'bg-amber',
                status === 'undocked' && 'bg-cool-blue',
                status === 'offline' && 'bg-line-mid',
              )}
            />
            <span className="text-[10px] text-ink">{user.label} · {status}</span>
          </div>

          {/* Actions */}
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            <button
              disabled={status === 'docked'}
              onClick={dock}
              className="rounded border border-amber/40 bg-amber/10 px-2 py-1.5 text-[10px] text-amber transition-opacity disabled:opacity-30"
            >
              Dock Phone
            </button>
            <button
              disabled={status !== 'docked'}
              onClick={undock}
              className="rounded border border-cool-blue/40 bg-cool-blue/10 px-2 py-1.5 text-[10px] text-cool-blue transition-opacity disabled:opacity-30"
            >
              Lift Phone
            </button>
            <button
              disabled={status !== 'undocked'}
              onClick={redock}
              className="rounded border border-amber/40 bg-amber/10 px-2 py-1.5 text-[10px] text-amber transition-opacity disabled:opacity-30"
            >
              Re-dock
            </button>
            <button
              disabled={status === 'offline'}
              onClick={endSession}
              className="rounded border border-line-mid px-2 py-1.5 text-[10px] text-ink-dim transition-opacity disabled:opacity-30 hover:text-ink"
            >
              End Session
            </button>
          </div>

          {/* Log */}
          {log.length > 0 && (
            <div className="border-t border-line pt-2">
              {log.map((l, i) => (
                <div key={i} className="truncate text-[8px] leading-5 text-ink-faint">{l}</div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
