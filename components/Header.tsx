'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, DayMode } from '@/lib/types';
import { getLevelInfo, getXPProgress, getXPForNextLevel, getXPForLevel } from '@/lib/gameEngine';
import { DAY_MODES } from '@/lib/constants';

interface HeaderProps {
  gameState: GameState;
  xpGain: number | null;
  onDayModeChange: (mode: DayMode) => void;
  onNewQuest: () => void;
  onHelp: () => void;
}

export default function Header({ gameState, xpGain, onDayModeChange, onNewQuest, onHelp }: HeaderProps) {
  const levelInfo = getLevelInfo(gameState.level);
  const xpProgress = getXPProgress(gameState.xp, gameState.level);
  const xpForCurrent = getXPForLevel(gameState.level);
  const xpForNext = getXPForNextLevel(gameState.level);

  const isMaxLevel = gameState.level >= 10;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ borderColor: 'var(--line)', background: 'rgba(6, 9, 15, 0.92)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Top row */}
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Logo + title */}
          <div className="flex items-center gap-3 shrink-0">
            <div>
              <h1 className="font-display text-xl font-bold leading-none" style={{ color: 'var(--gold)' }}>
                L&apos;Odyssée
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(240,232,216,0.45)' }}>Gestionnaire de missions</p>
            </div>
          </div>

          {/* Level badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ background: 'rgba(11,18,32,0.85)', borderColor: 'var(--line)' }}>
            <div>
              <div className="text-xs font-bold leading-none" style={{ color: 'var(--gold)' }}>
                Niv. {gameState.level}
              </div>
              <div className="text-xs leading-none mt-0.5" style={{ color: 'rgba(240,232,216,0.50)' }}>
                {levelInfo.title}
              </div>
            </div>
          </div>

          {/* Day mode selector */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl border"
            style={{ background: 'rgba(11,18,32,0.7)', borderColor: 'var(--line)' }}>
            {(Object.entries(DAY_MODES) as [DayMode, typeof DAY_MODES[DayMode]][]).map(([mode, cfg]) => (
              <button
                key={mode}
                onClick={() => onDayModeChange(mode)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={
                  gameState.dayMode === mode
                    ? { background: 'var(--gold)', color: '#06090F', boxShadow: '0 2px 8px rgba(201,150,60,0.3)' }
                    : { color: 'rgba(240,232,216,0.55)' }
                }
                title={`Boost XP ×${cfg.xpBoost}`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Companion + New Quest */}
          <div className="flex items-center gap-2">
            {/* Help button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onHelp}
              title="Guide"
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-all"
              style={{ borderColor: 'var(--line)', color: 'rgba(240,232,216,0.60)', background: 'rgba(255,255,255,0.05)' }}
            >
              ?
            </motion.button>

            {/* New Quest button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onNewQuest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg,#8B6520,#C9963C)', color: '#06090F', boxShadow: '0 4px 16px rgba(201,150,60,0.25)' }}
            >
              Nouvelle mission
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
            {/* XP gain float */}
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
              <>
                <span className="font-medium">{(xpForNext - gameState.xp).toLocaleString()}</span>
                <span className="opacity-60"> XP →</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
