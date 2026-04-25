import { Section } from '../shared_ui/section';
import { FriendCard, type Friend } from '../friends/friend_card';

const FRIENDS: Friend[] = [
  { name: 'alex', task: 'reading · biochem', rem: 2700, color: '#E8A87C', state: 'docked', pickup: 0 },
  { name: 'bailey', task: 'paused · 60s left', rem: 60, color: '#7CB0E8', state: 'pause', pickup: 1 },
  { name: 'casey', task: 'coding · cs188', rem: 5400, color: '#B89AE8', state: 'docked', pickup: 0 },
  { name: 'devon', task: 'offline', rem: null, color: null, state: 'offline', pickup: null },
  { name: 'emi', task: 'math · 200a pset', rem: 1800, color: '#7CB0E8', state: 'docked', pickup: 2 },
  { name: 'finn', task: 'offline', rem: null, color: null, state: 'offline', pickup: null },
];

type Props = { fmt: (s: number) => string };

export function DeskMap({ fmt }: Props) {
  return (
    <Section
      title="desk map"
      meta={
        <>
          <span className="text-amber">4</span> docked · 2 offline
        </>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
        {FRIENDS.map((f, i) => (
          <FriendCard key={f.name} friend={f} delay={i * 60} fmt={fmt} />
        ))}
      </div>
    </Section>
  );
}
