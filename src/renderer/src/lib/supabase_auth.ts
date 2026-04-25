import type { OnboardingData } from '../state/onboarding';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export type AuthProvider = 'google' | 'email' | 'demo';

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  provider: AuthProvider;
};

export const AUTH_SESSION_KEY = 'cohort:auth-session:v1';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
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

export function getAuthRedirectSession(): AuthSession | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  if (!accessToken) return null;

  const session: AuthSession = {
    accessToken,
    refreshToken: hash.get('refresh_token') ?? undefined,
    provider: (window.localStorage.getItem('cohort:pending-auth-provider:v1') as AuthProvider | null) ?? 'google',
  };

  saveAuthSession(session);
  window.localStorage.removeItem('cohort:pending-auth-provider:v1');
  window.history.replaceState(null, document.title, window.location.pathname);
  return session;
}

export async function sendEmailMagicLink(email: string, data: OnboardingData) {
  assertConfigured();
  window.localStorage.setItem('cohort:pending-auth-provider:v1', 'email');

  const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      email,
      create_user: true,
      data: profileMetadata(data),
      options: {
        email_redirect_to: window.location.origin,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await readAuthError(response));
  }
}

export function startGoogleAuth(data: OnboardingData) {
  assertConfigured();

  window.localStorage.setItem('cohort:pending-profile:v1', JSON.stringify(profileMetadata(data)));
  window.localStorage.setItem('cohort:pending-auth-provider:v1', 'google');
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: window.location.origin,
  });
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
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

function authHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY!,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

function assertConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
}

async function readAuthError(response: Response) {
  try {
    const body = (await response.json()) as { msg?: string; error_description?: string; error?: string };
    return body.error_description ?? body.msg ?? body.error ?? `Auth request failed (${response.status})`;
  } catch {
    return `Auth request failed (${response.status})`;
  }
}
