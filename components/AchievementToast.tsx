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
              className="pointer-events-auto relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl overflow-hidden"
              style={{
                background: '#080C17',
                border: '1px solid rgba(201,150,60,0.30)',
                minWidth: 260,
                maxWidth: 320,
              }}
            >
              {/* Gold top accent line */}
              <div className="absolute inset-x-0 top-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, #C9963C, transparent)' }} />

              {/* Gold dot indicator */}
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(201,150,60,0.12)', border: '1px solid rgba(201,150,60,0.35)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: '#C9963C' }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9963C' }}>
                  Exploit accompli
                </p>
                <p className="font-semibold text-sm leading-tight mt-0.5" style={{ color: '#E8EEF4' }}>
                  {def.title}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(220,230,245,0.50)' }}>
                  {def.description}
                </p>
              </div>

              <button
                onClick={() => { setVisible(p => p.filter(v => v !== id)); onDismiss(id); }}
                className="shrink-0 text-xs rounded-full w-5 h-5 flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: 'rgba(220,230,245,0.40)' }}
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
