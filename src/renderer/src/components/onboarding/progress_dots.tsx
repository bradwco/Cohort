import { motion } from 'motion/react';
import { ONBOARDING_STEPS } from '../../state/onboarding';
import { cn } from '../../shared_ui/cn';
import { onboardingEase } from './motion_presets';

type Props = {
  activeIndex: number;
};

export function ProgressDots({ activeIndex }: Props) {
  return (
    <div className="flex items-center gap-2">
      {ONBOARDING_STEPS.map((step, index) => {
        const active = index === activeIndex;
        const complete = index < activeIndex;

        return (
          <motion.div
            key={step.id}
            layout
            animate={{ width: active ? 32 : 6 }}
            transition={{ duration: 0.34, ease: onboardingEase }}
            className={cn(
              'relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]',
              complete && 'bg-amber/20',
            )}
          >
            {complete && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                className="absolute inset-0 origin-left rounded-full bg-amber/60"
                transition={{ duration: 0.28, ease: onboardingEase }}
              />
            )}
            {active && (
              <motion.div
                layoutId="onboarding-progress-dot"
                className="absolute inset-0 rounded-full bg-amber shadow-[0_0_12px_rgba(232,168,124,0.55)]"
                transition={{ duration: 0.35, ease: onboardingEase }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
