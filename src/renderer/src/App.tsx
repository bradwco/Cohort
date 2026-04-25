import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';

import { Sidebar } from './shared_ui/sidebar';
import { Header } from './shared_ui/header';
import { Telemetry } from './shared_ui/telemetry';
import { GrainOverlay } from './shared_ui/grain_overlay';
import { HwSimulator } from './shared_ui/hw_simulator';
import { useSimulatedTelemetry } from './shared_ui/use_simulated_telemetry';
import type { ViewId } from './shared_ui/types';

import { NetworkView } from './home_page/network_view';
import { HistoryView } from './history_page/history_view';
import { GraveyardView } from './history_page/graveyard_view';
import { HardwareView } from './settings_page/hardware_view';

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>('network');
  const [telemetryOpen, setTelemetryOpen] = useState(true);
  const [sessionActive] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(45 * 60 + 23);

  const [strictness, setStrictness] = useState('standard');
  const [brightness, setBrightness] = useState(72);
  const [breathSpeed, setBreathSpeed] = useState(45);
  const [taskColor, setTaskColor] = useState('amber');

  const { feed, feedRef } = useSimulatedTelemetry();

  useEffect(() => {
    if (!sessionActive) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [sessionActive]);

  return (
    <div
      className="relative flex min-h-screen text-ink"
      style={{
        background:
          'radial-gradient(ellipse at top, #1a1d2e 0%, #0d0e18 60%, #08090f 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <GrainOverlay />
      <HwSimulator />

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
            <NetworkView secondsLeft={secondsLeft} fmt={fmt} taskColor={taskColor} />
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
