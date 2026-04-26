import type { ReactElement } from 'react';
import { PixelOrbMini } from '../orb_character/pixel_orb_mini';
import { PixelAvatar } from '../components/onboarding/pixel_avatar';
import { DashboardIcon, FriendsIcon, HistoryIcon, SettingsIcon } from './icons';
import { cn } from './cn';
import type { ViewId } from './types';
import type { OnboardingData } from '../state/onboarding';

type NavItem = {
  id: ViewId;
  label: string;
  Icon: (p: { active?: boolean }) => ReactElement;
};

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { id: 'history', label: 'History', Icon: HistoryIcon },
  { id: 'friends', label: 'Friends', Icon: FriendsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

type Props = {
  activeView: ViewId;
  onSelect: (id: ViewId) => void;
  profile?: OnboardingData;
};

export function Sidebar({ activeView, onSelect, profile }: Props) {
  const displayName = profile?.displayName || 'focus user';
  const username = profile?.username || displayName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const sessionLength = profile?.sessionLength ?? 45;
  const accountability = profile?.accountability ?? 'standard';

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-8 border-r border-line bg-bg-deeper/40 px-5 pb-6 pt-7 backdrop-blur-xl">
      <div className="flex items-center gap-3 pl-1">
        <PixelOrbMini color="#E8A87C" />
        <div>
          <div className="font-serif text-[22px] italic font-normal tracking-[-0.02em]">
            Cohort
          </div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
            command center
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex items-center gap-3 rounded px-3 py-2.5 font-mono text-xs tracking-wide text-ink-dim transition-colors',
                active
                  ? 'bg-amber/[0.06] text-ink shadow-[inset_2px_0_0_#E8A87C]'
                  : 'hover:bg-white/[0.03]',
              )}
            >
              <item.Icon active={active} />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <div className="flex items-center gap-2.5 rounded border border-amber/15 bg-amber/[0.04] px-3 py-2.5">
          <span className="flex h-2.5 w-2.5 animate-pulse2 items-center justify-center rounded-full bg-amber/20">
            <span className="h-1 w-1 rounded-full bg-amber" />
          </span>
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-amber">
              dock connected
            </div>
            {/* <div className="mt-0.5 font-mono text-[9px] text-ink-faint">
              192.168.1.42 · 24ms
            </div> */}
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded px-2.5 py-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-line bg-white/[0.03]">
            {profile ? (
              <PixelAvatar avatar={profile.avatar} size={32} />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber to-cool-purple font-serif text-[13px] font-medium text-bg-deeper">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-serif text-sm italic">{displayName}</div>
            <div className="mt-px font-mono text-[9px] tracking-wide text-ink-faint">
              @{username || 'cohort'} / {sessionLength}m / {accountability}
            </div>
          </div>
          <span className="h-1.5 w-1.5 animate-pulse2 rounded-full bg-amber shadow-[0_0_8px_#E8A87C]" />
        </div>
      </div>
    </aside>
  );
}
