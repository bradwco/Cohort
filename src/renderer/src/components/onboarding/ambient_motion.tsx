import { motion } from 'motion/react';

export function AmbientMotion() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(232,227,216,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(232,227,216,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
        animate={{ backgroundPosition: ['0px 0px', '64px 64px'] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute -inset-x-40 top-0 h-40 bg-gradient-to-b from-amber/[0.09] to-transparent blur-xl"
        animate={{ y: [-180, 920], opacity: [0, 0.65, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.8 }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(115deg, transparent 0%, rgba(232,168,124,0.08) 44%, rgba(124,176,232,0.05) 50%, transparent 58%)',
        }}
        animate={{ x: ['-45%', '45%'], opacity: [0.08, 0.24, 0.08] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
