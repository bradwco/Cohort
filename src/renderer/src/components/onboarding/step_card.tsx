import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import type { OnboardingStepId } from '../../state/onboarding';
import { riseItem, shellStagger, stepStage } from './motion_presets';

type Props = {
  step: OnboardingStepId;
  eyebrow: string;
  title: string;
  summary: string;
  direction: number;
  visual: ReactNode;
  children: ReactNode;
};

export function StepCard({ step, eyebrow, title, summary, direction, visual, children }: Props) {
  return (
    <motion.div
      key={step}
      custom={direction}
      variants={stepStage}
      initial="enter"
      animate="center"
      exit="exit"
      className="grid min-h-[620px] grid-cols-[minmax(0,1fr)_360px] items-center gap-12"
    >
      <motion.div variants={shellStagger} initial="hidden" animate="show">
        <motion.div
          variants={riseItem}
          className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-amber"
        >
          {eyebrow}
        </motion.div>
        <motion.h1
          variants={riseItem}
          className="max-w-3xl font-serif text-[76px] font-light italic leading-[0.95] tracking-[-0.04em]"
        >
          {title}
        </motion.h1>
        <motion.p
          variants={riseItem}
          className="mt-6 max-w-xl font-serif text-2xl font-light italic leading-relaxed text-ink-dim"
        >
          {summary}
        </motion.p>
        <motion.div
          variants={riseItem}
          className="mt-10"
        >
          {children}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.18, duration: 0.45 }}
        className="flex h-full items-center justify-center border-l border-line pl-12"
      >
        {visual}
      </motion.div>
    </motion.div>
  );
}
