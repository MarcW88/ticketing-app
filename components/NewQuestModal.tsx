'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import type { Quest, UniverseId, QuestRisk, DayMode } from '@/lib/types';
import { UNIVERSE_CONFIG, RISK_CONFIG, DAY_MODES, XP_BY_RISK } from '@/lib/constants';
import { autoDetectUniverse } from '@/lib/universeDetector';

interface NewQuestModalProps {
  isOpen: boolean;
  editingQuest: Quest | null;
  dayMode: DayMode;
  onClose: () => void;
  onSave: (data: Partial<Quest> & { id?: string }) => void;
}

const UNIVERSE_IDS = Object.keys(UNIVERSE_CONFIG) as UniverseId[];
const RISK_OPTIONS: QuestRisk[] = ['low', 'medium', 'high', 'critical'];

export default function NewQuestModal({ isOpen, editingQuest, dayMode, onClose, onSave }: NewQuestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [universe, setUniverse] = useState<UniverseId>('mario');
  const [detectedUniverse, setDetectedUniverse] = useState<UniverseId | null>(null);
  const [userPickedUniverse, setUserPickedUniverse] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [risk, setRisk] = useState<QuestRisk>('medium');
  const [client, setClient] = useState('');
  const [lore, setLore] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [subtasksRaw, setSubtasksRaw] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editingQuest;
  const dayModeBoost = DAY_MODES[dayMode]?.xpBoost ?? 1;
  const previewXP = Math.round(XP_BY_RISK[risk] * dayModeBoost);

  // Fill form when editing
  useEffect(() => {
    if (!isOpen) return;
    if (editingQuest) {
      setTitle(editingQuest.title);
      setDescription(editingQuest.description ?? '');
      setUniverse(editingQuest.universe);
      setRisk(editingQuest.risk);
      setClient(editingQuest.client ?? '');
      setLore(editingQuest.lore ?? '');
      setDueDate(editingQuest.dueDate ?? '');
      setSubtasksRaw(editingQuest.subtasks.map(s => s.title).join('\n'));
      setUserPickedUniverse(true);
    } else {
      // Prefill universe from day mode
      const defaultUniverse = DAY_MODES[dayMode]?.defaultUniverse;
      setTitle('');
      setDescription('');
      setUniverse(defaultUniverse ?? 'mario');
      setRisk('medium');
      setClient('');
      setLore('');
      setDueDate('');
      setSubtasksRaw('');
      setUserPickedUniverse(!!defaultUniverse);
      setDetectedUniverse(null);
      setShowAdvanced(false);
    }
    setTimeout(() => titleRef.current?.focus(), 80);
  }, [isOpen, editingQuest, dayMode]);

  // Auto-detect universe from title with debounce
  useEffect(() => {
    if (!title || userPickedUniverse) return;
    setIsDetecting(true);
    const t = setTimeout(() => {
      const result = autoDetectUniverse(title, description);
      if (result.confidence > 0) {
        setDetectedUniverse(result.universe);
        setUniverse(result.universe);
      }
      setIsDetecting(false);
    }, 450);
    return () => clearTimeout(t);
  }, [title, description, userPickedUniverse]);

  function handlePickUniverse(u: UniverseId) {
    setUniverse(u);
    setUserPickedUniverse(true);
    setDetectedUniverse(null);
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    if (userPickedUniverse) setUserPickedUniverse(false);
  }

  function handleSave() {
    if (!title.trim()) return;

    const subtasks = subtasksRaw
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(t => ({ id: crypto.randomUUID(), title: t, done: false }));

    onSave({
      id: editingQuest?.id,
      title: title.trim(),
      description: description.trim() || undefined,
      universe,
      missionClass: UNIVERSE_CONFIG[universe].missionClass,
      risk,
      client: client.trim() || undefined,
      lore: lore.trim() || undefined,
      dueDate: dueDate || undefined,
      xpReward: previewXP,
      subtasks,
      tags: [],
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
  }

  const selectedUniverse = UNIVERSE_CONFIG[universe];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(44, 41, 36, 0.55)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed inset-x-0 top-[5vh] bottom-[5vh] z-50 max-w-2xl mx-auto overflow-hidden rounded-2xl shadow-2xl flex flex-col"
            style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}
            onKeyDown={handleKeyDown}
          >
            {/* Universe accent strip */}
            <div className="h-1.5 w-full transition-all duration-300" style={{ background: selectedUniverse.color }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedUniverse.icon}</span>
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--petrol)' }}>
                  {isEditing ? 'Modifier la Quête' : 'Nouvelle Quête'}
                </h2>
                {isDetecting && (
                  <span className="text-xs px-2 py-0.5 rounded-full animate-pulse"
                    style={{ background: 'rgba(82,106,104,0.12)', color: 'var(--petrol)' }}>
                    Détection...
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors text-sm"
                style={{ color: 'var(--tweed)' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--tweed)' }}>
                  Titre de la mission *
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Ex: Audit technique du site principal..."
                  className="noctua-input"
                />
              </div>

              {/* Universe selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tweed)' }}>
                    Univers
                  </label>
                  {detectedUniverse && detectedUniverse === universe && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${selectedUniverse.color}18`, color: selectedUniverse.color }}
                    >
                      ✨ Détecté automatiquement
                    </motion.span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {UNIVERSE_IDS.map(uid => {
                    const ucfg = UNIVERSE_CONFIG[uid];
                    const isSelected = universe === uid;
                    return (
                      <button
                        key={uid}
                        onClick={() => handlePickUniverse(uid)}
                        className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all duration-200"
                        style={{
                          borderColor: isSelected ? ucfg.color : 'var(--line)',
                          background: isSelected ? `${ucfg.color}18` : 'rgba(255,248,234,0.6)',
                          transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                        }}
                        title={ucfg.description}
                      >
                        <span className="text-xl">{ucfg.icon}</span>
                        <span className="text-xs font-medium text-center leading-tight"
                          style={{ color: isSelected ? ucfg.color : 'var(--tweed)' }}>
                          {ucfg.name.split(' ').slice(0, 2).join(' ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs mt-1.5 italic" style={{ color: 'var(--tweed)' }}>
                  {selectedUniverse.missionName} — {selectedUniverse.description}
                </p>
              </div>

              {/* Risk */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--tweed)' }}>
                  Intensité
                </label>
                <div className="flex gap-2">
                  {RISK_OPTIONS.map(r => {
                    const rcfg = RISK_CONFIG[r];
                    const isSelected = risk === r;
                    const xp = Math.round(XP_BY_RISK[r] * dayModeBoost);
                    return (
                      <button
                        key={r}
                        onClick={() => setRisk(r)}
                        className="flex-1 py-2.5 rounded-xl border-2 transition-all duration-200 text-xs font-semibold"
                        style={{
                          borderColor: isSelected ? rcfg.color : 'var(--line)',
                          background: isSelected ? rcfg.bg : 'rgba(255,248,234,0.6)',
                          color: isSelected ? rcfg.color : 'var(--tweed)',
                        }}
                      >
                        <div>{rcfg.label}</div>
                        <div className="text-xs font-bold mt-0.5" style={{ color: isSelected ? rcfg.color : 'var(--tweed)', opacity: 0.8 }}>
                          +{xp} XP
                        </div>
                      </button>
                    );
                  })}
                </div>
                {dayModeBoost > 1 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--copper)' }}>
                    ⚡ Boost {DAY_MODES[dayMode].label} ×{dayModeBoost} actif
                  </p>
                )}
              </div>

              {/* Due date + Client row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--tweed)' }}>
                    Date limite
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="noctua-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--tweed)' }}>
                    Client / Projet
                  </label>
                  <input
                    type="text"
                    value={client}
                    onChange={e => setClient(e.target.value)}
                    placeholder="Nom du client..."
                    className="noctua-input"
                  />
                </div>
              </div>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--petrol)' }}
              >
                <span className="transition-transform duration-200" style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                Options avancées (description, lore, sous-quêtes)
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--tweed)' }}>
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Détails de la mission..."
                        className="noctua-input"
                        rows={3}
                      />
                    </div>

                    {/* Lore */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--tweed)' }}>
                        Lore <span className="normal-case font-normal">(contexte narratif)</span>
                      </label>
                      <input
                        type="text"
                        value={lore}
                        onChange={e => setLore(e.target.value)}
                        placeholder={`Ex: Mission de nuit dans les ruelles SEO...`}
                        className="noctua-input"
                      />
                    </div>

                    {/* Subtasks */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--tweed)' }}>
                        Sous-quêtes <span className="normal-case font-normal">(une par ligne)</span>
                      </label>
                      <textarea
                        value={subtasksRaw}
                        onChange={e => setSubtasksRaw(e.target.value)}
                        placeholder={"Analyser les logs\nCorrecctions on-page\nRapport final"}
                        className="noctua-input"
                        rows={4}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-between gap-3"
              style={{ borderColor: 'var(--line)', background: 'rgba(238,228,211,0.4)' }}>
              <div className="text-xs" style={{ color: 'var(--tweed)' }}>
                <span className="font-bold" style={{ color: 'var(--copper)', fontSize: '15px' }}>+{previewXP}</span>
                <span className="ml-1">XP à la complétion</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-full text-sm font-medium border transition-all hover:bg-black/5"
                  style={{ borderColor: 'var(--line)', color: 'var(--tweed)' }}
                >
                  Annuler
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="px-5 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--petrol)', color: 'var(--cream)', boxShadow: '0 4px 14px rgba(82,106,104,0.3)' }}
                >
                  {isEditing ? 'Sauvegarder' : '⚔️ Créer la Quête'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
