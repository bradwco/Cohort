import { Section } from '../shared_ui/section';
import { Slider } from './slider';
import { cn, hexA } from '../shared_ui/cn';

const COLORS = [
  { id: 'amber', hex: '#E8A87C', task: 'reading' },
  { id: 'blue', hex: '#7CB0E8', task: 'math' },
  { id: 'purple', hex: '#B89AE8', task: 'coding' },
  { id: 'green', hex: '#9CE8A8', task: 'writing' },
] as const;

const MODES = [
  { id: 'chill', label: 'chill', budget: '10 min', desc: 'good for casual reading' },
  { id: 'standard', label: 'standard', budget: '3 min', desc: 'enough for 2FA & playlist swaps' },
  { id: 'monk', label: 'monk mode', budget: '0 min', desc: 'lift the phone, the orb dies' },
] as const;

type Props = {
  strictness: string;
  setStrictness: (v: string) => void;
  brightness: number;
  setBrightness: (v: number) => void;
  breathSpeed: number;
  setBreathSpeed: (v: number) => void;
  taskColor: string;
  setTaskColor: (v: string) => void;
};

export function HardwareView({
  strictness,
  setStrictness,
  brightness,
  setBrightness,
  breathSpeed,
  setBreathSpeed,
  taskColor,
  setTaskColor,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Section title="strictness" meta="pause budget per hour">
        <div className="flex flex-col gap-2.5">
          {MODES.map((m) => {
            const active = strictness === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setStrictness(m.id)}
                className={cn(
                  'flex items-center gap-3.5 rounded-md border px-4 py-3.5 transition-colors',
                  active
                    ? 'border-amber/25 bg-amber/[0.05]'
                    : 'border-line bg-bg-panel hover:bg-white/[0.03]',
                )}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
                    active ? 'border-amber' : 'border-line-mid',
                  )}
                >
                  {active && (
                    <div className="h-[7px] w-[7px] rounded-full bg-amber shadow-[0_0_8px_#E8A87C]" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-serif text-base italic">{m.label}</div>
                  <div className="mt-0.5 font-mono text-[10px] tracking-wide text-ink-faint">
                    {m.desc}
                  </div>
                </div>
                <div className="font-serif text-lg italic text-amber">{m.budget}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="task color" meta="orb lights up to match">
        <div className="grid grid-cols-2 gap-2.5">
          {COLORS.map((c) => {
            const active = taskColor === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setTaskColor(c.id)}
                className="flex flex-col items-center gap-2 rounded-md border px-3.5 py-4 transition-all duration-200"
                style={{
                  borderColor: active ? c.hex : 'rgba(232, 227, 216, 0.08)',
                  background: active ? hexA(c.hex, 0.08) : 'rgba(232, 227, 216, 0.02)',
                }}
              >
                <div
                  className="h-10 w-10 rounded-full transition-shadow duration-300"
                  style={{
                    background: c.hex,
                    boxShadow: active ? `0 0 24px ${hexA(c.hex, 0.7)}` : 'none',
                  }}
                />
                <div className="font-serif text-sm italic text-ink">{c.task}</div>
                <div className="font-mono text-[10px] tracking-wide text-ink-faint">
                  {c.hex.toLowerCase()}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="led brightness"
        meta={<span className="text-amber">{brightness}%</span>}
      >
        <Slider value={brightness} onChange={setBrightness} />
        <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
          <span>off</span>
          <span>dim</span>
          <span>medium</span>
          <span>bright</span>
          <span>max</span>
        </div>
      </Section>

      <Section
        title="breathing speed"
        meta={<span className="text-amber">{breathSpeed} bpm</span>}
      >
        <Slider value={breathSpeed} onChange={setBreathSpeed} />
        <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
          <span>still</span>
          <span>slow</span>
          <span>natural</span>
          <span>quick</span>
          <span>fast</span>
        </div>
      </Section>
    </div>
  );
}
