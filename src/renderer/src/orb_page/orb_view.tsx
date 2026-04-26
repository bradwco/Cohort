import { Section } from '../shared_ui/section';
import { Slider } from '../settings_page/slider';
import { cn } from '../shared_ui/cn';

type Props = {
  brightness: number;
  setBrightness: (v: number) => void;
  breathSpeed: number;
  setBreathSpeed: (v: number) => void;
  taskColor: string;
  setTaskColor: (v: string) => void;
};

const BRIGHTNESS_LABELS = ['off', 'dim', 'medium', 'bright', 'max'];
const BREATH_LABELS = ['still', 'slow', 'natural', 'quick', 'fast'];

const COLORS = [
  { id: 'amber', label: 'amber', hex: '#E8A87C' },
  { id: 'blue', label: 'blue', hex: '#7CB0E8' },
  { id: 'green', label: 'green', hex: '#9CE8A8' },
  { id: 'purple', label: 'purple', hex: '#B89AE8' },
  { id: 'coral', label: 'coral', hex: '#E8756B' },
  { id: 'moss', label: 'moss', hex: '#7FA075' },
  { id: 'gold', label: 'gold', hex: '#D8B75C' },
  { id: 'slate', label: 'slate', hex: '#51616B' },
];

export function OrbView({
  brightness,
  setBrightness,
  breathSpeed,
  setBreathSpeed,
  taskColor,
  setTaskColor,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Section title="led brightness" meta={`${brightness}%`}>
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <Slider value={brightness} onChange={setBrightness} />
          <LabelRow labels={BRIGHTNESS_LABELS} />
        </div>
      </Section>

      <Section title="breathing speed" meta={`${breathSpeed}%`}>
        <div className="rounded-md border border-line bg-bg-deeper/60 p-4">
          <Slider value={breathSpeed} onChange={setBreathSpeed} />
          <LabelRow labels={BREATH_LABELS} />
        </div>
      </Section>

      <Section title="color theme" meta="orb glow">
        <div className="grid grid-cols-4 gap-2.5">
          {COLORS.map((color) => {
            const active = taskColor === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => setTaskColor(color.id)}
                className={cn(
                  'rounded-md border bg-bg-deeper/60 p-4 text-left transition-all hover:-translate-y-0.5',
                  active
                    ? 'border-amber/35 bg-amber/[0.08] text-amber'
                    : 'border-line text-ink-dim hover:border-line-mid',
                )}
              >
                <span
                  className="mb-3 block h-8 w-8 rounded-full border border-white/10"
                  style={{
                    background: color.hex,
                    boxShadow: active ? `0 0 22px ${color.hex}99` : undefined,
                  }}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                  {color.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

    </div>
  );
}

function LabelRow({ labels }: { labels: string[] }) {
  return (
    <div className="mt-3 grid grid-cols-5 gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}
