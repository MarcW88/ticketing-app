'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import type { Quest, UniverseId, QuestRisk, DayMode } from '@/lib/types';
import { UNIVERSE_CONFIG, RISK_CONFIG, DAY_MODES, XP_BY_RISK, ORACLE_MESSAGES } from '@/lib/constants';
import { autoDetectUniverse, autoDetectRisk } from '@/lib/universeDetector';

interface NewQuestModalProps {
  isOpen: boolean;
  editingQuest: Quest | null;
  dayMode: DayMode;
  onClose: () => void;
  onSave: (data: Partial<Quest> & { id?: string }) => void;
  isDebtLocked?: boolean;
}

function getOracleMessage(dueDate: string): { msg: string; color: string } {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0)  return { msg: ORACLE_MESSAGES.overdue,     color: '#f87171' };
  if (days === 0) return { msg: ORACLE_MESSAGES.today,       color: '#fb923c' };
  if (days === 1) return { msg: ORACLE_MESSAGES.tomorrow,    color: '#fb923c' };
  if (days <= 5)  return { msg: ORACLE_MESSAGES.soonHaunted, color: '#c084fc' };
  if (days <= 10) return { msg: ORACLE_MESSAGES.comfortable, color: 'rgba(240,232,216,0.55)' };
  return { msg: ORACLE_MESSAGES.relaxed, color: '#7FAB70' };
}

const UNIVERSE_IDS = Object.keys(UNIVERSE_CONFIG) as UniverseId[];
const RISK_OPTIONS: QuestRisk[] = ['low', 'medium', 'high', 'critical'];

