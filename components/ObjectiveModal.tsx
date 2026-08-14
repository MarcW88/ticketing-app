'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Objective, ObjectiveCondition, ObjectiveConditionType } from '@/lib/types';

interface ObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Objective, 'id' | 'createdAt'>) => void;
  existing?: Objective;
}

const CONDITION_LABELS: Record<ObjectiveConditionType, string> = {
  streak_days:    '🔥 Streak minimum (jours)',
  boss_quests:    '💀 Quêtes critiques complétées',
  active_months:  '📅 Mois actifs consécutifs',
};

const ICON_PRESETS = ['🎯', '🌍', '📚', '💻', '🎸', '🏔️', '🚀', '🎓', '🏠', '✈️', '🎨', '💪'];

export default function ObjectiveModal({ isOpen, onClose, onSave, existing }: ObjectiveModalProps) {
  const ec = existing?.conditions;
  const eStreak = ec?.find(c => c.type === 'streak_days');
  const eBoss   = ec?.find(c => c.type === 'boss_quests');
  const eMonths = ec?.find(c => c.type === 'active_months');

  const [icon,        setIcon]        = useState(existing?.icon        ?? '🎯');
  const [name,        setName]        = useState(existing?.name        ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [xpRequired,  setXpRequired]  = useState(String(existing?.xpRequired ?? 500));
  const [coinCost,    setCoinCost]    = useState(String(existing?.coinCost    ?? 50));
  const [useStreak,   setUseStreak]   = useState(!!eStreak);
  const [streakDays,  setStreakDays]  = useState(String(eStreak?.value ?? 7));
  const [useBoss,     setUseBoss]     = useState(!!eBoss);
  const [bossCount,   setBossCount]   = useState(String(eBoss?.value   ?? 1));
  const [useMonths,   setUseMonths]   = useState(!!eMonths);
  const [monthsCount, setMonthsCount] = useState(String(eMonths?.value ?? 3));

  function handleSave() {
    if (!name.trim()) return;
    const conditions: ObjectiveCondition[] = [];
    if (useStreak) conditions.push({ type: 'streak_days',   value: Math.max(1, parseInt(streakDays)  || 7)  });
    if (useBoss)   conditions.push({ type: 'boss_quests',   value: Math.max(1, parseInt(bossCount)   || 1)  });
    if (useMonths) conditions.push({ type: 'active_months', value: Math.max(1, parseInt(monthsCount) || 3)  });
    onSave({
      name:        name.trim(),
      description: description.trim() || undefined,
      icon:        icon || '🎯',
      xpRequired:  Math.max(0, parseInt(xpRequired) || 500),
      coinCost:    Math.max(0, parseInt(coinCost)    || 50),
      conditions:  conditions.length > 0 ? conditions : undefined,
      unlockedAt:  existing?.unlockedAt,
    });
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: 'var(--tweed)',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(6,9,15,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-full max-w-md rounded-2xl p-6"
              style={{ background: 'rgba(12,16,24,0.99)', border: '1px solid rgba(201,150,60,0.25)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}
            >
              <h2 className="font-display text-lg font-bold mb-5" style={{ color: 'var(--gold)' }}>
                {existing ? '✏️ Modifier l\'objectif' : '🎯 Nouvel objectif'}
              </h2>

              {/* Icon picker */}
              <div className="mb-4">
                <p className="text-xs josefin mb-2" style={{ color: 'rgba(240,232,216,0.5)' }}>ICÔNE</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ICON_PRESETS.map(i => (
                    <button
                      key={i}
                      onClick={() => setIcon(i)}
                      className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                      style={{ background: icon === i ? 'rgba(201,150,60,0.25)' : 'rgba(255,255,255,0.05)', border: icon === i ? '1px solid rgba(201,150,60,0.5)' : '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {i}
                    </button>
                  ))}
                  <input
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                    placeholder="✨"
                    className="w-16 text-center text-lg josefin"
                    style={{ ...inputStyle, width: '64px', padding: '4px' }}
                  />
                </div>
              </div>

              {/* Name */}
              <div className="mb-4">
                <p className="text-xs josefin mb-2" style={{ color: 'rgba(240,232,216,0.5)' }}>NOM *</p>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ex. Vacances en Italie, MacBook Pro, Formation React…"
                  style={inputStyle}
                  className="josefin"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <p className="text-xs josefin mb-2" style={{ color: 'rgba(240,232,216,0.5)' }}>DESCRIPTION (optionnelle)</p>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Détails, motivation, contexte…"
                  style={inputStyle}
                  className="josefin"
                />
              </div>

              {/* XP + Coins */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <p className="text-xs josefin mb-2" style={{ color: 'rgba(240,232,216,0.5)' }}>📊 XP TOTAL REQUIS</p>
                  <input
                    type="number"
                    min={0}
                    value={xpRequired}
                    onChange={e => setXpRequired(e.target.value)}
                    style={inputStyle}
                    className="josefin"
                  />
                  <p className="text-xs mt-1 josefin" style={{ color: 'rgba(240,232,216,0.3)' }}>XP cumulatif (jamais perdu)</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs josefin mb-2" style={{ color: 'var(--gold)', opacity: 0.7 }}>🪙 DRACHMES À DÉPENSER</p>
                  <input
                    type="number"
                    min={0}
                    value={coinCost}
                    onChange={e => setCoinCost(e.target.value)}
                    style={inputStyle}
                    className="josefin"
                  />
                  <p className="text-xs mt-1 josefin" style={{ color: 'rgba(240,232,216,0.3)' }}>Précieus — gagnés par jalons</p>
                </div>
              </div>

              {/* Conditions */}
              <div className="mb-5">
                <p className="text-xs josefin mb-3" style={{ color: 'rgba(240,232,216,0.5)' }}>CONDITIONS SUPPLÉMENTAIRES (optionnelles)</p>
                <div className="space-y-2">
                  {([
                    { key: 'streak',  use: useStreak,  setUse: setUseStreak,  val: streakDays,  setVal: setStreakDays,  label: CONDITION_LABELS.streak_days,   unit: 'jours' },
                    { key: 'boss',    use: useBoss,    setUse: setUseBoss,    val: bossCount,   setVal: setBossCount,   label: CONDITION_LABELS.boss_quests,   unit: 'quêtes' },
                    { key: 'months',  use: useMonths,  setUse: setUseMonths,  val: monthsCount, setVal: setMonthsCount, label: CONDITION_LABELS.active_months,  unit: 'mois' },
                  ] as const).map(c => (
                    <div key={c.key} className="flex items-center gap-3">
                      <button
                        onClick={() => c.setUse(!c.use)}
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: c.use ? 'rgba(201,150,60,0.35)' : 'rgba(255,255,255,0.08)', border: c.use ? '1px solid rgba(201,150,60,0.6)' : '1px solid rgba(255,255,255,0.15)' }}
                      >
                        {c.use && <span className="text-xs" style={{ color: 'var(--gold)' }}>✓</span>}
                      </button>
                      <span className="text-sm josefin flex-1" style={{ color: c.use ? 'var(--tweed)' : 'rgba(240,232,216,0.4)' }}>{c.label}</span>
                      {c.use && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            value={c.val}
                            onChange={e => c.setVal(e.target.value)}
                            className="josefin text-center"
                            style={{ ...inputStyle, width: '56px', padding: '4px 8px' }}
                          />
                          <span className="text-xs josefin" style={{ color: 'rgba(240,232,216,0.4)' }}>{c.unit}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm josefin font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,232,216,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm josefin font-bold transition-all disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg,#8B6520,#C9963C)', color: '#06090F' }}
                >
                  {existing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
