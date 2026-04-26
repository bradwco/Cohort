import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';

import { DashboardView } from './home_page/dashboard_view';
import { HistoryView } from './history_page/history_view';
import { FriendsView } from './friends_page/friends_view';
import { SettingsView } from './settings_page/settings_view';
import { Sidebar } from './shared_ui/sidebar';
import { Header } from './shared_ui/header';
import { Telemetry } from './shared_ui/telemetry';
import { GrainOverlay } from './shared_ui/grain_overlay';
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
  sessionStartedAt?: string;
  plannedDurationMinutes?: number;
};

function getInitialAppState(): {
  profile: OnboardingData;
  authenticated: boolean;
  checkingAuth: boolean;
} {
  const savedProfile = loadOnboarding();
  const savedSession = getSavedAuthSession();

  if (savedSession) {
    const profile = mergeSessionIntoOnboarding(savedProfile, savedSession);
    saveOnboarding(profile);
    return { profile, authenticated: true, checkingAuth: false };
  }

  if (hasAuthRedirectParams()) {
    return { profile: savedProfile, authenticated: false, checkingAuth: true };
  }

  return { profile: savedProfile, authenticated: false, checkingAuth: true };
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
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [feed, setFeed] = useState<TelemetryEvent[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const [currentProfile, setCurrentProfile] = useState(profile);
  const sessionLengthRef = useRef(profile.sessionLength);

  const [orbStatus, setOrbStatus] = useState<OrbStatus>('offline');
  const [sessionStartedAtMs, setSessionStartedAtMs] = useState<number | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [liftCount, setLiftCount] = useState(0);
  const [totalPauseMs, setTotalPauseMs] = useState(0);
  const [currentWorkflow, setCurrentWorkflow] = useState('');
  const [hardwareConnected, setHardwareConnected] = useState(false);

  const [sessionPausedAt, setSessionPausedAt] = useState<string | null>(null);

  const pauseBudgetMinutes =
    currentProfile.accountability === 'gentle' ? 10
    : currentProfile.accountability === 'standard' ? 3
    : 0;

  const [brightness, setBrightness] = useState(72);
  const [breathSpeed, setBreathSpeed] = useState(45);
  const [taskColor, setTaskColor] = useState(profile.avatar.background);

  const sessionActive = orbStatus !== 'offline';

  useEffect(() => {
    if (!userId || !window.api) return;
    void window.api.initMqtt(userId);
  }, [userId]);

  useEffect(() => {
    if (!window.api) return;
    const cleanup = window.api.onPlayAudio((base64: string) => {
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
      audio.play().catch((err) => console.error('[audio]', err));
    });
    return () => { cleanup(); };
  }, []);

  // Wallclock-derived elapsed: this stays in lockstep with the overlay's
  // right-column timer because both read the same sessionStartedAt and
  // accumulated pause from the main process. While paused, we freeze at
  // the pause moment so the value matches what the user saw in the overlay
  // before they hit Stop.
  useEffect(() => {
    if (orbStatus === 'offline' || sessionStartedAtMs == null) {
      setSecondsElapsed(0);
      return;
    }
    const recompute = () => {
      const referenceNow = sessionPausedAt != null ? Date.parse(sessionPausedAt) : Date.now();
      const elapsedSec = Math.max(0, Math.floor((referenceNow - sessionStartedAtMs - totalPauseMs) / 1000));
      setSecondsElapsed(elapsedSec);
    };
    recompute();
    if (sessionPausedAt != null) return;
    const id = setInterval(recompute, 1000);
    return () => clearInterval(id);
  }, [orbStatus, sessionPausedAt, sessionStartedAtMs, totalPauseMs]);

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
        setSessionPausedAt(null);
        if (data.duration != null) {
          setCurrentWorkflow(data.workflowGroup ?? '');
          setLiftCount(0);
          setTotalPauseMs(0);
          const startMs = data.sessionStartedAt ? Date.parse(data.sessionStartedAt) : Date.now();
          setSessionStartedAtMs(Number.isFinite(startMs) ? startMs : Date.now());
        } else if (data.sessionStartedAt) {
          const startMs = Date.parse(data.sessionStartedAt);
          if (Number.isFinite(startMs)) setSessionStartedAtMs(startMs);
        }
        if (data.totalPauseMs != null) {
          setTotalPauseMs(data.totalPauseMs);
        }
        setOrbStatus('docked');
      } else if (data.status === 'undocked') {
        setOrbStatus('undocked');
        setLiftCount((c) => c + 1);
      } else if (data.status === 'offline') {
        handleSessionEnd();
      }
    });
    return () => { cleanup(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!window.api?.onHardwareSerialStatus) return;
    const cleanup = window.api.onHardwareSerialStatus((raw) => {
      const data = raw as { connected?: boolean };
      setHardwareConnected(Boolean(data.connected));
    });
    return () => { cleanup(); };
  }, []);

  function handleSessionEnd() {
    setOrbStatus('offline');
    setSecondsElapsed(0);
    setLiftCount(0);
    setTotalPauseMs(0);
    setCurrentWorkflow('');
    setSessionPausedAt(null);
    setSessionStartedAtMs(null);
  }

  function handleEndSession() {
    void window.api?.endSession(Math.round(totalPauseMs / 60000), 0, 'Ended from desktop');
    handleSessionEnd();
  }

  // Listen for overlay pause events
  useEffect(() => {
    if (!window.api?.onSessionPaused) return;
    const cleanup = window.api.onSessionPaused((raw) => {
      const { pausedAt } = raw as { pausedAt: string };
      setSessionPausedAt(pausedAt);
    });
    return () => { cleanup(); };
  }, []);

  // Auto-end session when pause budget is exhausted
  useEffect(() => {
    if (!sessionPausedAt || orbStatus === 'offline') return;
    if (pauseBudgetMinutes === 0) {
      handleEndSession();
      return;
    }
    const budgetMs = pauseBudgetMinutes * 60 * 1000;
    const id = setInterval(() => {
      if (Date.now() - Date.parse(sessionPausedAt) >= budgetMs) {
        handleEndSession();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sessionPausedAt, orbStatus, pauseBudgetMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleProfileUpdate(patch: Partial<OnboardingData>) {
    const next = {
      ...currentProfile,
      ...patch,
      preferences: patch.preferences
        ? { ...currentProfile.preferences, ...patch.preferences }
        : currentProfile.preferences,
    };
    saveOnboarding(next);
    sessionLengthRef.current = next.sessionLength;
    setCurrentProfile(next);
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

      <Sidebar
        activeView={activeView}
        onSelect={setActiveView}
        profile={currentProfile}
        hardwareConnected={hardwareConnected}
      />

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

        <div className={activeView === 'dashboard' ? 'px-10 pb-0' : 'px-10 pb-16'}>
          {activeView === 'dashboard' && (
            <DashboardView
              userId={userId}
              profile={currentProfile}
              secondsElapsed={secondsElapsed}
              fmt={fmt}
              orbStatus={orbStatus}
              liftCount={liftCount}
              totalPauseMs={totalPauseMs}
              currentWorkflow={currentWorkflow}
            />
          )}
          {activeView === 'history' && <HistoryView userId={userId} />}
          {activeView === 'friends' && <FriendsView userId={userId} />}
          {activeView === 'settings' && (
            <SettingsView
              profile={currentProfile}
              userId={userId}
              brightness={brightness}
              setBrightness={setBrightness}
              breathSpeed={breathSpeed}
              setBreathSpeed={setBreathSpeed}
              taskColor={taskColor}
              setTaskColor={setTaskColor}
              onSignOut={onSignOut}
              onProfileUpdate={handleProfileUpdate}
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
  // redirected back from Google OAuth - both now route through the custom protocol.
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
        if (cancelled) return;
        if (!session) {
          const nextProfile: OnboardingData = {
            ...loadOnboarding(),
            step: 'welcome',
            authenticated: false,
            authProvider: null,
          };
          saveOnboarding(nextProfile);
          setProfile(nextProfile);
          setAuthenticated(false);
          return;
        }
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
