import { createClient, type Session } from '@supabase/supabase-js';
import type { OnboardingData } from '../state/onboarding';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.SUPABASE_URL) as string | undefined;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.SUPABASE_ANON_KEY) as string | undefined;

export type AuthProvider = 'google' | 'email' | 'demo';

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  provider: AuthProvider;
  userId?: string;
  email?: string;
  profile?: Partial<OnboardingData>;
};

type ProfileRow = {
  id: string;
  username: string;
  orb_color: string;
  hardware_status: 'docked' | 'offline';
  current_activity: string;
  last_ping: string;
};

export const AUTH_SESSION_KEY = 'cohort:auth-session:v1';
const PENDING_PROVIDER_KEY = 'cohort:pending-auth-provider:v1';
const PENDING_PROFILE_KEY = 'cohort:pending-profile:v1';

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          persistSession: true,
          storageKey: 'cohort:supabase-auth:v1',
        },
      })
    : null;

export function isSupabaseConfigured() {
  return Boolean(supabase);
}

export function getSavedAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  window.localStorage.removeItem(PENDING_PROVIDER_KEY);
  window.localStorage.removeItem(PENDING_PROFILE_KEY);
}

export function mergeSessionIntoOnboarding(
  profile: OnboardingData,
  session: AuthSession,
): OnboardingData {
  const sessionProfile = session.profile ?? {};
  const emailName = session.email?.split('@')[0] ?? '';

  return {
    ...profile,
    email: profile.email || session.email || '',
    displayName:
      sessionProfile.displayName || profile.displayName || readableName(emailName) || 'focus user',
    username: sessionProfile.username || profile.username || slug(emailName) || 'cohort',
    avatar: { ...profile.avatar, ...sessionProfile.avatar },
    sessionLength: sessionProfile.sessionLength ?? profile.sessionLength,
    accountability: sessionProfile.accountability ?? profile.accountability,
    preferences: { ...profile.preferences, ...sessionProfile.preferences },
    authProvider: session.provider,
    authenticated: true,
  };
}

export async function persistSignedInUserProfile(profile: OnboardingData, session: AuthSession) {
  console.log('[auth] persistSignedInUserProfile called, userId:', session.userId);
  if (!supabase || !session.userId) {
    console.error('[auth] persistSignedInUserProfile: missing supabase or userId', { supabase: !!supabase, userId: session.userId });
    return;
  }

  const metadata = profileMetadata(profile);
  const { error: authError } = await supabase.auth.updateUser({ data: metadata });
  if (authError) {
    console.error('[auth] update user metadata:', authError.message);
  }

  const profileRow: ProfileRow = {
    id: session.userId,
    username: profile.username || profile.displayName || session.email || 'cohort',
    orb_color: profile.avatar.background,
    hardware_status: 'offline',
    current_activity: `${profile.sessionLength}m / ${profile.accountability}`,
    last_ping: new Date().toISOString(),
  };

  console.log('[auth] upserting profile row:', profileRow);
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(profileRow, { onConflict: 'id' });

  if (profileError) {
    console.error('[auth] upsert profile FAILED:', profileError.message, profileError);
  } else {
    console.log('[auth] profile upserted successfully');
  }
}

export function getAuthRedirectSession(): AuthSession | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  if (!accessToken) return null;
  const redirectProfile = getRedirectProfile();

  const provider =
    (window.localStorage.getItem(PENDING_PROVIDER_KEY) as AuthProvider | null) ?? 'google';
  const session: AuthSession = {
    accessToken,
    refreshToken: params.get('refresh_token') ?? undefined,
    provider,
    profile: redirectProfile,
  };

  saveAuthSession(session);
  window.localStorage.removeItem(PENDING_PROVIDER_KEY);
  window.localStorage.removeItem(PENDING_PROFILE_KEY);
  window.history.replaceState(null, document.title, window.location.pathname);
  return session;
}

export function hasAuthRedirectParams() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return query.has('code') || hash.has('access_token') || hash.has('error');
}

