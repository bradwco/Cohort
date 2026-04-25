import { hexA } from '../shared_ui/cn';

const MINI_SPRITE = ['.XXX.', 'XOOOX', 'XOLOX', 'XOOOX', '.XXX.'];

type Props = {
  color?: string;
  pulse?: boolean;
  flash?: boolean;
};

export function PixelOrbMini({ color = '#E8A87C', pulse = false, flash = false }: Props) {
  const size = 22;
  const px = size / 5;
  const animation = flash
    ? 'flash 0.3s ease-in-out 3'
    : pulse
      ? 'breathe 3s ease-in-out infinite'
      : 'none';
  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${flash ? 12 : pulse ? 6 : 3}px ${hexA(color, flash ? 1 : 0.6)})`,
        animation,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        shapeRendering="crispEdges"
      >
        {MINI_SPRITE.map((row, y) =>
          row.split('').map((c, x) => {
            if (c === '.') return null;
            const fill =
              c === 'X' ? hexA(color, 0.4) : c === 'O' ? hexA(color, 0.8) : color;
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
