import { HeroStage } from './hero_stage';
import { SquadsBar } from './squads_bar';
import { DeskMap } from './desk_map';

const COLOR_MAP: Record<string, string> = {
  amber: '#E8A87C',
  blue: '#7CB0E8',
  purple: '#B89AE8',
  green: '#9CE8A8',
  coral: '#E8756B',
  moss: '#7FA075',
  gold: '#D8B75C',
  slate: '#51616B',
};

type Props = {
  secondsLeft: number;
  fmt: (s: number) => string;
  taskColor: string;
  orbStatus: 'offline' | 'docked' | 'undocked';
  liftCount: number;
  totalPauseMs: number;
  currentWorkflow: string;
  groups: string[];
  activeGroup: string | null;
  onSelectGroup: (name: string) => void;
  onAddGroup: (name: string) => void;
};

export function NetworkView({
  secondsLeft,
  fmt,
  taskColor,
  orbStatus,
  liftCount,
  totalPauseMs,
  currentWorkflow,
  groups,
  activeGroup,
  onSelectGroup,
  onAddGroup,
}: Props) {
  const orbColor = COLOR_MAP[taskColor] ?? '#E8A87C';
  return (
    <div>
      <HeroStage
        secondsLeft={secondsLeft}
        fmt={fmt}
        orbColor={orbColor}
        orbStatus={orbStatus}
        liftCount={liftCount}
        totalPauseMs={totalPauseMs}
        currentWorkflow={currentWorkflow}
      />
      <SquadsBar
        groups={groups}
        activeGroup={activeGroup}
        onSelect={onSelectGroup}
        onAdd={onAddGroup}
      />
      <DeskMap fmt={fmt} />
    </div>
  );
}
