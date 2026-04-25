import { motion } from 'motion/react';
import { PixelOrbMini } from '../../orb_character/pixel_orb_mini';

type Props = {
  compact?: boolean;
};

export function AmbientOrb({ compact = false }: Props) {
  const size = compact ? 160 : 260;

  return (
    <div
      className="pointer-events-none relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-amber/[0.06] blur-3xl"
        animate={{ scale: [0.92, 1.05, 0.92], opacity: [0.36, 0.68, 0.36] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-2/3 w-2/3 rounded-full border border-amber/15"
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        animate={{ y: [0, -7, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex h-24 w-24 items-center justify-center rounded-full border border-line bg-bg-deeper/80 shadow-[0_0_60px_rgba(232,168,124,0.16)]"
      >
        <PixelOrbMini color="#E8A87C" pulse />
      </motion.div>
    </div>
  );
}
