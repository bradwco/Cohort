import { useEffect, useMemo, useState } from 'react';

export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    eyebrow: '01 / launch',
    title: 'Welcome',
    label: 'Welcome',
    summary: 'A presence you can see.',
  },
  {
    id: 'avatar',
    eyebrow: '02 / identity',
    title: 'Pixel Avatar',
    label: 'Avatar',
    summary: 'Create the small signal that represents you in focus.',
  },
  {
    id: 'auth',
    eyebrow: '03 / sync',
    title: 'Account',
    label: 'Auth',
    summary: 'Sign in with Google or email.',
  },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id'];

export type AvatarTraits = {
  skin: string;
  hair: string;
  eyes: string;
  outfit: string;
  accessory: string;
  background: string;
};

export type OnboardingData = {
  step: OnboardingStepId;
  displayName: string;
  username: string;
  avatar: AvatarTraits;
  sessionLength: number;
  accountability: 'gentle' | 'standard' | 'strict';
  preferences: {
    silentPresence: boolean;
    friendNudges: boolean;
    groupSessions: boolean;
  };
  email: string;
  authProvider: 'google' | 'email' | 'demo' | null;
  authenticated: boolean;
};

const STORAGE_KEY = 'cohort:onboarding:v1';

export const DEFAULT_ONBOARDING: OnboardingData = {
  step: 'welcome',
  displayName: '',
  username: '',
  avatar: {
    skin: 'rose',
    hair: 'soft',
    eyes: 'warm',
    outfit: 'hoodie',
    accessory: 'none',
    background: 'amber',
  },
  sessionLength: 50,
  accountability: 'standard',
  preferences: {
    silentPresence: true,
    friendNudges: true,
    groupSessions: true,
  },
  email: '',
  authProvider: null,
  authenticated: false,
};

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function stepIndex(step: OnboardingStepId) {
  return ONBOARDING_STEPS.findIndex((item) => item.id === step);
}

export function loadOnboarding(): OnboardingData {
  if (!canUseStorage()) return DEFAULT_ONBOARDING;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ONBOARDING;

    const saved = JSON.parse(raw) as Partial<OnboardingData>;
    const validStep = ONBOARDING_STEPS.some((item) => item.id === saved.step);

    return {
      ...DEFAULT_ONBOARDING,
      ...saved,
      step: validStep ? saved.step! : DEFAULT_ONBOARDING.step,
      avatar: { ...DEFAULT_ONBOARDING.avatar, ...saved.avatar },
      preferences: { ...DEFAULT_ONBOARDING.preferences, ...saved.preferences },
    };
  } catch {
    return DEFAULT_ONBOARDING;
  }
}

export function saveOnboarding(data: OnboardingData) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useOnboardingState() {
  const [data, setData] = useState<OnboardingData>(() => loadOnboarding());

  useEffect(() => {
    saveOnboarding(data);
  }, [data]);

  const currentIndex = stepIndex(data.step);
  const currentStep = ONBOARDING_STEPS[currentIndex] ?? ONBOARDING_STEPS[0];

  return useMemo(() => {
    const setStep = (step: OnboardingStepId) => {
      setData((prev) => ({ ...prev, step }));
    };

    const next = () => {
      setData((prev) => {
        const index = stepIndex(prev.step);
        const nextStep = ONBOARDING_STEPS[Math.min(index + 1, ONBOARDING_STEPS.length - 1)];
        return { ...prev, step: nextStep.id };
      });
    };

    const previous = () => {
      setData((prev) => {
        const index = stepIndex(prev.step);
        const nextStep = ONBOARDING_STEPS[Math.max(index - 1, 0)];
        return { ...prev, step: nextStep.id };
      });
    };

    const update = (patch: Partial<OnboardingData>) => {
      setData((prev) => ({ ...prev, ...patch }));
    };

    const completeAuth = (authProvider: OnboardingData['authProvider'] = 'demo') => {
      setData((prev) => ({ ...prev, authProvider, authenticated: true }));
    };

    return {
      data,
      currentStep,
      currentIndex,
      setStep,
      next,
      previous,
      update,
      completeAuth,
    };
  }, [currentIndex, currentStep, data]);
}
