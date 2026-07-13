'use client';

import { AnimatePresence } from 'framer-motion';
import type { Quest, QuestStatus, UniverseId } from '@/lib/types';
import { STATUS_CONFIG, UNIVERSE_CONFIG } from '@/lib/constants';
import QuestCard from './QuestCard';

interface QuestBoardProps {
  quests: Quest[];
  universeFilter: UniverseId | 'all';
  onStatusChange: (id: string, status: QuestStatus) => void;
  onComplete: (id: string) => void;
  onEdit: (quest: Quest) => void;
  onDelete: (id: string) => void;
  onNewQuest: () => void;
}

const COLUMNS: { status: QuestStatus; label: string; icon: string; accent: string }[] = [
  { status: 'backlog', label: 'Backlog',   icon: '📋', accent: '#c2915d' },
  { status: 'active',  label: 'En Quête',  icon: '⚙️', accent: '#526a68' },
  { status: 'done',    label: 'Terminée',  icon: '✅', accent: '#2D6A4F' },
  { status: 'haunted', label: 'Maudites',  icon: '👻', accent: '#6D28D9' },
];

function EmptyColumn({ status, onNewQuest }: { status: QuestStatus; onNewQuest: () => void }) {
  const msgs = {
    backlog: { text: 'Aucune quête en attente.', cta: '+ Ajouter une quête', icon: '📜' },
    active:  { text: 'Aucune quête active.', cta: '+ Démarrer une quête', icon: '⚔️' },
    done:    { text: 'Terminez votre première quête pour gagner de l\'XP.', cta: null, icon: '🏆' },
    haunted: { text: 'Aucune quête en retard. Bon travail, Architecte.', cta: null, icon: '🕊️' },
    cursed:  { text: 'Aucune quête maudite.', cta: null, icon: '🕊️' },
  };
  const m = msgs[status] ?? msgs.backlog;
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center opacity-60">
      <span className="text-3xl mb-2">{m.icon}</span>
      <p className="text-xs" style={{ color: 'var(--tweed)' }}>{m.text}</p>
      {m.cta && (
        <button
          onClick={onNewQuest}
          className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all hover:shadow-sm"
          style={{ borderColor: 'var(--petrol)', color: 'var(--petrol)' }}
        >
          {m.cta}
        </button>
      )}
    </div>
  );
}

export default function QuestBoard({
  quests,
  universeFilter,
  onStatusChange,
  onComplete,
  onEdit,
  onDelete,
  onNewQuest,
}: QuestBoardProps) {
  const filtered = universeFilter === 'all'
    ? quests
    : quests.filter(q => q.universe === universeFilter);

  function getColumnQuests(status: QuestStatus) {
    if (status === 'haunted') {
      return filtered.filter(q => q.status === 'haunted' || q.status === 'cursed');
    }
    return filtered.filter(q => q.status === status);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 px-4 pt-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {COLUMNS.map(col => {
        const colQuests = getColumnQuests(col.status);
        return (
          <div
            key={col.status}
            className="kanban-column flex-shrink-0 flex flex-col"
            style={{ width: '300px', minWidth: '280px' }}
          >
            {/* Column header */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-t-2xl border-b"
              style={{ borderColor: 'var(--line)', borderTopColor: col.accent, borderTopWidth: 3 }}
            >
              <div className="flex items-center gap-2">
                <span>{col.icon}</span>
                <span className="font-display font-bold text-sm" style={{ color: 'var(--petrol)' }}>
                  {col.label}
                </span>
              </div>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${col.accent}18`, color: col.accent }}
              >
                {colQuests.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {colQuests.length === 0 ? (
                  <EmptyColumn status={col.status} onNewQuest={onNewQuest} />
                ) : (
                  colQuests.map(quest => (
                    <QuestCard
                      key={quest.id}
                      quest={quest}
                      onStatusChange={onStatusChange}
                      onComplete={onComplete}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {/* Universe legend (visible when filtered) */}
      {universeFilter !== 'all' && (
        <div className="flex-shrink-0 w-64 self-start">
          <div className="noctua-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{UNIVERSE_CONFIG[universeFilter].icon}</span>
              <div>
                <p className="font-display font-bold text-sm" style={{ color: 'var(--petrol)' }}>
                  {UNIVERSE_CONFIG[universeFilter].name}
                </p>
                <p className="text-xs" style={{ color: 'var(--tweed)' }}>
                  {UNIVERSE_CONFIG[universeFilter].missionName}
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--tweed)' }}>
              {UNIVERSE_CONFIG[universeFilter].description}
            </p>
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--line)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
                {filtered.filter(q => q.status === 'done').length} terminées
                {' · '}
                {filtered.filter(q => q.status !== 'done').length} actives
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