export async function completeAuthRedirect(): Promise<AuthSession | null> {
  console.log('[auth] completeAuthRedirect start, search:', window.location.search, 'hash:', window.location.hash);
  if (!supabase) return getSavedAuthSession();

  // Implicit flow: access_token arrives in the URL hash
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hashAccessToken = hashParams.get('access_token');
  if (hashAccessToken) {
    console.log('[auth] implicit flow: access_token found in hash');
    const refreshToken = hashParams.get('refresh_token') ?? '';
    const redirectProfile = getRedirectProfile();
    window.history.replaceState(null, document.title, window.location.pathname);

    const { data, error } = await supabase.auth.setSession({
      access_token: hashAccessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.error('[auth] setSession from hash failed:', error.message);
    } else if (data.session) {
      const savedSession = saveSupabaseSession(data.session, redirectProfile);
      if (savedSession.profile) {
        await persistSignedInUserProfile(
          mergeProfilePartial(savedSession.profile, savedSession),
          savedSession,
        );
      }
      return savedSession;
    }
  }

  // PKCE flow: code arrives in the URL query string
  const code = new URLSearchParams(window.location.search).get('code');
  console.log('[auth] PKCE flow: code from URL:', code ? 'present' : 'absent');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth] code exchange failed:', error.message);
    } else if (data.session) {
      const redirectProfile = getRedirectProfile();
      if (redirectProfile) {
        await supabase.auth.updateUser({ data: profileMetadataFromPartial(redirectProfile) });
      }
      window.history.replaceState(null, document.title, window.location.pathname);
      const savedSession = saveSupabaseSession(data.session, redirectProfile);
      if (savedSession.profile) {
        await persistSignedInUserProfile(
          mergeProfilePartial(savedSession.profile, savedSession),
          savedSession,
        );
      }
      return savedSession;
    }
  }

  return restoreSupabaseSession();
}

export async function restoreSupabaseSession(): Promise<AuthSession | null> {
  if (!supabase) return getSavedAuthSession();

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return getSavedAuthSession();

  return saveSupabaseSession(data.session);
}

function mergeProfilePartial(profile: Partial<OnboardingData>, session: AuthSession): OnboardingData {
  return {
    step: 'auth',
    displayName: profile.displayName || readableName(session.email?.split('@')[0] ?? '') || 'focus user',
    username: profile.username || slug(session.email?.split('@')[0] ?? '') || 'cohort',
    avatar: {
      skin: profile.avatar?.skin ?? 'rose',
      hair: profile.avatar?.hair ?? 'soft',
      eyes: profile.avatar?.eyes ?? 'warm',
      outfit: profile.avatar?.outfit ?? 'hoodie',
      accessory: profile.avatar?.accessory ?? 'none',
      background: profile.avatar?.background ?? 'amber',
    },
    sessionLength: profile.sessionLength ?? 50,
    accountability: profile.accountability ?? 'standard',
    preferences: {
      silentPresence: profile.preferences?.silentPresence ?? true,
      friendNudges: profile.preferences?.friendNudges ?? true,
      groupSessions: profile.preferences?.groupSessions ?? true,
    },
    email: profile.email || session.email || '',
    authProvider: session.provider,
    authenticated: true,
  };
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  if (!supabase || !username) return true;
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .limit(1);
  if (error) return true; // fail open so UX isn't blocked on network errors
  return !data || data.length === 0;
}

export async function startGoogleAuth(data: OnboardingData): Promise<AuthSession> {
  assertConfigured();
  window.localStorage.setItem(PENDING_PROVIDER_KEY, 'google');
  window.localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profileMetadata(data)));

  const { data: oauth, error } = await supabase!.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(data),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      skipBrowserRedirect: true,
    },
  });

  if (error) throw new Error(error.message);
  if (!oauth.url) throw new Error('Supabase did not return a Google auth URL.');

  // Open auth in an Electron popup window; wait for the cohort:// callback
  const callbackUrl = await window.api.openGoogleAuthPopup(oauth.url, 'cohort://');
  const session = await completeDeepLinkAuth(callbackUrl);
  if (!session) throw new Error('Google authentication failed.');
  return session;
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
  profile: OnboardingData,
): Promise<AuthSession> {
  assertConfigured();
  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: { data: profileMetadata(profile) },
  });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('Check your email to confirm your account before signing in.');
  const session = saveSupabaseSession(data.session, profile);
  await persistSignedInUserProfile(mergeProfilePartial(session.profile ?? {}, session), session);
  return session;
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<AuthSession> {
  assertConfigured();
  const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('Sign in failed.');
  return saveSupabaseSession(data.session);
}

// In Electron the app handles cohort:// deep links so auth redirects
// come back to the app. In a plain browser we fall back to the page URL.
function getRedirectUrl(data?: OnboardingData) {
  const isElectron = typeof window !== 'undefined' && Boolean((window as Record<string, unknown>).api);
  const base = isElectron
    ? 'cohort://auth-callback'
    : `${window.location.origin}${window.location.pathname}`;

  const url = new URL(base);
  if (data) {
    url.searchParams.set('cohort_profile', encodeProfile(data));
  }
  return url.toString();
}

