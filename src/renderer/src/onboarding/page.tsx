import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
  useOnboardingState,
} from '../state/onboarding';
import { OnboardingShell } from '../components/onboarding/onboarding_shell';
import { StepCard } from '../components/onboarding/step_card';
import { AvatarBuilderStep } from '../components/onboarding/avatar_builder_step';
import {
  AuthStep,
  AuthVisual,
  FocusPreferencesStep,
  FocusVisual,
  PreviewStep,
  PreviewVisual,
  WelcomeStep,
  WelcomeVisual,
} from '../components/onboarding/functional_steps';

type Props = {
  onAuthenticated: () => void;
};

const STEP_COPY: Record<OnboardingStepId, { headline: string; body: string; meta: string[] }> = {
  welcome: {
    headline: 'cohort.',
    body: 'Set up the focus companion your friends can quietly see.',
    meta: ['desktop-first', 'ambient accountability', 'warm technology'],
  },
  avatar: {
    headline: 'Create your signal.',
    body: 'Your pixel avatar becomes the tiny visible proof that you are here and locked in.',
    meta: ['hair', 'eyes', 'outfit', 'accessory', 'background'],
  },
  focus: {
    headline: 'Choose your focus defaults.',
    body: 'These are the rules Cohort uses when you start a session. You can change them later.',
    meta: ['25 / 50 / 90', 'gentle / standard / strict', 'presence toggles'],
  },
  preview: {
    headline: 'Meet your dashboard.',
    body: 'Here is how your avatar and focus settings come together inside the app.',
    meta: ['timer', 'streak badge', 'orb glow'],
  },
  auth: {
    headline: 'Save your setup.',
    body: 'Create an account with Google or an email link to enter the app with these choices.',
    meta: ['google', 'email link'],
  },
};

export function OnboardingPage({ onAuthenticated }: Props) {
  const onboarding = useOnboardingState();
  const [direction, setDirection] = useState(1);
  const step = onboarding.currentStep;
  const copy = STEP_COPY[step.id];

  const next = () => {
    setDirection(1);
    onboarding.next();
  };

  const previous = () => {
    setDirection(-1);
    onboarding.previous();
  };

  const complete = (provider: Parameters<typeof onboarding.completeAuth>[0] = 'email') => {
    onboarding.completeAuth(provider);
    onAuthenticated();
  };

  const renderedStep = () => {
    if (step.id === 'avatar') {
      return (
        <AvatarBuilderStep
          key="avatar"
          data={onboarding.data}
          update={onboarding.update}
          direction={direction}
        />
      );
    }

    const stepContent = {
      welcome: {
        children: <WelcomeStep data={onboarding.data} update={onboarding.update} onNext={next} />,
        visual: <WelcomeVisual />,
      },
      focus: {
        children: <FocusPreferencesStep data={onboarding.data} update={onboarding.update} />,
        visual: <FocusVisual data={onboarding.data} />,
      },
      preview: {
        children: <PreviewStep data={onboarding.data} update={onboarding.update} />,
        visual: <PreviewVisual data={onboarding.data} />,
      },
      auth: {
        children: <AuthStep data={onboarding.data} update={onboarding.update} onComplete={complete} />,
        visual: <AuthVisual data={onboarding.data} />,
      },
    }[step.id];

    return (
      <StepCard
        key={step.id}
        step={step.id}
        eyebrow={step.eyebrow}
        title={copy.headline}
        summary={copy.body}
        direction={direction}
        visual={stepContent.visual}
      >
        {stepContent.children}
      </StepCard>
    );
  };

  return (
    <OnboardingShell
      activeStep={onboarding.data.step}
      activeIndex={onboarding.currentIndex}
      onNext={next}
      onPrevious={previous}
      onComplete={complete}
      onSignIn={() => onboarding.setStep('auth')}
    >
      <AnimatePresence mode="wait">
        {renderedStep()}
      </AnimatePresence>
    </OnboardingShell>
  );
}

export { ONBOARDING_STEPS };
