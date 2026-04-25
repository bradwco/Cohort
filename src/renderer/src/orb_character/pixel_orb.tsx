import { hexA } from '../shared_ui/cn';

const ORB_SPRITE = [
  '...XXXXX...',
  '..XOOOOOX..',
  '.XOOOOOOOX.',
  'XOOOOLLOOOX',
  'XOOLLLLLOOX',
  'XOLLLLLLLOX',
  'XOOLLLLLOOX',
  'XOOOLLLOOOX',
  '.XOOOOOOOX.',
  '..XOOOOOX..',
  '...XXXXX...',
];

type Props = {
  color?: string;
  size?: number;
  glow?: number;
};

export function PixelOrb({ color = '#E8A87C', size = 160, glow = 1 }: Props) {
  const px = size / 11;
  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${24 * glow}px ${hexA(color, 0.6)})`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        shapeRendering="crispEdges"
      >
        {ORB_SPRITE.map((row, y) =>
          row.split('').map((c, x) => {
            if (c === '.') return null;
            const fill =
              c === 'X' ? hexA(color, 0.3) : c === 'O' ? hexA(color, 0.75) : color;
            return (
              <rect
                key={`${x}-${y}`}
                x={x * px}
                y={y * px}
                width={px}
                height={px}
                fill={fill}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}
