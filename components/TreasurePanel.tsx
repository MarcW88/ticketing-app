'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, Objective, ObjectiveCondition, MonthRecord } from '@/lib/types';
import ObjectiveModal from './ObjectiveModal';

interface TreasurePanelProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onAddObjective: (data: Omit<Objective, 'id' | 'createdAt'>) => void;
  onEditObjective: (id: string, data: Omit<Objective, 'id' | 'createdAt'>) => void;
  onDeleteObjective: (id: string) => void;
  onUnlockObjective: (id: string) => void;
}

function fmt(n: number): string { return n.toLocaleString('fr-FR'); }

function computeActiveMonths(history: MonthRecord[]): number {
  const sorted = [...history].sort((a, b) => b.month.localeCompare(a.month));
  let count = 0;
  for (const r of sorted) {
    if (r.questsDone >= 3) count++; else break;
  }
  return count;
}

function conditionStatus(cond: ObjectiveCondition, gs: GameState, activeMonths: number): { label: string; current: number; met: boolean } {
  switch (cond.type) {
    case 'streak_days':
      return { label: `🔥 Streak ${cond.value}j`, current: gs.streak, met: gs.streak >= cond.value };
    case 'boss_quests':
      return { label: `💀 ${cond.value} quêtes critiques`, current: gs.bossQuestsCompleted ?? 0, met: (gs.bossQuestsCompleted ?? 0) >= cond.value };
    case 'active_months':
      return { label: `📅 ${cond.value} mois actifs`, current: activeMonths, met: activeMonths >= cond.value };
  }
}

function canUnlock(obj: Objective, gs: GameState, activeMonths: number): boolean {
  if (obj.unlockedAt) return false;
  if ((gs.xpTotal ?? 0) < obj.xpRequired) return false;
  if ((gs.coins ?? 0) < obj.coinCost) return false;
  if (obj.conditions) {
    for (const c of obj.conditions) {
      if (!conditionStatus(c, gs, activeMonths).met) return false;
    }
  }
  return true;
}

