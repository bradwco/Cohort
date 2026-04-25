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

export const AUTH_SESSION_KEY = 'cohort:auth-session:v1';
const PENDING_PROVIDER_KEY = 'cohort:pending-auth-provider:v1';
const PENDING_PROFILE_KEY = 'cohort:pending-profile:v1';

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
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
  const hashSession = getAuthRedirectSession();
  if (hashSession) return hashSession;
  if (!supabase) return null;

  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error(error.message);
    if (data.session) {
      const redirectProfile = getRedirectProfile();
      if (redirectProfile) {
        await supabase.auth.updateUser({ data: profileMetadataFromPartial(redirectProfile) });
      }
      window.history.replaceState(null, document.title, window.location.pathname);
      return saveSupabaseSession(data.session, redirectProfile);
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

export async function sendEmailMagicLink(email: string, data: OnboardingData) {
  assertConfigured();
  window.localStorage.setItem(PENDING_PROVIDER_KEY, 'email');
  window.localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profileMetadata(data)));

  const { error } = await supabase!.auth.signInWithOtp({
    email,
    options: {
      data: profileMetadata(data),
      emailRedirectTo: getRedirectUrl(data),
      shouldCreateUser: true,
    },
  });

  if (error) throw new Error(error.message);
}

export async function startGoogleAuth(data: OnboardingData) {
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

  window.location.href = oauth.url;
}

function getRedirectUrl(data?: OnboardingData) {
  const url = new URL(`${window.location.origin}${window.location.pathname}`);
  if (data) {
    url.searchParams.set('cohort_profile', encodeProfile(data));
  }
  return url.toString();
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
