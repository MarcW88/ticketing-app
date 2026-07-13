'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '@/lib/constants';

interface AchievementToastProps {
  achievementIds: string[];
  onDismiss: (id: string) => void;
}

export default function AchievementToast({ achievementIds, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    if (achievementIds.length === 0) return;
    setVisible(prev => [...new Set([...prev, ...achievementIds])]);

    const timers = achievementIds.map(id =>
      setTimeout(() => {
        setVisible(prev => prev.filter(v => v !== id));
        onDismiss(id);
      }, 4500)
    );
    return () => timers.forEach(clearTimeout);
  }, [achievementIds, onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visible.map(id => {
          const def = ACHIEVEMENTS.find(a => a.id === id);
          if (!def) return null;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, x: 80, scale: 0.88 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border"
              style={{
                background: 'var(--cream)',
                borderColor: 'var(--copper)',
                borderWidth: 1.5,
                minWidth: 260,
                maxWidth: 320,
              }}
            >
              {/* Glow border top */}
              <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg, var(--copper), var(--sand), var(--copper))' }} />

              <span className="text-3xl">{def.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--copper)' }}>
                  Succès débloqué
                </p>
                <p className="font-display font-bold text-sm leading-tight" style={{ color: 'var(--ink)' }}>
                  {def.title}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--tweed)' }}>
                  {def.description}
                </p>
              </div>

              <button
                onClick={() => { setVisible(p => p.filter(v => v !== id)); onDismiss(id); }}
                className="shrink-0 text-xs rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/5"
                style={{ color: 'var(--tweed)' }}
              >
                ✕
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
