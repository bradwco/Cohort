const GRAVE_SPRITE = [
  '..XXXXX..',
  '.XX...XX.',
  'XX.....XX',
  'X..RIP..X',
  'X.......X',
  'X.......X',
  'X.......X',
  'XXXXXXXXX',
  'XXXXXXXXX',
];

export function PixelGravestone() {
  const px = 4;
  return (
    <svg width={36} height={40} viewBox="0 0 36 40" shapeRendering="crispEdges">
      {GRAVE_SPRITE.map((row, y) =>
        row.split('').map((c, x) => {
          if (c === '.') return null;
          const fill =
            c === 'X' ? 'rgba(232, 227, 216, 0.25)' : 'rgba(232, 168, 124, 0.6)';
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
  );
}
