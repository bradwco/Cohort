import { AlertCircle, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { OnboardingData } from '../../state/onboarding';
import { saveOnboarding } from '../../state/onboarding';
import { cn } from '../../shared_ui/cn';
import {
  isSupabaseConfigured,
  startGoogleAuth,
  signUpWithEmailPassword,
  signInWithEmailPassword,
  persistSignedInUserProfile,
  mergeSessionIntoOnboarding,
} from '../../lib/supabase_auth';

type StepProps = {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  onNext?: () => void;
  onComplete?: (provider?: OnboardingData['authProvider']) => void;
};

export function WelcomeStep({ }: StepProps) {
  return (
    <>
      <div className="flex max-w-xl flex-col gap-4">
        <div className="grid grid-cols-3 gap-2.5">
          {['presence', 'focus', 'accountability'].map((item, index) => (
            <div
              key={item}
              className="rounded-md border border-line bg-white/[0.02] px-3.5 py-3"
              style={{ animation: `fadeUp 0.45s ${index * 70}ms both` }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="mt-2 font-serif text-base italic text-ink">{item}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function WelcomeVisual() {
  return (
    <div className="relative h-[420px] w-full max-w-sm rounded-lg border border-line bg-bg-deeper/60 p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(232,168,124,0.2),transparent_50%)]" />
      <div className="relative flex h-full flex-col items-center justify-center gap-8">
        <ProductOrbVisual />
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber">
            dock presence online
          </div>
          <div className="mt-2 font-serif text-3xl italic">a visible focus signal</div>
        </div>
      </div>
    </div>
  );
}

function ProductOrbVisual() {
  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      <motion.div
        className="absolute bottom-6 h-40 w-48 rounded-full bg-amber/[0.08] blur-3xl"
        animate={{ scale: [0.9, 1.12, 0.9], opacity: [0.45, 0.82, 0.45] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-8 h-14 w-44 rounded-[50%] border border-line-mid bg-[#11131d] shadow-[0_18px_48px_rgba(0,0,0,0.35)]"
        animate={{ boxShadow: ['0 18px 48px rgba(0,0,0,0.35)', '0 18px 60px rgba(232,168,124,0.22)', '0 18px 48px rgba(0,0,0,0.35)'] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute bottom-[54px] h-4 w-28 rounded-[50%] bg-amber/[0.2] blur-md" />
      <motion.div
        className="absolute bottom-[50px] h-32 w-32 overflow-hidden rounded-full border border-amber/25 bg-[radial-gradient(circle_at_34%_28%,#FFE0B8_0%,#E8A87C_28%,#B96B4C_58%,#3A211D_100%)] shadow-[0_0_70px_rgba(232,168,124,0.45)]"
        animate={{ scale: [1, 1.025, 1] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute left-6 top-5 h-6 w-7 rounded-full bg-white/35 blur-sm" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-bg-deeper/30" />
      </motion.div>
      <div className="absolute bottom-8 h-4 w-36 rounded-[50%] border-t border-white/10 bg-white/[0.03]" />
    </div>
  );
}

export function AuthStep({ data, update, onComplete }: StepProps) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState(data.email || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const configured = isSupabaseConfigured();

  const handleGoogle = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const session = await startGoogleAuth(data);
      await persistSignedInUserProfile(
        mergeSessionIntoOnboarding({ ...data, email: session.email ?? data.email }, session),
        session,
      );
      saveOnboarding({ ...data, email: session.email ?? data.email, authProvider: session.provider, authenticated: true });
      onComplete?.(session.provider);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Google auth failed.');
    } finally {
      setStatus('idle');
    }
  };

  const handleEmailPassword = async () => {
    if (!email || !password) {
      setStatus('error');
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const session =
        mode === 'signup'
          ? await signUpWithEmailPassword(email, password, data)
          : await signInWithEmailPassword(email, password);

      if (mode === 'signin') {
        await persistSignedInUserProfile(
          mergeSessionIntoOnboarding({ ...data, email }, session),
          session,
        );
      }

      saveOnboarding({ ...data, email, authProvider: session.provider, authenticated: true });
      onComplete?.(session.provider);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="grid max-w-sm gap-3">
      {!configured && (
        <div className="rounded-md border border-amber/25 bg-amber/[0.06] px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
            <AlertCircle className="h-4 w-4" />
            Supabase keys missing
          </div>
          <div className="mt-2 font-mono text-[10px] leading-relaxed text-ink-faint">
            Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file.
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={!configured || status === 'loading'}
        className="flex h-12 items-center gap-3 rounded-md border border-line-mid bg-white/[0.025] px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-dim transition-all hover:-translate-y-0.5 hover:border-amber/35 hover:bg-amber/[0.06] hover:text-amber disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LogIn className="h-4 w-4" />
        {status === 'loading' ? 'Opening...' : 'Continue with Google'}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">or</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleEmailPassword();
        }}
      >
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { update({ email: e.target.value }); setEmail(e.target.value); }}
          autoComplete="email"
          className="h-10 w-full rounded border border-line-mid bg-bg-deeper/60 px-3 font-mono text-[11px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-amber/45"
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="h-10 w-full rounded border border-line-mid bg-bg-deeper/60 px-3 font-mono text-[11px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-amber/45"
        />
        <div className="flex justify-end">
          <button
            type="button"
            tabIndex={-1}
            className="font-mono text-[10px] text-ink-faint transition-colors hover:text-ink-dim"
          >
            Forgot password?
          </button>
        </div>
        <button
          type="submit"
          disabled={!configured || status === 'loading'}
          className="flex h-10 w-full items-center justify-center gap-2 rounded border border-amber/35 bg-amber/[0.08] px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-amber transition-all hover:-translate-y-0.5 hover:bg-amber/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === 'loading' ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-md border border-amber/25 bg-amber/[0.06] px-3 py-2 font-mono text-[10px] leading-relaxed text-amber">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="text-center font-mono text-[10px] text-ink-faint">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={cn('underline underline-offset-2 transition-colors hover:text-ink')}
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            New here?{' '}
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={cn('underline underline-offset-2 transition-colors hover:text-ink')}
            >
              Create account
            </button>
          </>
        )}
      </div>
    </div>
  );
}

