'use client';

import type { Quest } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';

interface UniverseFilterProps {
  current: string;
  quests: Quest[];
  onChange: (filter: string) => void;
}

type StatusKey = keyof typeof STATUS_CONFIG;

const STATUS_KEYS: StatusKey[] = ['backlog', 'active', 'paused', 'haunted', 'cursed'];
const DANGER_STATUSES = ['haunted', 'cursed', 'maelstrom'];

export default function UniverseFilter({ current, quests, onChange }: UniverseFilterProps) {
  const totalActive = quests.filter(q => q.status !== 'done' && q.status !== 'archived').length;
  const getCount = (key: StatusKey) => {
    if (key === 'haunted') return quests.filter(q => DANGER_STATUSES.includes(q.status)).length;
    return quests.filter(q => q.status === key).length;
  };

  return (
    <div
      className="flex items-center gap-1.5 px-4 py-2.5 border-b overflow-x-auto"
      style={{ borderColor: 'var(--line)', background: 'rgba(6,9,15,0.85)' }}
    >
      {/* All */}
      <StatusTab
        label="Toutes"
        color="var(--gold)"
        count={totalActive}
        isActive={current === 'all'}
        onClick={() => onChange('all')}
      />
      <div className="w-px h-4 mx-1 shrink-0" style={{ background: 'var(--line)' }} />
      {STATUS_KEYS.map(key => {
        const cfg = STATUS_CONFIG[key];
        const count = getCount(key);
        const color =
          key === 'cursed'  ? '#E06060' :
          key === 'haunted' ? '#9B7FE0' :
          key === 'done'    ? '#7FAB70' :
          key === 'active'  ? '#6AACCF' :
          key === 'paused'  ? '#4FA8A8' :
          'var(--gold)';
        return (
          <StatusTab
            key={key}
            label={cfg.label}
            color={color}
            count={count}
            isActive={current === key}
            onClick={() => onChange(key)}
          />
        );
      })}
    </div>
  );
}

function StatusTab({ label, color, count, isActive, onClick }: {
  label: string; color: string; count: number; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 josefin"
      style={
        isActive
          ? { background: `rgba(201,150,60,0.12)`, color, border: `1.5px solid ${color}`, fontWeight: 600, letterSpacing: '0.06em' }
          : { color: 'rgba(240,232,216,0.60)', border: '1.5px solid transparent', letterSpacing: '0.06em' }
      }
    >
      <span>{label}</span>
      {count > 0 && (
        <span
          className="text-xs font-bold px-1.5 rounded-full min-w-[18px] text-center"
          style={{
            background: isActive ? color : 'rgba(201,150,60,0.12)',
            color: isActive ? '#06090F' : 'var(--gold)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
