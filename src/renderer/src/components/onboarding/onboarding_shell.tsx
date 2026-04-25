import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { PixelOrbMini } from '../../orb_character/pixel_orb_mini';
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
} from '../../state/onboarding';
import { Button } from '../../shared_ui/button';
import { cn } from '../../shared_ui/cn';
import { GrainOverlay } from '../../shared_ui/grain_overlay';
import { AmbientMotion } from './ambient_motion';
import { onboardingEase, riseItem, shellStagger } from './motion_presets';
import { ProgressDots } from './progress_dots';

type Props = {
  activeStep: OnboardingStepId;
  activeIndex: number;
  children: ReactNode;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
};

export function OnboardingShell({
  activeStep,
  activeIndex,
  children,
  onNext,
  onPrevious,
  onComplete,
}: Props) {
  const atStart = activeIndex === 0;
  const atAuth = activeStep === 'auth';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: onboardingEase }}
      className="relative min-h-screen overflow-hidden bg-bg-deeper text-ink"
    >
      <GrainOverlay />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(232,168,124,0.12),transparent_30%),radial-gradient(circle_at_18%_82%,rgba(124,176,232,0.08),transparent_28%)]" />
      <AmbientMotion />

      <div className="relative grid min-h-screen grid-cols-[280px_minmax(0,1fr)]">
        <motion.aside
          initial={{ x: -18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.48, ease: onboardingEase }}
          className="flex min-h-screen flex-col border-r border-line bg-bg-deeper/55 px-6 pb-6 pt-7 backdrop-blur-xl"
        >
          <motion.div
            variants={riseItem}
            initial="hidden"
            animate="show"
            className="mb-10 flex items-center gap-3"
          >
            <PixelOrbMini color="#E8A87C" pulse />
            <div>
              <div className="font-serif text-[22px] font-normal italic tracking-[-0.02em]">
                Cohort
              </div>
              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                first launch
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={shellStagger}
            initial="hidden"
            animate="show"
            className="flex flex-1 flex-col justify-center gap-5"
          >
            <motion.div variants={riseItem}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                setup in progress
              </div>
              <div className="mt-3 font-serif text-[34px] font-light italic leading-tight tracking-[-0.03em]">
                Build a focus room that feels like yours.
              </div>
            </motion.div>
            <motion.div
              key={activeStep}
              variants={riseItem}
              className="rounded-lg border border-line bg-white/[0.02] p-4"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                current screen
              </div>
              <div className="mt-2 font-serif text-xl italic text-ink">
                {ONBOARDING_STEPS[activeIndex]?.title}
              </div>
              <div className="mt-2 font-mono text-[10px] leading-relaxed text-ink-faint">
                {ONBOARDING_STEPS[activeIndex]?.summary}
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={riseItem}
            initial="hidden"
            animate="show"
            className="mt-auto border-t border-line pt-5"
          >
            <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              <span>onboarding</span>
              <span className="text-amber">{activeIndex + 1}/{ONBOARDING_STEPS.length}</span>
            </div>
            <ProgressDots activeIndex={activeIndex} />
          </motion.div>
        </motion.aside>

        <motion.main
          variants={shellStagger}
          initial="hidden"
          animate="show"
          className="flex min-h-screen flex-col"
        >
          <motion.header
            variants={riseItem}
            className="flex items-center justify-between border-b border-line px-10 py-5"
          >
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, ease: onboardingEase }}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint"
            >
              cohort / onboarding / {activeStep}
            </motion.div>
            <motion.div
              whileHover={{ y: -1 }}
              className="flex items-center gap-2 rounded border border-amber/20 bg-amber/[0.06] px-3 py-1.5 text-amber"
            >
              <span className="h-1.5 w-1.5 animate-pulse-fast rounded-full bg-amber" />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                desktop setup
              </span>
            </motion.div>
          </motion.header>

          <motion.section variants={riseItem} className="flex flex-1 items-center px-10 py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </motion.section>

          <motion.footer
            variants={riseItem}
            className="flex items-center justify-between border-t border-line px-10 py-5"
          >
            <motion.div
              whileHover={atStart ? undefined : { x: -2 }}
              whileTap={atStart ? undefined : { scale: 0.98 }}
            >
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onPrevious}
                disabled={atStart}
                className={cn(atStart && 'opacity-0')}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            </motion.div>

            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: onboardingEase }}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint"
            >
              {ONBOARDING_STEPS[activeIndex]?.summary}
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.18, ease: onboardingEase }}
            >
              <Button
                type="button"
                variant="amber"
                size="lg"
                onClick={atAuth ? undefined : onNext}
                disabled={atAuth}
                className="min-w-[138px]"
              >
                {atAuth ? (
                  <>
                    <Check className="h-4 w-4" />
                    Sign In Above
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.footer>
        </motion.main>
      </div>
    </motion.div>
  );
}
