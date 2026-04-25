import { motion } from 'motion/react';
import { PixelOrb } from './pixel_orb';
import { hexA } from '../shared_ui/cn';

type Props = {
  color: string;
  size?: number;
};

export function BreathingOrb({ color, size = 196 }: Props) {
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${hexA(color, 0.18)} 0%, ${hexA(color, 0.06)} 25%, transparent 55%)`,
        }}
        animate={{ opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <PixelOrb color={color} size={size} />
      </motion.div>
    </div>
  );
}
