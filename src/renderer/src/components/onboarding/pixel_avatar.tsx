import { motion } from 'motion/react';
import type { AvatarTraits } from '../../state/onboarding';
import { hexA } from '../../shared_ui/cn';
import { getAvatarOption } from './avatar_options';

type Props = {
  avatar: AvatarTraits;
  size?: number;
  animated?: boolean;
};

const SCALE = 8;
const CANVAS = 24;

function Rect({
  x,
  y,
  w,
  h,
  fill,
  rx = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  rx?: number;
}) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} />;
}

export function PixelAvatar({ avatar, size = 256, animated = false }: Props) {
  const skin = getAvatarOption('skin', avatar.skin)?.color ?? '#E8A87C';
  const hair = getAvatarOption('hair', avatar.hair)?.color ?? '#E7C45F';
  const hairAccent = getAvatarOption('hair', avatar.hair)?.accent ?? hair;
  const eyes = getAvatarOption('eyes', avatar.eyes)?.color ?? '#151722';
  const outfit = getAvatarOption('outfit', avatar.outfit)?.color ?? '#51616B';
  const accessory = getAvatarOption('accessory', avatar.accessory);
  const backdrop = getAvatarOption('background', avatar.background)?.color ?? '#E8A87C';

  return (
    <motion.div
      animate={animated ? { y: [0, -5, 0], scale: [1, 1.025, 1] } : undefined}
      transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: hexA(backdrop, 0.28) }}
      />
      <svg
        className="relative h-full w-full"
        viewBox={`0 0 ${CANVAS * SCALE} ${CANVAS * SCALE}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <circle cx="96" cy="96" r="88" fill={hexA(backdrop, 0.72)} />
        <circle cx="96" cy="96" r="86" fill={hexA('#08090f', 0.18)} />
        <circle cx="96" cy="96" r="76" fill={hexA(backdrop, 0.46)} />

        <Rect x={48} y={128} w={96} h={40} fill={outfit} />
        <Rect x={56} y={120} w={80} h={24} fill={outfit} />
        <Rect x={72} y={116} w={48} h={16} fill={skin} />
        <Rect x={64} y={56} w={64} h={64} fill={skin} />
        <Rect x={56} y={72} w={16} h={32} fill={skin} />
        <Rect x={120} y={72} w={16} h={32} fill={skin} />

        {avatar.hair === 'soft' && (
          <>
            <Rect x={56} y={48} w={72} h={24} fill={hair} />
            <Rect x={72} y={32} w={40} h={24} fill={hairAccent} />
            <Rect x={48} y={64} w={24} h={40} fill={hair} />
          </>
        )}
        {avatar.hair === 'crop' && (
          <>
            <Rect x={56} y={40} w={80} h={28} fill={hair} />
            <Rect x={48} y={56} w={24} h={56} fill={hair} />
            <Rect x={120} y={56} w={24} h={48} fill={hair} />
          </>
        )}
        {avatar.hair === 'bob' && (
          <>
            <Rect x={48} y={40} w={96} h={40} fill={hair} />
            <Rect x={40} y={64} w={32} h={64} fill={hair} />
            <Rect x={120} y={64} w={32} h={64} fill={hair} />
          </>
        )}
        {avatar.hair === 'wave' && (
          <>
            <Rect x={48} y={48} w={88} h={24} fill={hair} />
            <Rect x={56} y={32} w={24} h={24} fill={hairAccent} />
            <Rect x={80} y={40} w={56} h={24} fill={hair} />
            <Rect x={40} y={72} w={24} h={40} fill={hair} />
          </>
        )}
        {avatar.hair === 'bun' && (
          <>
            <Rect x={56} y={48} w={80} h={24} fill={hair} />
            <Rect x={80} y={32} w={32} h={24} fill={hairAccent} />
            <Rect x={128} y={48} w={24} h={24} fill={hair} />
          </>
        )}
        {avatar.hair === 'spike' && (
          <>
            <Rect x={48} y={56} w={88} h={16} fill={hair} />
            <Rect x={56} y={40} w={16} h={24} fill={hair} />
            <Rect x={80} y={32} w={16} h={32} fill={hairAccent} />
            <Rect x={104} y={40} w={16} h={24} fill={hair} />
          </>
        )}
        {avatar.hair === 'cap' && (
          <>
            <Rect x={48} y={48} w={88} h={24} fill={hair} />
            <Rect x={104} y={64} w={40} h={12} fill={hairAccent} />
          </>
        )}
        {avatar.hair === 'halo' && (
          <>
            <Rect x={48} y={56} w={88} h={16} fill={hair} />
            <Rect x={64} y={32} w={64} h={8} fill={hairAccent} />
          </>
        )}

        {avatar.eyes === 'sleepy' ? (
          <>
            <Rect x={72} y={84} w={16} h={4} fill={eyes} />
            <Rect x={104} y={84} w={16} h={4} fill={eyes} />
          </>
        ) : avatar.eyes === 'focus' ? (
          <>
            <Rect x={72} y={80} w={16} h={8} fill={eyes} />
            <Rect x={104} y={80} w={16} h={8} fill={eyes} />
            <Rect x={72} y={76} w={16} h={4} fill={hexA('#08090f', 0.65)} />
            <Rect x={104} y={76} w={16} h={4} fill={hexA('#08090f', 0.65)} />
          </>
        ) : (
          <>
            <Rect x={72} y={80} w={12} h={12} fill={eyes} />
            <Rect x={108} y={80} w={12} h={12} fill={eyes} />
            {avatar.eyes === 'bright' && (
              <>
                <Rect x={76} y={80} w={4} h={4} fill="#E8E3D8" />
                <Rect x={112} y={80} w={4} h={4} fill="#E8E3D8" />
              </>
            )}
          </>
        )}

        <Rect x={88} y={104} w={16} h={6} fill={hexA('#08090f', 0.54)} />
        <Rect x={72} y={132} w={48} h={8} fill={hexA('#08090f', 0.16)} />

        {avatar.accessory === 'rounds' && (
          <>
            <Rect x={64} y={76} w={28} h={24} fill="none" />
            <circle cx="78" cy="88" r="15" fill="none" stroke={accessory?.color} strokeWidth="6" />
            <circle cx="114" cy="88" r="15" fill="none" stroke={accessory?.color} strokeWidth="6" />
            <Rect x={92} y={86} w={8} h={4} fill={accessory?.accent ?? '#E8A87C'} />
          </>
        )}
        {avatar.accessory === 'visor' && <Rect x={56} y={76} w={80} h={16} fill={hexA(accessory?.color ?? '#7CB0E8', 0.72)} />}
        {avatar.accessory === 'phones' && (
          <>
            <Rect x={40} y={72} w={16} h={40} fill={accessory?.color ?? '#B89AE8'} />
            <Rect x={136} y={72} w={16} h={40} fill={accessory?.color ?? '#B89AE8'} />
            <Rect x={56} y={52} w={80} h={8} fill={accessory?.color ?? '#B89AE8'} />
          </>
        )}
        {avatar.accessory === 'pin' && <Rect x={112} y={132} w={12} h={12} fill={accessory?.color ?? '#9CE8A8'} />}
        {avatar.accessory === 'star' && (
          <>
            <Rect x={124} y={48} w={8} h={24} fill={accessory?.color ?? '#F3E5A3'} />
            <Rect x={116} y={56} w={24} h={8} fill={accessory?.color ?? '#F3E5A3'} />
          </>
        )}

        <circle cx="96" cy="96" r="88" fill="none" stroke={hexA('#E8E3D8', 0.15)} strokeWidth="2" />
      </svg>
    </motion.div>
  );
}