export default function NewQuestModal({ isOpen, editingQuest, dayMode, onClose, onSave, isDebtLocked }: NewQuestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [universe, setUniverse] = useState<UniverseId>('odyssey');
  const [detectedUniverse, setDetectedUniverse] = useState<UniverseId | null>(null);
  const [userPickedUniverse, setUserPickedUniverse] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [risk, setRisk] = useState<QuestRisk>('medium');
  const [detectedRisk, setDetectedRisk] = useState<QuestRisk | null>(null);
  const [userPickedRisk, setUserPickedRisk] = useState(false);
  const [riskReason, setRiskReason] = useState('');
  const [client, setClient] = useState('');
  const [lore, setLore] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [subtasksRaw, setSubtasksRaw] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

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
      setImageUrl(editingQuest.imageUrl);
      setUserPickedUniverse(true);
      setUserPickedRisk(true);
    } else {
      // Prefill universe from day mode
      const defaultUniverse = DAY_MODES[dayMode]?.defaultUniverse;
      setTitle('');
      setDescription('');
      setUniverse(defaultUniverse ?? 'odyssey');
      setRisk('medium');
      setClient('');
      setLore('');
      setDueDate('');
      setSubtasksRaw('');
      setImageUrl(undefined);
      setUserPickedUniverse(!!defaultUniverse);
      setDetectedUniverse(null);
      setDetectedRisk(null);
      setUserPickedRisk(false);
      setRiskReason('');
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

  // Auto-detect risk from title + description + due date
  useEffect(() => {
    if (!title || userPickedRisk) return;
    const t = setTimeout(() => {
      const result = autoDetectRisk(title, description, dueDate);
      setDetectedRisk(result.risk);
      setRisk(result.risk);
      setRiskReason(result.reason);
    }, 450);
    return () => clearTimeout(t);
  }, [title, description, dueDate, userPickedRisk]);

  function handlePickUniverse(u: UniverseId) {
    setUniverse(u);
    setUserPickedUniverse(true);
    setDetectedUniverse(null);
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    if (userPickedUniverse) setUserPickedUniverse(false);
    if (userPickedRisk) setUserPickedRisk(false);
  }

  function handlePickRisk(r: QuestRisk) {
    setRisk(r);
    setUserPickedRisk(true);
    setDetectedRisk(null);
    setRiskReason('');
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
      imageUrl,
    });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImageUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
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
            style={{ background: '#0D1525', border: '1px solid rgba(201,150,60,0.25)' }}
            onKeyDown={handleKeyDown}
          >
            {/* Universe accent strip */}
            <div className="h-1.5 w-full transition-all duration-300" style={{ background: selectedUniverse.color }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚓</span>
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--gold)' }}>
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
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-sm"
                style={{ color: 'var(--sand)' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--sand)' }}>
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

              {/* Universe: always odyssey, hidden */}

              {/* Risk */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sand)' }}>
                    Intensité
                  </label>
                  {detectedRisk && detectedRisk === risk && riskReason && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${RISK_CONFIG[risk].bg}`, color: RISK_CONFIG[risk].color }}
                    >
                      ✨ {riskReason}
                    </motion.span>
                  )}
                </div>
                <div className="flex gap-2">
                  {RISK_OPTIONS.map(r => {
                    const rcfg = RISK_CONFIG[r];
                    const isSelected = risk === r;
                    const isAutoDetected = detectedRisk === r && !userPickedRisk;
                    const xp = Math.round(XP_BY_RISK[r] * dayModeBoost);
                    return (
                      <button
                        key={r}
                        onClick={() => handlePickRisk(r)}
                        className="flex-1 py-2.5 rounded-xl border-2 transition-all duration-200 text-xs font-semibold relative"
                        style={{
                          borderColor: isSelected ? rcfg.color : 'rgba(201,150,60,0.15)',
                          background: isSelected ? rcfg.bg : 'rgba(255,255,255,0.04)',
                          color: isSelected ? rcfg.color : 'var(--sand)',
                          transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                        }}
                      >
                        {isAutoDetected && (
                          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center"
                            style={{ background: rcfg.color, fontSize: '8px' }}>✨</span>
                        )}
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
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--sand)' }}>
                    Date limite <span style={{ color: '#E06060' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => { setDueDate(e.target.value); setUserPickedRisk(false); }}
                    className="noctua-input"
                    style={!dueDate ? { borderColor: 'rgba(224,96,96,0.5)', boxShadow: '0 0 0 1px rgba(224,96,96,0.25)' } : {}}
                  />
                  {dueDate && (() => { const o = getOracleMessage(dueDate); return (
                    <p className="text-xs mt-1.5 italic josefin" style={{ color: o.color, letterSpacing: '0.03em' }}>{o.msg}</p>
                  ); })()}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--sand)' }}>
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
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--sand)' }}>
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
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--sand)' }}>
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
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--sand)' }}>
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

                    {/* Image */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--sand)' }}>
                        Image de la carte <span className="normal-case font-normal">(optionnel)</span>
                      </label>
                      {imageUrl && (
                        <div className="relative mb-2 rounded-lg overflow-hidden" style={{ height: '100px' }}>
                          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setImageUrl(undefined)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs josefin"
                            style={{ background: 'rgba(0,0,0,0.65)', color: '#E8EEF4' }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      <label
                        className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-all josefin text-xs"
                        style={{ borderColor: 'rgba(201,150,60,0.25)', color: 'rgba(220,230,245,0.65)', background: 'rgba(255,255,255,0.04)', letterSpacing: '0.05em' }}
                      >
                        <span>+ Choisir une image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-between gap-3"
              style={{ borderColor: 'rgba(201,150,60,0.2)', background: 'rgba(6,9,15,0.6)' }}>
              <div className="text-xs" style={{ color: 'var(--sand)' }}>
                <span className="font-bold" style={{ color: 'var(--copper)', fontSize: '15px' }}>+{previewXP}</span>
                <span className="ml-1">XP à la complétion</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-full text-sm font-medium border transition-all hover:bg-white/10"
                  style={{ borderColor: 'rgba(201,150,60,0.3)', color: 'var(--sand)' }}
                >
                  Annuler
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={!title.trim() || !dueDate || !!isDebtLocked}
                  className="px-5 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--gold)', color: '#06090F', boxShadow: '0 4px 14px rgba(201,150,60,0.4)' }}
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
