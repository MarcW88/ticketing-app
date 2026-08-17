'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Quest, QuestStatus } from '@/lib/types';
import { UNIVERSE_CONFIG, RISK_CONFIG, STATUS_CONFIG, NEMESIS_MESSAGES, FORCE_UNLOCK_IMMEDIATE_COST } from '@/lib/constants';
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
  hasChallenge?: boolean;
  onToggleChallengeTarget?: (id: string) => void;
  isBlocked?: boolean;
  hasMaelstrom?: boolean;
  onPenelopeWeave?: (id: string) => void;
  onForceUnlock?: (id: string) => void;
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
  if (days < 0) return '#f87171';
  if (days <= 1) return '#fb923c';
  if (days <= 3) return '#fbbf24';
  return 'rgba(240,232,216,0.60)';
}

export default function QuestCard({ quest, onStatusChange, onComplete, onEdit, onDelete, onTimerStart, onTimerPause, onTimerReset, hasChallenge, onToggleChallengeTarget, isBlocked, hasMaelstrom, onPenelopeWeave, onForceUnlock }: QuestCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const universe = UNIVERSE_CONFIG[quest.universe];
  const risk = RISK_CONFIG[quest.risk];
  const status = STATUS_CONFIG[quest.status as keyof typeof STATUS_CONFIG];

  const isHaunted = quest.status === 'haunted';
  const isCursed = quest.status === 'cursed';
  const isMaelstrom = quest.status === 'maelstrom';
  const isDone = quest.status === 'done';
  const isNoir = quest.universe === 'film_noir';
  const isInDanger = isHaunted || isCursed || isMaelstrom;

  const cardClass = [
    'noctua-card quest-card-hover relative overflow-hidden p-4 cursor-pointer',
    isHaunted ? 'card-haunted' : '',
    isCursed ? 'card-cursed' : '',
    isMaelstrom ? 'card-maelstrom' : '',
    !isInDanger ? `universe-${quest.universe}` : '',
    isNoir && !isInDanger ? 'noir-filter' : '',
    isNoir ? 'scanlines' : '',
  ].filter(Boolean).join(' ');

  const nemesisKey = isMaelstrom ? 'maelstrom' : isCursed ? 'cursed' : isHaunted ? 'haunted' : null;
  const nemesisMsg = nemesisKey
    ? NEMESIS_MESSAGES[nemesisKey][Math.floor(Math.random() * NEMESIS_MESSAGES[nemesisKey].length)]
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
      {/* Card image banner */}
      {quest.imageUrl && (
        <div className="-mx-4 -mt-4 mb-3 overflow-hidden rounded-t-lg" style={{ height: '90px' }}>
          <img
            src={quest.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: isDone ? 0.4 : 0.85 }}
          />
        </div>
      )}

      {/* Risk + Menu row */}
      <div className="flex items-center justify-between mb-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          {/* Risk */}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full josefin"
            style={{ background: risk.bg, color: risk.color, letterSpacing: '0.05em' }}
          >
            {risk.label}
          </span>
          {/* Menu */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); setConfirmDelete(false); }}
              className="w-6 h-6 flex items-center justify-center rounded-full text-xs hover:bg-black/5 transition-colors josefin"
              style={{ color: 'var(--tweed)' }}
            >
              ···
            </button>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 top-8 w-40 rounded-xl shadow-lg border z-50 overflow-hidden"
                style={{ background: 'rgba(11,18,32,0.97)', borderColor: 'var(--line)' }}
                onClick={e => e.stopPropagation()}
              >
                {quest.status === 'backlog' && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors josefin"
                    style={{ color: 'var(--sand)', letterSpacing: '0.04em' }}
                    onClick={() => { onStatusChange(quest.id, 'active'); setShowMenu(false); }}>
                    Passer en cours
                  </button>
                )}
                {quest.status === 'active' && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors josefin"
                    style={{ color: 'var(--sand)', letterSpacing: '0.04em' }}
                    onClick={() => { onStatusChange(quest.id, 'backlog'); setShowMenu(false); }}>
                    Retour au Port
                  </button>
                )}
                {isInDanger && (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors josefin"
                    style={{ color: 'var(--sand)', letterSpacing: '0.04em' }}
                    onClick={() => { onStatusChange(quest.id, 'active'); setShowMenu(false); }}>
                    Reprendre
                  </button>
                )}
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors josefin"
                  style={{ color: 'var(--sand)', letterSpacing: '0.04em' }}
                  onClick={() => { onEdit(quest); setShowMenu(false); }}>
                  Modifier
                </button>
                {!confirmDelete ? (
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-red-900/20 transition-colors josefin"
                    style={{ color: '#E06060', letterSpacing: '0.04em' }}
                    onClick={() => setConfirmDelete(true)}>
                    Supprimer
                  </button>
                ) : (
                  <button className="w-full text-left px-3 py-2 text-sm font-bold bg-red-900/20 hover:bg-red-900/30 transition-colors josefin"
                    style={{ color: '#E06060', letterSpacing: '0.04em' }}
                    onClick={() => { onDelete(quest.id); setShowMenu(false); }}>
                    Confirmer ✕
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
        {hasChallenge && (
          <button
            onClick={e => { e.stopPropagation(); onToggleChallengeTarget?.(quest.id); }}
            title={quest.challengeTarget ? 'Retirer du défi' : 'Ajouter au défi'}
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all josefin"
            style={quest.challengeTarget
              ? { background: 'rgba(201,150,60,0.20)', color: 'var(--gold)', border: '1.5px solid var(--gold)', fontSize: '10px' }
              : { background: 'transparent', color: 'rgba(240,232,216,0.22)', border: '1px solid rgba(240,232,216,0.14)', fontSize: '10px' }
            }
          >
            ◎
          </button>
        )}
      </div>

      {/* Title */}
      <h3
        className="font-semibold text-base leading-snug mb-1 josefin"
        style={{ color: isDone ? 'rgba(240,232,216,0.45)' : '#FFFFFF', textDecoration: isDone ? 'line-through' : 'none', letterSpacing: '0.03em' }}
      >
        {quest.title}
      </h3>

      {/* Lore / nemesis message */}
      {(quest.lore || nemesisMsg) && (
        <p className="text-xs italic mb-2 leading-relaxed josefin"
          style={{ color: isCursed ? '#991b1b' : isHaunted ? '#6d28d9' : 'var(--tweed)', letterSpacing: '0.03em' }}>
          {nemesisMsg ?? quest.lore}
        </p>
      )}

      {/* Subtasks progress */}
      {quest.subtasks.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1 josefin" style={{ color: 'var(--tweed)', letterSpacing: '0.04em' }}>
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
            <span className="text-xs px-2 py-0.5 rounded-full border josefin"
              style={{ borderColor: 'rgba(201,150,60,0.2)', color: 'rgba(240,232,216,0.80)', background: 'rgba(255,255,255,0.05)', letterSpacing: '0.04em' }}>
              {quest.client}
            </span>
          )}
          {/* Due date */}
          {quest.dueDate && (
            <span className="text-xs font-medium josefin" style={{ color: getDueDateColor(quest.dueDate), letterSpacing: '0.04em' }}>
              📅 {formatDueDate(quest.dueDate)}
            </span>
          )}
        </div>
        {/* XP */}
        <span className="text-xs font-bold shrink-0 josefin" style={{ color: 'var(--copper)', letterSpacing: '0.05em' }}>
          +{quest.xpReward} XP
        </span>
      </div>

      {/* Timer — shown on active / haunted / cursed / maelstrom cards */}
      {(quest.status === 'active' || isInDanger) && (
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
              onClick={() => { if (!isBlocked) onStatusChange(quest.id, 'active'); }}
              disabled={!!isBlocked}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg border transition-all josefin"
              style={isBlocked
                ? { borderColor: 'rgba(240,232,216,0.12)', color: 'rgba(240,232,216,0.25)', background: 'transparent', letterSpacing: '0.08em', cursor: 'not-allowed' }
                : { borderColor: 'var(--gold)', color: 'var(--gold)', background: 'transparent', letterSpacing: '0.08em' }
              }
              title={isBlocked ? 'Épreuves actives — résolvez-les avant de commencer' : ''}
            >
              {isBlocked ? '🔒 Bloqué' : 'Commencer'}
            </button>
          )}
          {quest.status === 'active' && (
            <>
              <button
                onClick={() => onComplete(quest.id)}
                className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all hover:shadow-sm josefin"
                style={{ background: 'linear-gradient(135deg,#8B6520,#C9963C)', color: '#06090F', letterSpacing: '0.08em' }}
              >
                Terminer
              </button>
              <button
                onClick={() => onStatusChange(quest.id, 'paused')}
                className="text-xs font-semibold py-1.5 px-3 rounded-lg border transition-all josefin"
                style={{ borderColor: '#4FA8A8', color: '#4FA8A8', background: 'transparent', letterSpacing: '0.06em' }}
                title="Mettre en Escale — en attente de confirmation client"
              >
                ⚓
              </button>
            </>
          )}
          {quest.status === 'paused' && (
            <>
              <button
                onClick={() => onStatusChange(quest.id, 'backlog')}
                className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border transition-all josefin"
                style={{ borderColor: 'rgba(79,168,168,0.45)', color: 'rgba(79,168,168,0.7)', background: 'transparent', letterSpacing: '0.04em' }}
                title="Remettre dans le Port d'Ithaque"
              >
                ⚓
              </button>
              <button
                onClick={() => onStatusChange(quest.id, 'active')}
                className="flex-1 text-xs font-semibold py-1.5 rounded-lg border transition-all josefin"
                style={{ borderColor: '#4FA8A8', color: '#4FA8A8', background: 'transparent', letterSpacing: '0.07em' }}
              >
                ⚔️ Reprendre
              </button>
              <button
                onClick={() => onComplete(quest.id)}
                className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all hover:shadow-sm josefin"
                style={{ background: 'linear-gradient(135deg,#8B6520,#C9963C)', color: '#06090F', letterSpacing: '0.08em' }}
              >
                Terminer
              </button>
            </>
          )}
          {isInDanger && (
            <button
              onClick={() => onComplete(quest.id)}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all hover:shadow-sm josefin"
              style={{ background: isMaelstrom ? 'linear-gradient(135deg,#6B0000,#B22222)' : 'linear-gradient(135deg,#8B6520,#C9963C)', color: isMaelstrom ? '#FFD0D0' : '#06090F', letterSpacing: '0.08em' }}
            >
              Terminer {isMaelstrom ? '(−50% XP)' : isCursed ? '(−25% XP)' : ''}
            </button>
          )}
        </div>
      )}

      {/* Penelope's weave button — maelstrom only */}
      {isMaelstrom && onPenelopeWeave && (
        <div className="mt-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onPenelopeWeave(quest.id)}
            className="w-full text-xs py-1 rounded-lg border transition-all josefin"
            style={{ borderColor: 'rgba(180,140,255,0.3)', color: 'rgba(180,140,255,0.8)', background: 'rgba(80,40,140,0.12)', letterSpacing: '0.06em' }}
            title="Dépenser 50 XP pour geler le drain pendant 48h"
          >
            {quest.penelopeWeavedUntil && new Date(quest.penelopeWeavedUntil) > new Date()
              ? '🧵 Tissu actif — drain gelé'
              : '🧵 Pénélope — −50 XP, drain gelé 48h'
            }
          </button>
        </div>
      )}

      {/* Force-unlock button — blocked backlog cards only */}
      {quest.status === 'backlog' && isBlocked && !quest.cannotForceUnlock && onForceUnlock && (
        <div className="mt-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onForceUnlock(quest.id)}
            className="w-full text-xs py-1 rounded-lg border transition-all josefin"
            style={{ borderColor: 'rgba(251,146,60,0.4)', color: '#fb923c', background: 'rgba(120,50,10,0.12)', letterSpacing: '0.06em' }}
            title="Libérer au prix d'un drain horaire agressif. Risque de re-verrouillage permanent en 12h ou si XP < -300."
          >
            ⚡ Libérer (−{FORCE_UNLOCK_IMMEDIATE_COST[quest.risk]} XP) — drain /h · risque escalade
          </button>
        </div>
      )}

      {/* Force-unlock active drain warning */}
      {quest.forceUnlocked && quest.status === 'active' && (
        <div className="mt-2 text-xs px-2 py-1 rounded josefin" style={{ background: 'rgba(251,146,60,0.10)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
          ⚡ Libération forcée — drain /h sur chaque carte Épreuve active
        </div>
      )}

      {/* Permanently locked badge */}
      {quest.cannotForceUnlock && !isDone && (
        <div className="mt-2 text-xs px-2 py-1 rounded josefin" style={{ background: 'rgba(80,80,80,0.15)', color: 'rgba(200,200,200,0.45)', border: '1px solid rgba(120,120,120,0.2)' }}>
          🔒 Verrouillé définitivement
        </div>
      )}

      {/* Circe trap warning */}
      {quest.circeTrapped && !isDone && (
        <div className="mt-2 text-xs px-2 py-1 rounded josefin" style={{ background: 'rgba(160,80,200,0.12)', color: 'rgba(180,120,255,0.85)', border: '1px solid rgba(160,80,200,0.25)' }}>
          💎 Circé — 0 XP à la complétion
        </div>
      )}

      {/* Ithaque sous siège badge */}
      {isDone && hasMaelstrom && (
        <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded josefin" style={{ background: 'rgba(139,26,26,0.35)', color: '#FF8080', border: '1px solid rgba(180,20,20,0.4)', fontSize: '9px', letterSpacing: '0.05em' }}>
          ⚠️ Menée
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
