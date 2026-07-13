'use client';

import { motion } from 'framer-motion';
import type { UniverseId, Quest } from '@/lib/types';
import { UNIVERSE_CONFIG } from '@/lib/constants';

interface UniverseFilterProps {
  current: UniverseId | 'all';
  quests: Quest[];
  onChange: (filter: UniverseId | 'all') => void;
}

const ALL_OPTION = { id: 'all' as const, name: 'Tous', icon: '🌐', color: '#526a68' };

export default function UniverseFilter({ current, quests, onChange }: UniverseFilterProps) {
  const universeIds = Object.keys(UNIVERSE_CONFIG) as UniverseId[];

  function countFor(uid: UniverseId | 'all') {
    if (uid === 'all') return quests.filter(q => q.status !== 'done').length;
    return quests.filter(q => q.universe === uid && q.status !== 'done').length;
  }

  return (
    <div
      className="flex items-center gap-1.5 px-4 py-3 border-b overflow-x-auto"
      style={{ borderColor: 'var(--line)', background: 'rgba(247,241,231,0.7)' }}
    >
      {/* All button */}
      <FilterTab
        id="all"
        label={ALL_OPTION.name}
        icon={ALL_OPTION.icon}
        color={ALL_OPTION.color}
        count={countFor('all')}
        isActive={current === 'all'}
        onClick={() => onChange('all')}
      />
      <div className="w-px h-5 mx-1 shrink-0" style={{ background: 'var(--line)' }} />
      {/* Universe buttons */}
      {universeIds.map(uid => (
        <FilterTab
          key={uid}
          id={uid}
          label={UNIVERSE_CONFIG[uid].name.split(' ').slice(-1)[0]}
          icon={UNIVERSE_CONFIG[uid].icon}
          color={UNIVERSE_CONFIG[uid].color}
          count={countFor(uid)}
          isActive={current === uid}
          onClick={() => onChange(uid)}
        />
      ))}
    </div>
  );
}

function FilterTab({
  id, label, icon, color, count, isActive, onClick,
}: {
  id: string; label: string; icon: string; color: string;
  count: number; isActive: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 relative"
      style={
        isActive
          ? { background: `${color}18`, color, border: `1.5px solid ${color}40`, fontWeight: 700 }
          : { color: 'var(--tweed)', border: '1.5px solid transparent' }
      }
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
      {count > 0 && (
        <span
          className="text-xs font-bold px-1.5 py-0 rounded-full min-w-[18px] text-center"
          style={{ background: isActive ? color : 'var(--sand)', color: isActive ? 'white' : 'var(--tweed-deep)' }}
        >
          {count}
        </span>
      )}
      {isActive && (
        <motion.div
          layoutId="universe-indicator"
          className="absolute inset-0 rounded-full"
          style={{ background: `${color}10`, border: `1.5px solid ${color}50` }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
    </motion.button>
  );
}
