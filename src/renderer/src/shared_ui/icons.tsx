type IconProps = { active?: boolean };

const stroke = (active?: boolean) => (active ? '#E8A87C' : 'currentColor');

export function DashboardIcon({ active }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke={stroke(active)} strokeWidth="1.3" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke={stroke(active)} strokeWidth="1.3" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke={stroke(active)} strokeWidth="1.3" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke={stroke(active)} strokeWidth="1.3" />
    </svg>
  );
}

export function FriendsIcon({ active }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke={stroke(active)} strokeWidth="1.3" />
      <path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4" stroke={stroke(active)} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 4c1.5 0 3 1 3 3M11 8.5c1.5.5 3 1.5 3 3.5" stroke={stroke(active)} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function OrbIcon({ active }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke={stroke(active)} strokeWidth="1.3" />
      <circle cx="6.5" cy="6" r="1.5" fill={stroke(active)} opacity="0.4" />
      <path d="M8 13.5C8 13.5 12 11 12 8" stroke={stroke(active)} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function SettingsIcon({ active }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke={stroke(active)} strokeWidth="1.3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" stroke={stroke(active)} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

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