// Called by App.tsx when a cohort:// deep link arrives via IPC.
// Supabase redirects here after email magic link or OAuth.
// NOTE: add cohort://** to the Supabase dashboard's "Allowed Redirect URLs".
export async function completeDeepLinkAuth(deepLinkUrl: string): Promise<AuthSession | null> {
  if (!supabase) return null;

  let parsed: URL;
  try {
    parsed = new URL(deepLinkUrl);
  } catch {
    console.error('[auth] invalid deep link URL:', deepLinkUrl);
    return null;
  }

  const redirectProfile = (() => {
    const raw = parsed.searchParams.get('cohort_profile');
    if (!raw) return undefined;
    try { return JSON.parse(decodeURIComponent(atob(raw))) as Partial<OnboardingData>; } catch { return undefined; }
  })();

  // PKCE flow: ?code=xxx
  const code = parsed.searchParams.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) {
      console.error('[auth] deep link code exchange failed:', error?.message);
      return null;
    }
    if (redirectProfile) {
      await supabase.auth.updateUser({ data: profileMetadataFromPartial(redirectProfile) });
    }
    return saveSupabaseSession(data.session, redirectProfile);
  }

  // Implicit flow: ?access_token=xxx (some Supabase email templates)
  const accessToken = parsed.searchParams.get('access_token');
  if (accessToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: parsed.searchParams.get('refresh_token') ?? '',
    });
    if (error || !data.session) {
      console.error('[auth] deep link implicit auth failed:', error?.message);
      return null;
    }
    return saveSupabaseSession(data.session, redirectProfile);
  }

  return null;
}

function saveSupabaseSession(
  session: Session,
  redirectProfile?: Partial<OnboardingData> | null,
): AuthSession {
  const provider =
    (window.localStorage.getItem(PENDING_PROVIDER_KEY) as AuthProvider | null) ??
    ((session.user.app_metadata.provider as AuthProvider | undefined) ?? 'email');

  const saved: AuthSession = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    provider,
    userId: session.user.id,
    email: session.user.email,
    profile: {
      ...metadataToProfile(session.user.user_metadata, session.user.email),
      ...redirectProfile,
      email: session.user.email,
    },
  };

  saveAuthSession(saved);
  window.localStorage.removeItem(PENDING_PROVIDER_KEY);
  window.localStorage.removeItem(PENDING_PROFILE_KEY);
  return saved;
}

function getRedirectProfile(): Partial<OnboardingData> | undefined {
  const raw = new URLSearchParams(window.location.search).get('cohort_profile');
  if (!raw) return undefined;
  try {
    return JSON.parse(decodeURIComponent(atob(raw))) as Partial<OnboardingData>;
  } catch {
    return undefined;
  }
}

function encodeProfile(data: OnboardingData) {
  return btoa(
    encodeURIComponent(
      JSON.stringify({
        displayName: data.displayName,
        username: data.username,
        avatar: data.avatar,
        sessionLength: data.sessionLength,
        accountability: data.accountability,
        preferences: data.preferences,
        email: data.email,
      } satisfies Partial<OnboardingData>),
    ),
  );
}

function profileMetadataFromPartial(data: Partial<OnboardingData>) {
  return {
    display_name: data.displayName,
    username: data.username,
    avatar: data.avatar,
    session_length: data.sessionLength,
    accountability: data.accountability,
    preferences: data.preferences,
  };
}

function metadataToProfile(
  metadata: Record<string, unknown>,
  email?: string,
): Partial<OnboardingData> {
  const emailName = email?.split('@')[0] ?? '';
  const displayName =
    stringValue(metadata.display_name) ||
    stringValue(metadata.full_name) ||
    stringValue(metadata.name) ||
    readableName(emailName);

  return {
    displayName,
    username: stringValue(metadata.username) || slug(displayName || emailName),
    avatar: objectValue(metadata.avatar) as OnboardingData['avatar'] | undefined,
    sessionLength: numberValue(metadata.session_length),
    accountability: accountabilityValue(metadata.accountability),
    preferences: objectValue(metadata.preferences) as OnboardingData['preferences'] | undefined,
  };
}

function profileMetadata(data: OnboardingData) {
  return {
    display_name: data.displayName,
    username: data.username,
    avatar: data.avatar,
    session_length: data.sessionLength,
    accountability: data.accountability,
    preferences: data.preferences,
  };
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' ? value : undefined;
}

function accountabilityValue(value: unknown) {
  return value === 'gentle' || value === 'standard' || value === 'strict' ? value : undefined;
}

function readableName(value: string) {
  return value
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18);
}

function assertConfigured() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env.');
  }
}
