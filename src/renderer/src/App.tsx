import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';

import { NetworkView } from './home_page/network_view';
import { HistoryView } from './history_page/history_view';
import { GraveyardView } from './history_page/graveyard_view';
import { HardwareView } from './settings_page/hardware_view';
import { Sidebar } from './shared_ui/sidebar';
import { Header } from './shared_ui/header';
import { Telemetry } from './shared_ui/telemetry';
import { GrainOverlay } from './shared_ui/grain_overlay';
import { HwSimulator } from './shared_ui/hw_simulator';
import type { TelemetryEvent, ViewId } from './shared_ui/types';
import { loadOnboarding, saveOnboarding, type OnboardingData } from './state/onboarding';
import { OnboardingPage } from './onboarding/page';
import {
  completeAuthRedirect,
  completeDeepLinkAuth,
  getSavedAuthSession,
  hasAuthRedirectParams,
  mergeSessionIntoOnboarding,
  persistSignedInUserProfile,
  signOut,
} from './lib/supabase_auth';

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

function getInitialAppState(): {
  profile: OnboardingData;
  authenticated: boolean;
  checkingAuth: boolean;
} {
  const savedProfile = loadOnboarding();

  if (hasAuthRedirectParams()) {
    return { profile: savedProfile, authenticated: false, checkingAuth: true };
  }

  const onboardingProfile: OnboardingData = {
    ...savedProfile,
    step: 'welcome',
    authenticated: false,
    authProvider: null,
  };
  saveOnboarding(onboardingProfile);
  return { profile: onboardingProfile, authenticated: false, checkingAuth: false };
}

function DashboardApp({
  profile,
  userId,
  onSignOut,
}: {
  profile: OnboardingData;
  userId: string | null;
  onSignOut: () => void;
}) {
  const [activeView, setActiveView] = useState<ViewId>('network');
  const [telemetryOpen, setTelemetryOpen] = useState(true);
  const [feed, setFeed] = useState<TelemetryEvent[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  const [orbStatus, setOrbStatus] = useState<OrbStatus>('offline');
  const [secondsLeft, setSecondsLeft] = useState(profile.sessionLength * 60);
  const [liftCount, setLiftCount] = useState(0);
  const [totalPauseMs, setTotalPauseMs] = useState(0);
  const [currentWorkflow, setCurrentWorkflow] = useState('');

  const [groups, setGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const [strictness, setStrictness] = useState<string>(profile.accountability);
  const [brightness, setBrightness] = useState(72);
  const [breathSpeed, setBreathSpeed] = useState(45);
  const [taskColor, setTaskColor] = useState(profile.avatar.background);

  const sessionActive = orbStatus !== 'offline';

  useEffect(() => {
    if (!userId || !window.api) return;
    void window.api.initMqtt(userId);
  }, [userId]);

  useEffect(() => {
    if (orbStatus !== 'docked') return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [orbStatus]);

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

  useEffect(() => {
    if (!window.api) return;

    const cleanup = window.api.onOwnState((raw) => {
      const data = raw as OwnStatePayload;
      pushTelemetry('focus-orb/own/state', data);

      if (data.status === 'docked') {
        if (data.duration != null) {
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
    return () => { cleanup(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSessionEnd() {
    setOrbStatus('offline');
    setSecondsLeft(profile.sessionLength * 60);
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
        userId={userId}
        activeGroup={activeGroup}
        groups={groups}
        initialDuration={profile.sessionLength}
        onAddGroup={handleAddGroup}
        onSelectGroup={setActiveGroup}
        onSessionEnd={handleSessionEnd}
      />

      <Sidebar activeView={activeView} onSelect={setActiveView} profile={profile} />

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
          onSignOut={onSignOut}
        />

        <div className="px-10 pb-16">
          {activeView === 'network' && (
            <NetworkView
              userId={userId}
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

export default function App() {
  const [initialState] = useState(getInitialAppState);
  const [profile, setProfile] = useState(initialState.profile);
  const [authenticated, setAuthenticated] = useState(initialState.authenticated);
  const [checkingAuth, setCheckingAuth] = useState(initialState.checkingAuth);

  useEffect(() => {
    setProfile(loadOnboarding());
  }, [authenticated]);

  // Handle cohort:// deep links forwarded from the Electron main process.
  // This fires when the user clicks a Supabase email magic link or is
  // redirected back from Google OAuth — both now route through the custom protocol.
  useEffect(() => {
    if (!window.api?.onDeepLink) return;
    const cleanup = window.api.onDeepLink(async (url) => {
      setCheckingAuth(true);
      try {
        const session = await completeDeepLinkAuth(url);
        if (session) {
          const nextProfile = mergeSessionIntoOnboarding(loadOnboarding(), session);
          await persistSignedInUserProfile(nextProfile, session);
          saveOnboarding(nextProfile);
          setProfile(nextProfile);
          setAuthenticated(true);
        }
      } finally {
        setCheckingAuth(false);
      }
    });
    return () => { cleanup(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!checkingAuth) return;

    let cancelled = false;
    completeAuthRedirect()
      .then(async (session) => {
        if (cancelled || !session) return;
        const nextProfile = mergeSessionIntoOnboarding(loadOnboarding(), session);
        await persistSignedInUserProfile(nextProfile, session);
        saveOnboarding(nextProfile);
        setProfile(nextProfile);
        setAuthenticated(true);
      })
      .finally(() => {
        if (!cancelled) setCheckingAuth(false);
      });

    return () => {
      cancelled = true;
    };
  }, [checkingAuth]);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-deeper text-ink">
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber">
            finishing sign in
          </div>
          <div className="mt-3 font-serif text-3xl italic">Opening Cohort...</div>
        </div>
      </div>
    );
  }

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

  const handleSignOut = async () => {
    await signOut();
    const nextProfile: OnboardingData = {
      ...loadOnboarding(),
      step: 'welcome',
      authenticated: false,
      authProvider: null,
    };
    saveOnboarding(nextProfile);
    setProfile(nextProfile);
    setAuthenticated(false);
  };

  const userId = getSavedAuthSession()?.userId ?? null;
  return <DashboardApp profile={profile} userId={userId} onSignOut={handleSignOut} />;
}
