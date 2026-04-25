import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { NetworkView } from './home_page/network_view';
import { HistoryView } from './history_page/history_view';
import { GraveyardView } from './history_page/graveyard_view';
import { HardwareView } from './settings_page/hardware_view';
import { Header } from './shared_ui/header';
import { Sidebar } from './shared_ui/sidebar';
import { Telemetry } from './shared_ui/telemetry';
import type { ViewId } from './shared_ui/types';
import { useSimulatedTelemetry } from './shared_ui/use_simulated_telemetry';
import { GrainOverlay } from './shared_ui/grain_overlay';
import { loadOnboarding, saveOnboarding, type OnboardingData } from './state/onboarding';
import { OnboardingPage } from './onboarding/page';
import { getAuthRedirectSession, getSavedAuthSession } from './lib/supabase_auth';

function fmt(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function DashboardApp({ profile }: { profile: OnboardingData }) {
  const [activeView, setActiveView] = useState<ViewId>('network');
  const [telemetryOpen, setTelemetryOpen] = useState(true);
  const [sessionActive] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(profile.sessionLength * 60);
  const [strictness, setStrictness] = useState<string>(profile.accountability);
  const [brightness, setBrightness] = useState(72);
  const [breathSpeed, setBreathSpeed] = useState(45);
  const [taskColor, setTaskColor] = useState(profile.avatar.background);
  const { feed, feedRef } = useSimulatedTelemetry();

  useEffect(() => {
    if (!sessionActive) return;
    const id = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [sessionActive]);

  return (
    <div className="relative flex min-h-screen bg-bg-deeper text-ink">
      <GrainOverlay />
      <Sidebar activeView={activeView} onSelect={setActiveView} profile={profile} />

      <main
        className="min-w-0 flex-1 transition-[margin] duration-300"
        style={{ marginRight: telemetryOpen ? 380 : 0 }}
      >
        <Header
          view={activeView}
          sessionActive={sessionActive}
          telemetryOpen={telemetryOpen}
          onToggleTelemetry={() => setTelemetryOpen((open) => !open)}
        />

        <div className="px-10 pb-10">
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
          <Telemetry feed={feed} feedRef={feedRef} onClose={() => setTelemetryOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState(() => loadOnboarding());
  const [authenticated, setAuthenticated] = useState(() => {
    const redirectSession = getAuthRedirectSession();
    const savedSession = getSavedAuthSession();
    const savedProfile = loadOnboarding();

    if (redirectSession && !savedProfile.authenticated) {
      const nextProfile: OnboardingData = {
        ...savedProfile,
        authProvider: redirectSession.provider,
        authenticated: true,
      };
      saveOnboarding(nextProfile);
      return true;
    }

    return savedProfile.authenticated || Boolean(savedSession);
  });

  useEffect(() => {
    setProfile(loadOnboarding());
  }, [authenticated]);

  if (!authenticated) {
    return (
      <OnboardingPage
        onAuthenticated={() => {
          setProfile(loadOnboarding());
          setAuthenticated(true);
        }}
      />
    );
  }

  return <DashboardApp profile={profile} />;
}
