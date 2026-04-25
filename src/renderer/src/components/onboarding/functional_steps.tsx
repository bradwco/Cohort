import { AlertCircle, CheckCircle2, LogIn, Mail, Play, Radio, Shield, Timer, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { OnboardingData } from '../../state/onboarding';
import { Button } from '../../shared_ui/button';
import { cn, hexA } from '../../shared_ui/cn';
import {
  isSupabaseConfigured,
  saveAuthSession,
  sendEmailMagicLink,
  startGoogleAuth,
} from '../../lib/supabase_auth';
import { PixelAvatar } from './pixel_avatar';
import { onboardingEase } from './motion_presets';

type StepProps = {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  onNext?: () => void;
  onComplete?: (provider?: OnboardingData['authProvider']) => void;
};

const ACCOUNTABILITY = [
  { id: 'gentle', label: 'Gentle', copy: 'quiet nudges, room to breathe' },
  { id: 'standard', label: 'Standard', copy: 'balanced pressure and presence' },
  { id: 'strict', label: 'Strict', copy: 'strong guardrails, fewer escapes' },
] as const;

const PREFS = [
  {
    id: 'silentPresence',
    label: 'Silent Presence',
    copy: 'show friends you are locked in without chat noise',
    Icon: Radio,
  },
  {
    id: 'friendNudges',
    label: 'Friend Nudges',
    copy: 'allow light check-ins when you drift',
    Icon: Users,
  },
  {
    id: 'groupSessions',
    label: 'Group Sessions',
    copy: 'sync timers with a small focus room',
    Icon: Timer,
  },
] as const;

export function WelcomeStep({ onNext }: StepProps) {
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
        <Button type="button" variant="amber" size="lg" onClick={onNext} className="w-fit">
          Begin
        </Button>
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

export function FocusPreferencesStep({ data, update }: StepProps) {
  const setSessionLength = (value: string) => {
    const next = Number(value);
    if (Number.isNaN(next)) return;
    update({ sessionLength: Math.min(240, Math.max(5, Math.round(next))) });
  };

  const setPreference = (id: keyof OnboardingData['preferences']) => {
    update({
      preferences: {
        ...data.preferences,
        [id]: !data.preferences[id],
      },
    });
  };

  return (
    <div className="grid max-w-2xl gap-5">
      <div className="rounded-md border border-amber/20 bg-amber/[0.05] px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber">
          what you are setting
        </div>
        <div className="mt-2 font-mono text-[10px] leading-relaxed text-ink-dim">
          These preferences decide how long a focus session lasts, how firmly Cohort should
          protect it, and whether friends can quietly participate.
        </div>
      </div>

      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          default session length
        </div>
        <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3">
          <label className="rounded-md border border-line bg-white/[0.02] px-4 py-3">
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              minutes
            </span>
            <input
              type="number"
              min={5}
              max={240}
              step={5}
              value={data.sessionLength}
              onChange={(event) => setSessionLength(event.target.value)}
              className="no-number-spinner w-full bg-transparent font-serif text-4xl font-light italic text-ink outline-none tabular-nums"
            />
          </label>
          <div className="rounded-md border border-line bg-white/[0.02] px-4 py-3">
            <div className="font-serif text-lg italic text-ink">How long should one lock-in last?</div>
            <div className="mt-2 font-mono text-[10px] leading-relaxed text-ink-faint">
              You can change this before any session. Use shorter sessions for warmups and longer
              ones for deep work. Cohort accepts 5 to 240 minutes.
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          accountability style
        </div>
        <div className="grid gap-2.5">
          {ACCOUNTABILITY.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => update({ accountability: item.id })}
              className={cn(
                'flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-all hover:-translate-y-0.5',
                data.accountability === item.id
                  ? 'border-amber/45 bg-amber/[0.08]'
                  : 'border-line bg-white/[0.02] hover:border-line-mid',
              )}
            >
              <span
                className={cn(
                  'h-3 w-3 rounded-full border',
                  data.accountability === item.id
                    ? 'border-amber bg-amber shadow-[0_0_12px_rgba(232,168,124,0.8)]'
                    : 'border-line-mid',
                )}
              />
              <span className="flex-1">
                <span className="block font-serif text-lg italic">{item.label}</span>
                <span className="mt-0.5 block font-mono text-[10px] tracking-wide text-ink-faint">
                  {item.copy}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {PREFS.map(({ id, label, copy, Icon }) => {
          const active = data.preferences[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPreference(id)}
              className={cn(
                'rounded-md border p-3 text-left transition-all hover:-translate-y-0.5',
                active
                  ? 'border-amber/35 bg-amber/[0.07]'
                  : 'border-line bg-white/[0.02] opacity-70 hover:border-line-mid',
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <Icon className={cn('h-4 w-4', active ? 'text-amber' : 'text-ink-faint')} />
                <span
                  className={cn(
                    'h-4 w-7 rounded-full border p-0.5 transition-colors',
                    active ? 'border-amber/40 bg-amber/20' : 'border-line-mid bg-white/[0.02]',
                  )}
                >
                  <span
                    className={cn(
                      'block h-2.5 w-2.5 rounded-full transition-transform',
                      active ? 'translate-x-3 bg-amber' : 'bg-ink-faint',
                    )}
                  />
                </span>
              </div>
              <div className="font-serif text-base italic">{label}</div>
              <div className="mt-1 font-mono text-[9px] leading-relaxed text-ink-faint">
                {copy}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FocusVisual({ data }: { data: OnboardingData }) {
  return (
    <div className="w-full max-w-sm rounded-lg border border-line bg-bg-deeper/60 p-5">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            active rule
          </div>
          <div className="mt-1 font-serif text-2xl italic">{data.accountability}</div>
        </div>
        <Shield className="h-5 w-5 text-amber" />
      </div>
      <div className="flex flex-col items-center justify-center py-4">
        <ProductOrbVisual />
        <div className="-mt-5 rounded-md border border-amber/20 bg-amber/[0.06] px-4 py-2 text-center">
          <div className="font-serif text-3xl font-light italic tabular-nums">
            {data.sessionLength} min
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
            default session
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        {PREFS.map(({ id, label }) => (
          <div key={id} className="flex items-center justify-between border-t border-line py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              {label}
            </span>
            <span className={cn('font-mono text-[10px]', data.preferences[id] ? 'text-amber' : 'text-ink-faint')}>
              {data.preferences[id] ? 'on' : 'off'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PreviewStep({ data }: StepProps) {
  const name = data.displayName || 'you';
  return (
    <div className="grid max-w-2xl gap-3">
      {[
        `${name} starts with ${data.sessionLength}-minute focus sessions.`,
        `${data.accountability} accountability keeps the room honest.`,
        data.preferences.groupSessions
          ? 'Group sessions are ready when your cohort joins.'
          : 'Solo mode stays quiet and personal.',
      ].map((line, index) => (
        <div
          key={line}
          className="rounded-md border border-line bg-white/[0.02] px-4 py-3 font-serif text-lg italic text-ink-dim"
          style={{ animation: `fadeUp 0.4s ${index * 80}ms both` }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export function PreviewVisual({ data }: { data: OnboardingData }) {
  const glow = data.avatar.background === 'blue' ? '#7CB0E8' : '#E8A87C';
  return (
    <div className="w-full max-w-md rounded-lg border border-line bg-bg-deeper/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            dashboard preview
          </div>
          <div className="mt-1 font-serif text-xl italic">{data.displayName || 'your'} room</div>
        </div>
        <PixelAvatar avatar={data.avatar} size={58} />
      </div>
      <div
        className="mb-4 rounded-md border border-line px-5 py-8 text-center"
        style={{ background: `radial-gradient(circle at 50% 20%, ${hexA(glow, 0.18)}, transparent 60%)` }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
          focused / cohort sync
        </div>
        <div className="mt-3 font-serif text-[64px] font-light italic leading-none tabular-nums">
          {String(data.sessionLength).padStart(2, '0')}:00
        </div>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          streak 1 / pause budget set
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['timer', 'streak', 'orb glow'].map((item) => (
          <div key={item} className="rounded border border-line bg-white/[0.02] px-3 py-2 text-center">
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
              {item}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthStep({ data, update, onComplete }: StepProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const configured = isSupabaseConfigured();

  const email = data.email;

  const handleGoogle = () => {
    try {
      startGoogleAuth(data);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to start Google auth.');
    }
  };

  const handleEmail = async () => {
    setStatus('sending');
    setMessage('');
    try {
      await sendEmailMagicLink(email, data);
      setStatus('sent');
      setMessage('Check your email for a Cohort sign-in link.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to send email link.');
    }
  };

  const handleDemo = () => {
    saveAuthSession({ accessToken: 'demo', provider: 'demo' });
    onComplete?.('demo');
  };

  return (
    <div className="grid max-w-md gap-3">
      {!configured && (
        <div className="rounded-md border border-amber/25 bg-amber/[0.06] px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
            <AlertCircle className="h-4 w-4" />
            Supabase keys missing
          </div>
          <div className="mt-2 font-mono text-[10px] leading-relaxed text-ink-faint">
            Google and email auth need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Demo mode
            still works locally.
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={!configured}
        className="flex h-12 items-center gap-3 rounded-md border border-line-mid bg-white/[0.025] px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-dim transition-all hover:-translate-y-0.5 hover:border-amber/35 hover:bg-amber/[0.06] hover:text-amber disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LogIn className="h-4 w-4" />
        Continue with Google
      </button>

      <div className="rounded-md border border-line bg-white/[0.02] p-3">
        <label className="block">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            email link
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => update({ email: event.target.value })}
            placeholder="you@example.com"
            className="h-10 w-full rounded border border-line-mid bg-bg-deeper/60 px-3 font-mono text-[11px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-amber/45"
          />
        </label>
        <button
          type="button"
          onClick={handleEmail}
          disabled={!configured || !email || status === 'sending'}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded border border-line-mid bg-white/[0.025] px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-dim transition-all hover:border-amber/35 hover:bg-amber/[0.06] hover:text-amber disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Mail className="h-4 w-4" />
          {status === 'sending' ? 'Sending...' : 'Send Email Link'}
        </button>
      </div>

      {message && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md border px-3 py-2 font-mono text-[10px] leading-relaxed',
            status === 'sent'
              ? 'border-cool-green/25 bg-cool-green/10 text-cool-green'
              : 'border-amber/25 bg-amber/[0.06] text-amber',
          )}
        >
          {status === 'sent' ? <CheckCircle2 className="mt-px h-4 w-4" /> : <AlertCircle className="mt-px h-4 w-4" />}
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={handleDemo}
        className="flex h-12 items-center gap-3 rounded-md border border-line-mid bg-white/[0.025] px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-dim transition-all hover:-translate-y-0.5 hover:border-amber/35 hover:bg-amber/[0.06] hover:text-amber"
      >
        <Play className="h-4 w-4" />
        Demo Mode
      </button>
    </div>
  );
}

export function AuthVisual({ data }: { data: OnboardingData }) {
  return (
    <div className="w-full max-w-sm rounded-lg border border-line bg-bg-deeper/60 p-5">
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <PixelAvatar avatar={data.avatar} size={154} animated />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
            profile ready
          </div>
          <div className="mt-2 font-serif text-3xl italic">
            {data.displayName || 'your focus signal'}
          </div>
          <div className="mt-2 font-mono text-[10px] tracking-wide text-ink-faint">
            @{data.username || 'cohort'} / {data.sessionLength}m / {data.accountability}
          </div>
        </div>
      </div>
    </div>
  );
}
