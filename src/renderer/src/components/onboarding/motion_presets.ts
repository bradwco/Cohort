import type { Variants } from 'motion/react';

export const onboardingEase = [0.2, 0.8, 0.2, 1] as const;

export const pageTransition = {
  duration: 0.46,
  ease: onboardingEase,
};

export const shellStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.08,
    },
  },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.38, ease: onboardingEase },
  },
};

export const stepStage: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 24 : -24,
    y: 10,
    scale: 0.985,
    filter: 'blur(10px)',
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: pageTransition,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -18 : 18,
    y: -8,
    scale: 0.99,
    filter: 'blur(10px)',
    transition: { duration: 0.28, ease: onboardingEase },
  }),
};
