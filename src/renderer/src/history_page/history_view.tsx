import { Section } from '../shared_ui/section';
import { Heatmap } from './heatmap';
import { SessionRow, type Session } from './session_row';

const SESSIONS: Session[] = [
  { date: 'tuesday · 8:14 pm', dur: '2h 04m', flow: 94, lifts: 4, task: 'reading · biochem', color: '#E8A87C' },
  { date: 'tuesday · 2:30 pm', dur: '1h 30m', flow: 88, lifts: 7, task: 'math · 200a pset', color: '#7CB0E8' },
  { date: 'monday · 9:45 pm', dur: '3h 12m', flow: 97, lifts: 2, task: 'coding · cs188', color: '#B89AE8' },
  { date: 'sunday · 11:00 am', dur: '0h 48m', flow: 71, lifts: 12, task: 'reading · biochem', color: '#E8A87C' },
];

export function HistoryView() {
  return (
    <div>
      <Section title="focus heatmap" meta="last 12 weeks · 142 hours total">
        <Heatmap />
      </Section>

      <Section title="recent sessions">
        <div className="flex flex-col gap-2.5">
          {SESSIONS.map((s, i) => (
            <SessionRow key={i} session={s} delay={i * 50} />
          ))}
        </div>
      </Section>
    </div>
  );
}
