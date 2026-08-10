'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import type { GameState, DayMode } from '@/lib/types';
import { getLevelInfo, getXPProgress, getXPForNextLevel, getXPForLevel } from '@/lib/gameEngine';
import { DAY_MODES } from '@/lib/constants';

interface HeaderProps {
  gameState: GameState;
  xpGain: number | null;
  onDayModeChange: (mode: DayMode) => void;
  onNewQuest: () => void;
  onHelp: () => void;
  onSetChallenge: (target: number, label: string) => void;
  onClearChallenge: () => void;
  onResetXP: () => void;
  challengeTargets?: { total: number; done: number };
  isShielded?: boolean;
  isDebtLocked?: boolean;
  dailyMomentum?: number;
  challengeTargetXPSum?: number;
}

export default function Header({ gameState, xpGain, onDayModeChange, onNewQuest, onHelp, onSetChallenge, onClearChallenge, onResetXP, challengeTargets, isShielded, isDebtLocked, dailyMomentum, challengeTargetXPSum }: HeaderProps) {
  const levelInfo = getLevelInfo(gameState.level);
  const xpProgress = getXPProgress(gameState.xp, gameState.level);
  const xpForNext = getXPForNextLevel(gameState.level);
  const isMaxLevel = gameState.level >= 10;

  // Challenge
  const challenge = gameState.challenge;
  const challengeEarned = challenge ? Math.max(0, gameState.xpTotal - challenge.startXP) : 0;
  const challengeProgress = challenge ? Math.min(100, (challengeEarned / challenge.target) * 100) : 0;
  const challengeDone = challenge ? challengeEarned >= challenge.target : false;

  // Panel state
  const [showPanel, setShowPanel] = useState(false);
  const [formTarget, setFormTarget] = useState(() =>
    challengeTargetXPSum && challengeTargetXPSum > 0 ? String(challengeTargetXPSum) : '500'
  );
  const [formLabel, setFormLabel] = useState('');

  useEffect(() => {
    if (challengeTargetXPSum && challengeTargetXPSum > 0) {
      setFormTarget(String(challengeTargetXPSum));
    }
  }, [challengeTargetXPSum]);
  const [confirmReset, setConfirmReset] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPanel) { setConfirmReset(false); return; }
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ borderColor: 'var(--line)', background: 'rgba(6, 9, 15, 0.92)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Top row */}
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div>
              <h1 className="josefin text-2xl font-bold" style={{ color: 'var(--gold)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                L&apos;Odyssée
              </h1>
              <p className="josefin mt-1.5" style={{ color: 'rgba(220,230,245,0.38)', letterSpacing: '0.55em', textTransform: 'uppercase', fontSize: '0.50rem', fontWeight: 100 }}>Gestionnaire de missions</p>
            </div>
          </div>

          {/* Level badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ background: 'rgba(11,18,32,0.85)', borderColor: 'var(--line)' }}>
            <div>
              <div className="text-xs font-bold leading-none josefin" style={{ color: 'var(--gold)', letterSpacing: '0.08em' }}>
                Niv. {gameState.level}
              </div>
              <div className="text-xs leading-none mt-0.5 josefin" style={{ color: 'rgba(240,232,216,0.50)', letterSpacing: '0.06em' }}>
                {levelInfo.title}
              </div>
            </div>
          </div>

          {/* Day mode */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl border"
            style={{ background: 'rgba(11,18,32,0.7)', borderColor: 'var(--line)' }}>
            {(Object.entries(DAY_MODES) as [DayMode, typeof DAY_MODES[DayMode]][]).map(([mode, cfg]) => (
              <button
                key={mode}
                onClick={() => onDayModeChange(mode)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 josefin"
                style={
                  gameState.dayMode === mode
                    ? { background: 'var(--gold)', color: '#06090F', boxShadow: '0 2px 8px rgba(201,150,60,0.3)', letterSpacing: '0.06em' }
                    : { color: 'rgba(240,232,216,0.55)', letterSpacing: '0.06em' }
                }
                title={`Boost XP ×${cfg.xpBoost}`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={onHelp}
              title="Guide"
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-all josefin"
              style={{ borderColor: 'var(--line)', color: 'rgba(240,232,216,0.60)', background: 'rgba(255,255,255,0.05)' }}
            >
              ?
            </motion.button>
            {isShielded && (
              <div
                title="Bouclier d'Athéna actif — drain XP bloqué 24h"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs josefin border"
                style={{ background: 'rgba(111,170,100,0.12)', color: '#7FAB70', borderColor: 'rgba(127,171,112,0.35)', letterSpacing: '0.06em' }}
              >
                🛡️ Athéna
              </div>
            )}
            {(dailyMomentum ?? 0) > 1 && (
              <div
                title={`Momentum ×${['1.0','1.1','1.2','1.4'][Math.min(dailyMomentum! - 1, 3)]} — ${dailyMomentum} quêtes aujourd'hui`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs josefin border"
                style={{ background: 'rgba(201,150,60,0.10)', color: 'var(--gold)', borderColor: 'rgba(201,150,60,0.28)', letterSpacing: '0.06em' }}
              >
                ⚡ ×{['1.0','1.1','1.2','1.4'][Math.min((dailyMomentum ?? 1) - 1, 3)]}
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={onNewQuest}
              disabled={!!isDebtLocked}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all josefin disabled:opacity-40 disabled:cursor-not-allowed"
              style={isDebtLocked
                ? { background: 'rgba(139,26,26,0.5)', color: '#FFD0D0', boxShadow: 'none', letterSpacing: '0.05em' }
                : { background: 'linear-gradient(135deg,#8B6520,#C9963C)', color: '#06090F', boxShadow: '0 4px 16px rgba(201,150,60,0.25)', letterSpacing: '0.05em' }
              }
              title={isDebtLocked ? 'XP négatif — remboursez la Dette de l\'Erèbe en résolvant des épreuves' : ''}
            >
              {isDebtLocked ? '⛓️ Dette' : 'Nouvelle mission'}
            </motion.button>
          </div>
        </div>

        {/* XP bar row */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium shrink-0" style={{ color: 'var(--tweed)', minWidth: '56px' }}>
            {gameState.xp.toLocaleString()} XP
          </span>
          <div className="flex-1 relative">
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(201,150,60,0.12)' }}>
              <motion.div
                className="h-full rounded-full xp-shimmer"
                initial={false}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>
            <AnimatePresence>
              {xpGain !== null && (
                <motion.div
                  key={`xp-${xpGain}-${Date.now()}`}
                  initial={{ opacity: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: 1, y: -28, scale: 1.1 }}
                  exit={{ opacity: 0, y: -48, scale: 0.8 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 text-xs font-bold pointer-events-none"
                  style={{ color: 'var(--copper)' }}
                >
                  +{xpGain} XP
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="text-xs shrink-0 text-right" style={{ color: 'var(--tweed)', minWidth: '64px' }}>
            {isMaxLevel ? (
              <span className="font-bold" style={{ color: 'var(--copper)' }}>MAX</span>
            ) : (
              <><span className="font-medium">{(xpForNext - gameState.xp).toLocaleString()}</span><span className="opacity-60"> →</span></>
            )}
          </div>

          {/* Challenge trigger button */}
          <div className="relative shrink-0" ref={panelRef}>
            <button
              onClick={() => setShowPanel(p => !p)}
              className="text-xs px-2.5 py-1 rounded-full border transition-all"
              style={challenge
                ? { borderColor: 'rgba(201,150,60,0.5)', color: '#C9963C', background: 'rgba(201,150,60,0.10)' }
                : { borderColor: 'var(--line)', color: 'rgba(240,232,216,0.45)', background: 'transparent' }
              }
            >
              {challenge ? 'Défi ·' + Math.round(challengeProgress) + '%' : '+ Défi'}
            </button>

            {/* Panel */}
            <AnimatePresence>
              {showPanel && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-8 w-72 rounded-xl shadow-2xl p-4 z-50"
                  style={{ background: '#080C17', border: '1px solid rgba(100,140,180,0.20)' }}
                >
                  {challenge ? (
                    /* Active challenge view */
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9963C' }}>
                          {challengeDone ? 'Défi accompli !' : 'Défi en cours'}
                        </p>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: '#E8EEF4' }}>
                          {challenge.label || 'Objectif XP'}
                        </p>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(220,230,245,0.55)' }}>
                          <span>{challengeEarned.toLocaleString()} XP gagnés</span>
                          <span>/{challenge.target.toLocaleString()} XP</span>
                        </div>
                        {challengeTargets && challengeTargets.total > 0 && (
                          <div className="flex justify-between text-xs mt-1 josefin" style={{ color: 'rgba(220,230,245,0.55)', letterSpacing: '0.04em' }}>
                            <span>Objectifs</span>
                            <span style={{ color: challengeTargets.done === challengeTargets.total ? '#7FAB70' : 'var(--gold)' }}>
                              {challengeTargets.done}/{challengeTargets.total}
                            </span>
                          </div>
                        )}
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(201,150,60,0.12)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            animate={{ width: `${challengeProgress}%` }}
                            transition={{ duration: 0.6 }}
                            style={{ background: challengeDone ? '#7FAB70' : 'linear-gradient(90deg,#8B6520,#C9963C)' }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => { onClearChallenge(); setShowPanel(false); }}
                        className="w-full text-xs py-1.5 rounded-lg transition-all"
                        style={{ color: 'rgba(220,230,245,0.55)', border: '1px solid rgba(100,140,180,0.18)' }}
                      >
                        Terminer le défi
                      </button>
                      <div className="pt-2 border-t" style={{ borderColor: 'rgba(100,140,180,0.14)' }}>
                        {!confirmReset ? (
                          <button
                            onClick={() => setConfirmReset(true)}
                            className="w-full text-xs py-1.5 rounded-lg transition-all"
                            style={{ color: 'rgba(224,96,96,0.80)', border: '1px solid rgba(224,96,96,0.20)' }}
                          >
                            Réinitialiser les XP
                          </button>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs text-center" style={{ color: 'rgba(220,230,245,0.55)' }}>
                              Remettre XP à 0 ?
                            </p>
                            <div className="flex gap-2">
                              <button onClick={() => setConfirmReset(false)}
                                className="flex-1 text-xs py-1.5 rounded-lg"
                                style={{ color: 'rgba(220,230,245,0.55)', border: '1px solid rgba(100,140,180,0.18)' }}>
                                Annuler
                              </button>
                              <button onClick={() => { onResetXP(); setShowPanel(false); setConfirmReset(false); }}
                                className="flex-1 text-xs py-1.5 rounded-lg font-semibold"
                                style={{ background: 'rgba(224,96,96,0.15)', color: '#E06060', border: '1px solid rgba(224,96,96,0.35)' }}>
                                Confirmer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Create challenge */
                    <div className="space-y-3">
                      <p className="text-sm font-semibold" style={{ color: '#E8EEF4' }}>Nouveau défi XP</p>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs mb-1 block" style={{ color: 'rgba(220,230,245,0.55)' }}>
                            Label (optionnel)
                          </label>
                          <input
                            type="text"
                            value={formLabel}
                            onChange={e => setFormLabel(e.target.value)}
                            placeholder="Sprint S32, Semaine intense…"
                            className="w-full text-xs px-3 py-2 rounded-lg outline-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(100,140,180,0.20)', color: '#E8EEF4' }}
                          />
                        </div>
                        <div>
                          <label className="text-xs mb-1 flex items-center justify-between" style={{ color: 'rgba(220,230,245,0.55)' }}>
                            <span>Objectif XP</span>
                            {challengeTargetXPSum && challengeTargetXPSum > 0 && (
                              <span style={{ color: 'var(--gold)', fontSize: '10px' }}>
                                ⚡ {challengeTargetXPSum} XP depuis vos cibles
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={formTarget}
                            onChange={e => setFormTarget(e.target.value)}
                            min="10"
                            className="w-full text-xs px-3 py-2 rounded-lg outline-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(100,140,180,0.20)', color: '#E8EEF4' }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const t = parseInt(formTarget, 10);
                          if (t > 0) { onSetChallenge(t, formLabel); setShowPanel(false); setFormLabel(''); }
                        }}
                        className="w-full text-xs py-2 rounded-lg font-semibold transition-all"
                        style={{ background: 'linear-gradient(135deg,#8B6520,#C9963C)', color: '#06090F' }}
                      >
                        Lancer le défi
                      </button>
                      <div className="pt-2 border-t" style={{ borderColor: 'rgba(100,140,180,0.14)' }}>
                        {!confirmReset ? (
                          <button
                            onClick={() => setConfirmReset(true)}
                            className="w-full text-xs py-1.5 rounded-lg transition-all"
                            style={{ color: 'rgba(224,96,96,0.80)', border: '1px solid rgba(224,96,96,0.20)' }}
                          >
                            Réinitialiser les XP
                          </button>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs text-center" style={{ color: 'rgba(220,230,245,0.55)' }}>
                              Remettre XP à 0 ?
                            </p>
                            <div className="flex gap-2">
                              <button onClick={() => setConfirmReset(false)}
                                className="flex-1 text-xs py-1.5 rounded-lg"
                                style={{ color: 'rgba(220,230,245,0.55)', border: '1px solid rgba(100,140,180,0.18)' }}>
                                Annuler
                              </button>
                              <button onClick={() => { onResetXP(); setShowPanel(false); setConfirmReset(false); }}
                                className="flex-1 text-xs py-1.5 rounded-lg font-semibold"
                                style={{ background: 'rgba(224,96,96,0.15)', color: '#E06060', border: '1px solid rgba(224,96,96,0.35)' }}>
                                Confirmer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Challenge progress bar (shown when active) */}
        {challenge && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 mt-2"
          >
            <span className="text-xs shrink-0 truncate max-w-[80px]" style={{ color: '#C9963C', fontSize: '11px' }}>
              {challenge.label || 'Défi'}
            </span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(201,150,60,0.10)' }}>
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${challengeProgress}%` }}
                transition={{ duration: 0.6 }}
                style={{ background: challengeDone ? '#7FAB70' : 'linear-gradient(90deg,#8B6520,#C9963C)' }}
              />
            </div>
            <span className="text-xs shrink-0" style={{ color: 'rgba(220,230,245,0.45)', fontSize: '11px' }}>
              {challengeEarned}/{challenge.target} XP
            </span>
            <button
              onClick={onClearChallenge}
              className="shrink-0 text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10"
              style={{ color: 'rgba(220,230,245,0.35)' }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </div>
    </header>
  );
}