export default function TreasurePanel({ isOpen, onClose, gameState, onAddObjective, onEditObjective, onDeleteObjective, onUnlockObjective }: TreasurePanelProps) {
  const [confirmId,    setConfirmId]    = useState<string | null>(null);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editing,      setEditing]      = useState<Objective | null>(null);
  const [deleteId,     setDeleteId]     = useState<string | null>(null);

  const coins       = gameState.coins ?? 0;
  const xpTotal     = gameState.xpTotal ?? 0;
  const streak      = gameState.streak;
  const boss        = gameState.bossQuestsCompleted ?? 0;
  const history     = gameState.monthlyHistory ?? [];
  const objectives  = gameState.objectives ?? [];

  const activeMonths = useMemo(() => computeActiveMonths(history), [history]);

  const pending   = objectives.filter(o => !o.unlockedAt);
  const unlocked  = objectives.filter(o =>  o.unlockedAt);

  function handleOpenAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function handleOpenEdit(obj: Objective) {
    setEditing(obj);
    setModalOpen(true);
  }

  function handleSaveModal(data: Omit<Objective, 'id' | 'createdAt'>) {
    if (editing) {
      onEditObjective(editing.id, data);
    } else {
      onAddObjective(data);
    }
    setModalOpen(false);
    setEditing(null);
  }

  function handleUnlock(id: string) {
    if (confirmId === id) {
      onUnlockObjective(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
    }
  }

  function handleDelete(id: string) {
    if (deleteId === id) {
      onDeleteObjective(id);
      setDeleteId(null);
    } else {
      setDeleteId(id);
    }
  }

  function ObjectiveCard({ obj }: { obj: Objective }) {
    const unlockable  = canUnlock(obj, gameState, activeMonths);
    const isConfirm   = confirmId === obj.id;
    const isDelete    = deleteId  === obj.id;
    const xpPct       = obj.xpRequired > 0 ? Math.min(100, (xpTotal / obj.xpRequired) * 100) : 100;
    const coinPct     = obj.coinCost > 0   ? Math.min(100, (coins  / obj.coinCost)   * 100) : 100;
    const xpMet       = xpTotal >= obj.xpRequired;
    const coinMet     = coins   >= obj.coinCost;
    const done        = !!obj.unlockedAt;

    return (
      <div
        className="rounded-2xl p-4 mb-3"
        style={{
          background: done ? 'rgba(127,171,112,0.07)' : 'rgba(255,255,255,0.03)',
          border: done ? '1px solid rgba(127,171,112,0.3)' : unlockable ? '1px solid rgba(201,150,60,0.35)' : '1px solid rgba(255,255,255,0.07)',
        }}
        onClick={() => { setConfirmId(null); setDeleteId(null); }}
      >
        {/* Title row */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{obj.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold josefin text-sm" style={{ color: done ? '#7FAB70' : 'var(--tweed)' }}>
              {obj.name}
              {done && <span className="ml-2 text-xs">✓ débloqué</span>}
            </p>
            {obj.description && (
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(240,232,216,0.45)' }}>{obj.description}</p>
            )}
            {done && obj.unlockedAt && (
              <p className="text-xs mt-0.5 josefin" style={{ color: 'rgba(127,171,112,0.6)' }}>
                {new Date(obj.unlockedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          {!done && (
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={e => { e.stopPropagation(); handleOpenEdit(obj); }}
                className="text-xs px-2 py-1 rounded-lg josefin"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,232,216,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
              >✏️</button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(obj.id); }}
                className="text-xs px-2 py-1 rounded-lg josefin"
                style={{ background: isDelete ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)', color: isDelete ? '#F87171' : 'rgba(240,232,216,0.5)', border: `1px solid ${isDelete ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.1)'}` }}
              >{isDelete ? 'Confirm' : '🗑️'}</button>
            </div>
          )}
        </div>

        {!done && (
          <>
            {/* XP bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs josefin mb-1" style={{ color: xpMet ? '#7FAB70' : 'rgba(240,232,216,0.5)' }}>
                <span>📊 XP total</span>
                <span>{fmt(Math.min(xpTotal, obj.xpRequired))} / {fmt(obj.xpRequired)}</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${xpPct}%`, background: xpMet ? '#7FAB70' : 'rgba(120,160,110,0.5)' }} />
              </div>
            </div>

            {/* Coin bar */}
            {obj.coinCost > 0 && (
              <div className="mb-2">
                <div className="flex justify-between text-xs josefin mb-1" style={{ color: coinMet ? 'var(--gold)' : 'rgba(240,232,216,0.5)' }}>
                  <span>🪙 Drachmes</span>
                  <span>{fmt(Math.min(coins, obj.coinCost))} / {fmt(obj.coinCost)}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${coinPct}%`, background: coinMet ? 'linear-gradient(90deg,#8B6520,#C9963C)' : 'rgba(201,150,60,0.4)' }} />
                </div>
              </div>
            )}

            {/* Extra conditions */}
            {obj.conditions?.map(cond => {
              const { label, current, met } = conditionStatus(cond, gameState, activeMonths);
              return (
                <div key={cond.type} className="flex items-center gap-2 text-xs josefin mt-1.5" style={{ color: met ? '#7FAB70' : 'rgba(240,232,216,0.45)' }}>
                  <span>{met ? '✓' : '✕'}</span>
                  <span>{label}</span>
                  <span className="ml-auto" style={{ color: 'rgba(240,232,216,0.4)' }}>{fmt(current)} / {fmt(cond.value)}</span>
                </div>
              );
            })}

            {/* Unlock button */}
            <button
              onClick={e => { e.stopPropagation(); handleUnlock(obj.id); }}
              disabled={!unlockable}
              className="w-full mt-3 py-2 rounded-xl text-xs font-bold josefin transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={isConfirm
                ? { background: 'rgba(201,150,60,0.35)', color: '#fff', border: '1px solid rgba(201,150,60,0.6)' }
                : unlockable
                  ? { background: 'linear-gradient(135deg,#8B6520,#C9963C)', color: '#06090F' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(240,232,216,0.3)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {isConfirm ? `⚠️ Confirmer — dépenser ${fmt(obj.coinCost)} 🪙` : unlockable ? `🎉 Débloquer — ${fmt(obj.coinCost)} 🪙` : '🔒 Conditions non réunies'}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(6,9,15,0.5)' }}
              onClick={onClose}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
              style={{ width: 'min(480px, 100vw)', background: 'rgba(10,13,20,0.98)', borderLeft: '1px solid rgba(201,150,60,0.2)', boxShadow: '-16px 0 48px rgba(0,0,0,0.6)' }}
              onClick={() => { setConfirmId(null); setDeleteId(null); }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div>
                  <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>⚱️ Trésor d&apos;Ithaque</h2>
                  <p className="text-xs josefin mt-0.5" style={{ color: 'rgba(240,232,216,0.45)' }}>Tes objectifs. Ton prix. Ta combinaison XP + Drachmes.</p>
                </div>
                <button onClick={onClose} className="text-xl" style={{ color: 'rgba(240,232,216,0.45)' }}>✕</button>
              </div>

              {/* Balance */}
              <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs josefin" style={{ color: 'rgba(240,232,216,0.45)' }}>🪙 DRACHMES</p>
                    <p className="text-2xl font-bold font-display" style={{ color: 'var(--gold)' }}>{fmt(coins)}</p>
                  </div>
                  <div>
                    <p className="text-xs josefin" style={{ color: 'rgba(240,232,216,0.45)' }}>📊 XP TOTAL</p>
                    <p className="text-2xl font-bold font-display" style={{ color: 'var(--tweed)' }}>{fmt(xpTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs josefin" style={{ color: 'rgba(240,232,216,0.45)' }}>🔥 STREAK</p>
                    <p className="text-2xl font-bold font-display" style={{ color: streak >= 7 ? '#F59E0B' : 'var(--tweed)' }}>{streak}j</p>
                  </div>
                  <div>
                    <p className="text-xs josefin" style={{ color: 'rgba(240,232,216,0.45)' }}>💀 BOSS</p>
                    <p className="text-2xl font-bold font-display" style={{ color: 'var(--tweed)' }}>{boss}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">

                {/* Pending objectives */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs josefin" style={{ color: 'rgba(240,232,216,0.5)', letterSpacing: '0.1em' }}>
                    — OBJECTIFS ({pending.length}) —
                  </p>
                  <button
                    onClick={handleOpenAdd}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs josefin font-bold transition-all"
                    style={{ background: 'rgba(201,150,60,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,150,60,0.35)' }}
                  >
                    + Ajouter
                  </button>
                </div>

                {pending.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-3">🎯</p>
                    <p className="text-sm josefin" style={{ color: 'rgba(240,232,216,0.4)' }}>Aucun objectif défini.</p>
                    <p className="text-xs josefin mt-1" style={{ color: 'rgba(240,232,216,0.25)' }}>Crée le tien — voyage, tech, formation, quoi que ce soit.</p>
                  </div>
                )}

                {pending.map(obj => <ObjectiveCard key={obj.id} obj={obj} />)}

                {/* Unlocked */}
                {unlocked.length > 0 && (
                  <>
                    <p className="text-xs josefin mt-6 mb-3" style={{ color: 'rgba(127,171,112,0.6)', letterSpacing: '0.1em' }}>
                      — DÉBLOQUÉS ({unlocked.length}) —
                    </p>
                    {unlocked.map(obj => <ObjectiveCard key={obj.id} obj={obj} />)}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-xs italic josefin" style={{ color: 'rgba(240,232,216,0.25)' }}>
                  🪙 Drachmes gagnées par jalons · Niveau ×10 · Boss quête +15 · Streak 7j/14j/30j +25/50/100
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ObjectiveModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSaveModal}
        existing={editing ?? undefined}
      />
    </>
  );
}
