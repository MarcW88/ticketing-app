'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getLevelInfo } from '@/lib/gameEngine';

interface LevelUpOverlayProps {
  newLevel: number | null;
  onDone: () => void;
}

export default function LevelUpOverlay({ newLevel, onDone }: LevelUpOverlayProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; dx: number; dy: number }[]>([]);

  useEffect(() => {
    if (!newLevel) return;
    const colors = ['#F7A800', '#c2915d', '#526a68', '#C9A84C', '#6D28D9'];
    const ps = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 10,
      y: 50 + (Math.random() - 0.5) * 10,
      color: colors[i % colors.length],
      dx: (Math.random() - 0.5) * 180,
      dy: -Math.random() * 200 - 60,
    }));
    setParticles(ps);
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [newLevel, onDone]);

  const levelInfo = newLevel ? getLevelInfo(newLevel) : null;

  return (
    <AnimatePresence>
      {newLevel && levelInfo && (
        <>
          {/* Backdrop */}
          <motion.div
            key="lvl-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(44, 41, 36, 0.72)', backdropFilter: 'blur(6px)' }}
            onClick={onDone}
          />

          {/* Content */}
          <motion.div
            key="lvl-content"
            initial={{ opacity: 0, scale: 0.5, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className="flex flex-col items-center gap-4 px-12 py-10 rounded-3xl level-glow"
              style={{ background: 'var(--cream)', border: '2px solid var(--copper)', minWidth: 320 }}
            >
              {/* Glow ring */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="text-7xl"
              >
                {levelInfo.icon}
              </motion.div>

              <div className="text-center">
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: 'var(--copper)' }}
                >
                  Niveau atteint
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="font-display text-4xl font-bold"
                  style={{ color: 'var(--petrol)' }}
                >
                  Niveau {newLevel}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38 }}
                  className="font-display text-lg font-bold mt-1"
                  style={{ color: 'var(--tweed)' }}
                >
                  {levelInfo.title}
                </motion.p>
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={onDone}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="pointer-events-auto px-6 py-2.5 rounded-full text-sm font-bold transition-all mt-2"
                style={{ background: 'var(--petrol)', color: 'var(--cream)', boxShadow: '0 4px 16px rgba(82,106,104,0.35)' }}
              >
                Continuer la Quête →
              </motion.button>
            </div>
          </motion.div>

          {/* Particles */}
          <div className="particles-container pointer-events-none">
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, x: `${p.x}vw`, y: `${p.y}vh`, scale: 1 }}
                animate={{ opacity: 0, x: `calc(${p.x}vw + ${p.dx}px)`, y: `calc(${p.y}vh + ${p.dy}px)`, scale: 0.2 }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: Math.random() * 0.3 }}
                className="particle fixed"
                style={{ background: p.color, width: 10, height: 10, borderRadius: '50%' }}
              />
            ))}
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
