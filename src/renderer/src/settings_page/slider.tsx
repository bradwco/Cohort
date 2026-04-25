type Props = {
  value: number;
  onChange: (v: number) => void;
};

export function Slider({ value, onChange }: Props) {
  return (
    <div className="relative flex h-6 items-center">
      <div className="h-1 w-full overflow-hidden rounded bg-white/[0.06]">
        <div
          className="h-full transition-[width] duration-100"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, rgba(232, 168, 124, 0.4), #E8A87C)',
            boxShadow: '0 0 8px rgba(232, 168, 124, 0.5)',
          }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute h-[18px] w-[18px] rounded-full bg-amber transition-[left] duration-100"
        style={{
          top: 3,
          left: `calc(${value}% - 9px)`,
          boxShadow:
            '0 0 12px rgba(232, 168, 124, 0.6), 0 0 0 4px rgba(232, 168, 124, 0.15)',
        }}
      />
    </div>
  );
}
