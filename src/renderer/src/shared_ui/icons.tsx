type IconProps = { active?: boolean };

const stroke = (active?: boolean) => (active ? '#E8A87C' : 'currentColor');

export function NetworkIcon({ active }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="3" cy="8" r="2" stroke={stroke(active)} strokeWidth="1.3" />
      <circle cx="13" cy="3" r="2" stroke={stroke(active)} strokeWidth="1.3" />
      <circle cx="13" cy="13" r="2" stroke={stroke(active)} strokeWidth="1.3" />
      <path d="M5 8L11 4M5 8L11 12" stroke={stroke(active)} strokeWidth="1.3" />
    </svg>
  );
}

export function HistoryIcon({ active }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke={stroke(active)} strokeWidth="1.3" />
      <path
        d="M8 4V8L11 10"
        stroke={stroke(active)}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SkullIcon({ active }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8C3 4.5 5 2 8 2C11 2 13 4.5 13 8V11H10V13H6V11H3V8Z"
        stroke={stroke(active)}
        strokeWidth="1.3"
      />
      <circle cx="6" cy="8" r="1" fill={stroke(active)} />
      <circle cx="10" cy="8" r="1" fill={stroke(active)} />
    </svg>
  );
}

export function ChipIcon({ active }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect
        x="4"
        y="4"
        width="8"
        height="8"
        rx="1"
        stroke={stroke(active)}
        strokeWidth="1.3"
      />
      <path
        d="M2 6H4M2 10H4M12 6H14M12 10H14M6 2V4M10 2V4M6 12V14M10 12V14"
        stroke={stroke(active)}
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M6 1L7.2 4.8L11 6L7.2 7.2L6 11L4.8 7.2L1 6L4.8 4.8L6 1Z"
        fill="#E8A87C"
      />
    </svg>
  );
}
