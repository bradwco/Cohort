import { motion } from 'motion/react';
import { ONBOARDING_STEPS, type OnboardingStepId } from '../../state/onboarding';
import { cn } from '../../shared_ui/cn';
import { onboardingEase, riseItem, shellStagger } from './motion_presets';

type Props = {
  activeStep: OnboardingStepId;
  activeIndex: number;
  onSelect: (step: OnboardingStepId) => void;
};

export function StepRail({ activeStep, activeIndex, onSelect }: Props) {
  return (
    <motion.nav
      variants={shellStagger}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-1.5"
    >
      {ONBOARDING_STEPS.map((step, index) => {
        const active = activeStep === step.id;
        const available = index <= activeIndex + 1;

        return (
          <motion.button
            key={step.id}
            type="button"
            variants={riseItem}
            whileHover={available ? { x: 4 } : undefined}
            whileTap={available ? { scale: 0.985 } : undefined}
            disabled={!available}
            onClick={() => onSelect(step.id)}
            className={cn(
              'group relative rounded-md border px-3.5 py-3 text-left transition-all duration-200',
              active
                ? 'border-amber/25 bg-amber/[0.06] text-ink'
                : 'border-transparent text-ink-faint hover:border-line hover:bg-white/[0.02]',
              !available && 'cursor-not-allowed opacity-35',
            )}
          >
            {active && (
              <motion.span
                layoutId="onboarding-rail-active"
                className="absolute bottom-2 left-0 top-2 w-px bg-amber shadow-[0_0_14px_rgba(232,168,124,0.8)]"
                transition={{ duration: 0.36, ease: onboardingEase }}
              />
            )}
            {index < activeIndex && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-amber/60"
              />
            )}
            <motion.span
              className="mb-1 block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint"
              animate={{ color: active ? 'rgba(232, 168, 124, 0.75)' : 'rgba(232, 227, 216, 0.4)' }}
              transition={{ duration: 0.25 }}
            >
              {step.eyebrow}
            </motion.span>
            <motion.span
              className="block font-serif text-base font-normal italic text-current"
              animate={{ x: active ? 3 : 0 }}
              transition={{ duration: 0.28, ease: onboardingEase }}
            >
              {step.label}
            </motion.span>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}
