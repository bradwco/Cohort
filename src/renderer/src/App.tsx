import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';

import { Sidebar } from './shared_ui/sidebar';
import { Header } from './shared_ui/header';
import { Telemetry } from './shared_ui/telemetry';
import { GrainOverlay } from './shared_ui/grain_overlay';
import { HwSimulator } from './shared_ui/hw_simulator';
import type { TelemetryEvent, ViewId } from './shared_ui/types';

import { NetworkView } from './home_page/network_view';
import { HistoryView } from './history_page/history_view';
import { GraveyardView } from './history_page/graveyard_view';
import { HardwareView } from './settings_page/hardware_view';

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

type OrbStatus = 'offline' | 'docked' | 'undocked';

type OwnStatePayload = {
  status: string;
  duration?: number;
  workflowGroup?: string;
  totalPauseMs?: number;
  sessionId?: string;
};

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('network');
  const [telemetryOpen, setTelemetryOpen] = useState(true);
  const [feed, setFeed] = useState<TelemetryEvent[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  // Session state
  const [orbStatus, setOrbStatus] = useState<OrbStatus>('offline');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [liftCount, setLiftCount] = useState(0);
  const [totalPauseMs, setTotalPauseMs] = useState(0);
  const [currentWorkflow, setCurrentWorkflow] = useState('');

  // Groups / squads
  const [groups, setGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Hardware settings
  const [strictness, setStrictness] = useState('standard');
  const [brightness, setBrightness] = useState(72);
  const [breathSpeed, setBreathSpeed] = useState(45);
  const [taskColor, setTaskColor] = useState('amber');

  const sessionActive = orbStatus !== 'offline';

  // Timer — only ticks when phone is docked
  useEffect(() => {
    if (orbStatus !== 'docked') return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [orbStatus]);

  // Scroll telemetry feed to bottom
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed]);

  function pushTelemetry(topic: string, payload: unknown) {
    const evt: TelemetryEvent = {
      t: 'mqtt',
      topic,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      ts: new Date().toLocaleTimeString(),
    };
    setFeed((f) => [...f.slice(-49), evt]);
  }

  // Wire up IPC — runs once on mount
  useEffect(() => {
    if (!window.api) return;

    window.api.onOwnState((raw) => {
      const data = raw as OwnStatePayload;
      pushTelemetry(`focus-orb/own/state`, data);

      if (data.status === 'docked') {
        if (data.duration != null) {
          // Initial dock → new session
          setSecondsLeft(data.duration * 60);
          setCurrentWorkflow(data.workflowGroup ?? '');
          setLiftCount(0);
          setTotalPauseMs(0);
        }
        if (data.totalPauseMs != null) {
          setTotalPauseMs(data.totalPauseMs);
        }
        setOrbStatus('docked');
      } else if (data.status === 'undocked') {
        setOrbStatus('undocked');
        setLiftCount((c) => c + 1);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSessionEnd() {
    setOrbStatus('offline');
    setSecondsLeft(0);
    setLiftCount(0);
    setTotalPauseMs(0);
    setCurrentWorkflow('');
  }

  function handleAddGroup(name: string) {
    setGroups((g) => (g.includes(name) ? g : [...g, name]));
    setActiveGroup(name);
  }

  return (
    <div
      className="relative flex min-h-screen text-ink"
      style={{
        background: 'radial-gradient(ellipse at top, #1a1d2e 0%, #0d0e18 60%, #08090f 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <GrainOverlay />
      <HwSimulator
        activeGroup={activeGroup}
        groups={groups}
        onAddGroup={handleAddGroup}
        onSelectGroup={setActiveGroup}
        onSessionEnd={handleSessionEnd}
      />

      <Sidebar activeView={activeView} onSelect={setActiveView} />

      <main
        className="min-h-screen flex-1 transition-[margin] duration-300"
        style={{
          marginRight: telemetryOpen ? 380 : 0,
          transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <Header
          view={activeView}
          sessionActive={sessionActive}
          telemetryOpen={telemetryOpen}
          onToggleTelemetry={() => setTelemetryOpen((t) => !t)}
        />

        <div className="px-10 pb-16">
          {activeView === 'network' && (
            <NetworkView
              secondsLeft={secondsLeft}
              fmt={fmt}
              taskColor={taskColor}
              orbStatus={orbStatus}
              liftCount={liftCount}
              totalPauseMs={totalPauseMs}
              currentWorkflow={currentWorkflow}
              groups={groups}
              activeGroup={activeGroup}
              onSelectGroup={setActiveGroup}
              onAddGroup={handleAddGroup}
            />
          )}
          {activeView === 'history' && <HistoryView />}
          {activeView === 'graveyard' && <GraveyardView />}
          {activeView === 'hardware' && (
            <HardwareView
              strictness={strictness}
              setStrictness={setStrictness}
              brightness={brightness}
              setBrightness={setBrightness}
              breathSpeed={breathSpeed}
              setBreathSpeed={setBreathSpeed}
              taskColor={taskColor}
              setTaskColor={setTaskColor}
            />
          )}
        </div>
      </main>

      <AnimatePresence>
        {telemetryOpen && (
          <Telemetry
            feed={feed}
            feedRef={feedRef}
            onClose={() => setTelemetryOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
