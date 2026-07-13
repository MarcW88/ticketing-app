'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Quest, QuestStatus } from '@/lib/types';
import { UNIVERSE_CONFIG, RISK_CONFIG, STATUS_CONFIG, NEMESIS_MESSAGES } from '@/lib/constants';
import QuestTimer from './QuestTimer';

interface QuestCardProps {
  quest: Quest;
  onStatusChange: (id: string, status: QuestStatus) => void;
  onComplete: (id: string) => void;
  onEdit: (quest: Quest) => void;
  onDelete: (id: string) => void;
  onTimerStart: (id: string) => void;
  onTimerPause: (id: string) => void;
  onTimerReset: (id: string) => void;
}

function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueDate(dueDate: string): string {
  const days = getDaysUntilDue(dueDate);
  if (days < 0) return `${Math.abs(days)}j de retard`;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  return `${days}j restants`;
}

function getDueDateColor(dueDate: string): string {
  const days = getDaysUntilDue(dueDate);
  if (days < 0) return '#991b1b';
  if (days <= 1) return '#c2410c';
  if (days <= 3) return '#92400e';
  return '#526a68';
}

export default function QuestCard({ quest, onStatusChange, onComplete, onEdit, onDelete, onTimerStart, onTimerPause, onTimerReset }: QuestCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const universe = UNIVERSE_CONFIG[quest.universe];
  const risk = RISK_CONFIG[quest.risk];
  const status = STATUS_CONFIG[quest.status];

  const isHaunted = quest.status === 'haunted';
  const isCursed = quest.status === 'cursed';
  const isDone = quest.status === 'done';
  const isNoir = quest.universe === 'film_noir';

  const cardClass = [
    'noctua-card quest-card-hover relative overflow-hidden p-4 cursor-pointer',
    isHaunted ? 'card-haunted' : '',
    isCursed ? 'card-cursed' : '',
    !isHaunted && !isCursed ? `universe-${quest.universe}` : '',
    isNoir && !isHaunted && !isCursed ? 'noir-filter' : '',
    isNoir ? 'scanlines' : '',
  ].filter(Boolean).join(' ');

  const nemesisMsg = (isHaunted || isCursed)
    ? NEMESIS_MESSAGES[isCursed ? 'cursed' : 'haunted'][
        Math.floor(Math.random() * NEMESIS_MESSAGES[isCursed ? 'cursed' : 'haunted'].length)
      ]
    : null;

  const subtasksDone = quest.subtasks.filter(s => s.done).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cardClass}
      onClick={() => onEdit(quest)}
    >
      {/* Universe + Status badges */}
      <div className="flex items-center justify-between mb-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <span className="text-base">{universe.icon}</span>
          <span className="text-xs font-medium" style={{ color: universe.color }}>
            {universe.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Risk */}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: risk.bg, color: risk.color }}
          >
            {risk.label}
          </span>
          {/* Menu */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); setConfirmDelete(false); }}
              className="w-6 h-6 flex items-center justify-center rounded-full text-xs hover:bg-black/5 transition-colors"
              style={{ color: 'var(--tweed)' }}
            >
              ···
            </button>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 top-8 w-40 rounded-xl shadow-lg border z-50 overflow-hidden"
                style={{ background: 'var(--cream)', borderColor: 'var(--line)' }}
                onClick={e => e.stopPropagation()}
              >
                {quest.status === 'backlog' && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 transition-colors"
                    style={{ color: 'var(--ink)' }}
                    onClick={() => { onStatusChange(quest.id, 'active'); setShowMenu(false); }}>
                    ⚙️ Démarrer
                  </button>
                )}
                {quest.status === 'active' && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 transition-colors"
                    style={{ color: 'var(--ink)' }}
                    onClick={() => { onStatusChange(quest.id, 'backlog'); setShowMenu(false); }}>
                    📋 Repasser en Backlog
                  </button>
                )}
                {(isHaunted || isCursed) && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 transition-colors"
                    style={{ color: 'var(--ink)' }}
                    onClick={() => { onStatusChange(quest.id, 'active'); setShowMenu(false); }}>
                    ⚔️ Reprendre la Quête
                  </button>
                )}
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 transition-colors"
                  style={{ color: 'var(--ink)' }}
                  onClick={() => { onEdit(quest); setShowMenu(false); }}>
                  ✏️ Modifier
                </button>
                {!confirmDelete ? (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 transition-colors"
                    style={{ color: '#991b1b' }}
                    onClick={() => setConfirmDelete(true)}>
                    🗑️ Supprimer
                  </button>
                ) : (
                  <button className="w-full text-left px-3 py-2 text-sm font-bold bg-red-50 hover:bg-red-100 transition-colors"
                    style={{ color: '#991b1b' }}
                    onClick={() => { onDelete(quest.id); setShowMenu(false); }}>
                    Confirmer ✕
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <h3
        className="font-semibold text-sm leading-snug mb-1"
        style={{ color: isDone ? 'var(--tweed)' : 'var(--ink)', textDecoration: isDone ? 'line-through' : 'none' }}
      >
        {quest.title}
      </h3>

      {/* Lore / nemesis message */}
      {(quest.lore || nemesisMsg) && (
        <p className="text-xs italic mb-2 leading-relaxed"
          style={{ color: isCursed ? '#991b1b' : isHaunted ? '#6d28d9' : 'var(--tweed)' }}>
          {nemesisMsg ?? quest.lore}
        </p>
      )}

      {/* Subtasks progress */}
      {quest.subtasks.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--tweed)' }}>
            <span>Sous-quêtes</span>
            <span>{subtasksDone}/{quest.subtasks.length}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(139,122,100,0.18)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(subtasksDone / quest.subtasks.length) * 100}%`,
                background: 'var(--petrol)',
              }}
            />
          </div>
        </div>
      )}

      {/* Footer meta */}
      <div className="flex items-center justify-between mt-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Client */}
          {quest.client && (
            <span className="text-xs px-2 py-0.5 rounded-full border"
              style={{ borderColor: 'var(--line)', color: 'var(--tweed)', background: 'rgba(255,248,234,0.6)' }}>
              {quest.client}
            </span>
          )}
          {/* Due date */}
          {quest.dueDate && (
            <span className="text-xs font-medium" style={{ color: getDueDateColor(quest.dueDate) }}>
              📅 {formatDueDate(quest.dueDate)}
            </span>
          )}
        </div>
        {/* XP */}
        <span className="text-xs font-bold shrink-0" style={{ color: 'var(--copper)' }}>
          +{quest.xpReward} XP
        </span>
      </div>

      {/* Timer — shown on active / haunted / cursed cards */}
      {(quest.status === 'active' || isHaunted || isCursed) && (
        <QuestTimer
          timeSpent={quest.timeSpent ?? 0}
          timerStartedAt={quest.timerStartedAt}
          onStart={() => onTimerStart(quest.id)}
          onPause={() => onTimerPause(quest.id)}
          onReset={() => onTimerReset(quest.id)}
        />
      )}

      {/* Action row */}
      {!isDone && (
        <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
          {quest.status === 'backlog' && (
            <button
              onClick={() => onStatusChange(quest.id, 'active')}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg border transition-all hover:shadow-sm"
              style={{ borderColor: 'var(--petrol)', color: 'var(--petrol)', background: 'transparent' }}
            >
              ⚙️ Démarrer
            </button>
          )}
          {(quest.status === 'active' || isHaunted || isCursed) && (
            <button
              onClick={() => onComplete(quest.id)}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all hover:shadow-sm"
              style={{ background: 'var(--petrol)', color: 'var(--cream)', boxShadow: '0 2px 8px rgba(82,106,104,0.2)' }}
            >
              ✅ Terminer {isCursed && '(−XP)'}
            </button>
          )}
        </div>
      )}

      {/* Done overlay */}
      {isDone && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-4xl opacity-5">✅</span>
        </div>
      )}
    </motion.div>
  );
}
