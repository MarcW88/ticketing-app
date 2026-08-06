'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const D = {
  bg:      '#080C17',
  bgPanel: '#0A0F1E',
  border:  'rgba(100,140,180,0.16)',
  gold:    '#C9963C',
  text:    'rgba(220,230,245,0.88)',
  muted:   'rgba(220,230,245,0.45)',
  line:    'rgba(100,140,180,0.14)',
};

const SECTIONS = [
  { id: 'overview', label: 'Présentation' },
  { id: 'create',   label: 'Nouvelle mission' },
  { id: 'board',    label: 'Le tableau' },
  { id: 'risks',    label: 'Risques & XP' },
  { id: 'xp',       label: 'Niveaux' },
  { id: 'modes',    label: 'Modes journée' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [active, setActive] = useState<SectionId>('overview');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="help-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(4,6,12,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />

          <motion.div
            key="help-modal"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed inset-x-4 top-8 bottom-8 z-50 max-w-3xl mx-auto rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ background: D.bg, border: `1px solid ${D.border}` }}
          >
            {/* Header */}
            <div className="relative flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={{ borderColor: D.line }}>
              <div className="absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${D.gold}, transparent)` }} />
              <div>
                <h2 className="font-display text-lg font-bold tracking-wide leading-none" style={{ color: '#FFFFFF' }}>
                  L'Odyssée
                </h2>
                <p className="text-xs mt-0.5 tracking-widest uppercase" style={{ color: D.muted }}>Guide de navigation</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:bg-white/10"
                style={{ color: D.muted, border: `1px solid ${D.border}` }}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left nav */}
              <nav className="w-44 shrink-0 border-r py-3 overflow-y-auto hidden sm:block"
                style={{ borderColor: D.line, background: D.bgPanel }}>
                {SECTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className="w-full text-left px-4 py-2.5 text-xs transition-all"
                    style={active === s.id
                      ? { color: '#FFFFFF', fontWeight: 600, background: 'rgba(201,150,60,0.10)', borderRight: `2px solid ${D.gold}` }
                      : { color: D.muted }
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </nav>

              {/* Mobile tabs */}
              <div className="sm:hidden w-full overflow-x-auto absolute top-[65px] left-0 right-0 flex gap-1 px-3 py-2 border-b z-10"
                style={{ borderColor: D.line, background: D.bg }}>
                {SECTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className="shrink-0 px-3 py-1 rounded-full text-xs font-medium"
                    style={active === s.id
                      ? { background: `rgba(201,150,60,0.15)`, color: D.gold, border: `1px solid rgba(201,150,60,0.35)` }
                      : { color: D.muted }
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {active === 'overview' && <SectionOverview />}
                    {active === 'create'   && <SectionCreate />}
                    {active === 'board'    && <SectionBoard />}
                    {active === 'risks'    && <SectionRisks />}
                    {active === 'xp'       && <SectionXP />}
                    {active === 'modes'    && <SectionModes />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t shrink-0"
              style={{ borderColor: D.line, background: D.bgPanel }}>
              <button
                onClick={() => {
                  const idx = SECTIONS.findIndex(s => s.id === active);
                  if (idx > 0) setActive(SECTIONS[idx - 1].id);
                }}
                disabled={SECTIONS[0].id === active}
                className="text-xs px-3 py-1.5 rounded-full transition-all disabled:opacity-20"
                style={{ color: D.muted, border: `1px solid ${D.border}` }}
              >
                Précédent
              </button>
              <span className="text-xs" style={{ color: D.muted }}>
                {SECTIONS.findIndex(s => s.id === active) + 1} / {SECTIONS.length}
              </span>
              {SECTIONS[SECTIONS.length - 1].id === active ? (
                <button
                  onClick={onClose}
                  className="text-xs px-4 py-1.5 rounded-full font-semibold transition-all"
                  style={{ background: 'linear-gradient(135deg,#8B6520,#C9963C)', color: '#06090F' }}
                >
                  Commencer
                </button>
              ) : (
                <button
                  onClick={() => {
                    const idx = SECTIONS.findIndex(s => s.id === active);
                    if (idx < SECTIONS.length - 1) setActive(SECTIONS[idx + 1].id);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{ color: D.muted, border: `1px solid ${D.border}` }}
                >
                  Suivant
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Sections ─────────────────────────────────────────────────────── */

function SectionOverview() {
  return (
    <div className="space-y-5">
      <Title title="L'Odyssée" subtitle="Gestionnaire de missions gamifié" />
      <p className="text-sm leading-relaxed" style={{ color: D.text }}>
        Chaque tâche professionnelle est une <strong style={{ color: '#FFFFFF' }}>mission</strong> sur la route d'Ithaque.
        Tu organises tes missions sur un tableau Kanban, tu gagnes de l'XP en les terminant, et tu progresses de niveau en niveau.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { title: 'Tableau Kanban', desc: 'Tes missions progressent de Port d\'Ithaque jusqu\'à Ithaque.' },
          { title: 'XP & Niveaux', desc: 'Complète des missions pour gagner de l\'XP et débloquer des exploits.' },
          { title: 'Épreuves', desc: 'Les missions en retard deviennent des Épreuves automatiquement.' },
          { title: 'Minuterie', desc: 'Chronomètre intégré pour suivre le temps passé sur chaque mission.' },
        ].map(c => (
          <InfoCard key={c.title} title={c.title} desc={c.desc} />
        ))}
      </div>

      <InfoBox>
        <strong style={{ color: '#FFFFFF' }}>Démarrage rapide :</strong>{' '}
        Clique sur <em style={{ color: D.gold }}>Nouvelle mission</em> en haut à droite, remplis le titre et sauvegarde.
        La mission apparaît dans <em>Port d'Ithaque</em>.
      </InfoBox>
    </div>
  );
}

function SectionCreate() {
  return (
    <div className="space-y-5">
      <Title title="Nouvelle mission" subtitle="Créer et configurer une mission" />

      <Steps steps={[
        { n: '1', title: 'Ouvre le formulaire', desc: 'Clique sur "Nouvelle mission" en haut à droite.' },
        { n: '2', title: 'Titre', desc: 'Écris le titre de ta tâche — c\'est le seul champ obligatoire.' },
        { n: '3', title: 'Risque', desc: 'Choisis l\'importance : Faible → Critique. Le risque détermine les XP gagnés à la complétion.' },
        { n: '4', title: 'Options (facultatif)', desc: 'Date d\'échéance, client, description, lore narrative, sous-tâches.' },
        { n: '5', title: 'Sauvegarde', desc: 'La mission apparaît dans Port d\'Ithaque. Glisse-la ou change son statut via le menu ···.' },
      ]} />

      <InfoBox>
        <strong style={{ color: '#FFFFFF' }}>Dates d'échéance :</strong>{' '}
        Une mission dépassée de plus de 2 jours devient une <em style={{ color: '#9B7FE0' }}>Épreuve</em>.
        Au-delà de 7 jours, elle est <em style={{ color: '#E06060' }}>Maudite</em> et pénalise les XP à la complétion.
      </InfoBox>
    </div>
  );
}

function SectionBoard() {
  return (
    <div className="space-y-5">
      <Title title="Le tableau" subtitle="4 colonnes de navigation" />
      <p className="text-sm" style={{ color: D.text }}>
        Les missions progressent entre 4 colonnes. Glisse une carte ou utilise le menu <strong style={{ color: '#FFFFFF' }}>···</strong>.
      </p>

      <div className="space-y-2.5">
        {[
          { accent: '#C9963C', name: "Port d'Ithaque", desc: 'Toutes tes missions en attente. Point de départ par défaut.' },
          { accent: '#6AACCF', name: 'En Mer',          desc: 'Missions sur lesquelles tu travailles activement.' },
          { accent: '#7FAB70', name: 'Ithaque',          desc: 'Missions terminées. Les XP sont accordés au passage dans cette colonne.' },
          { accent: '#9B7FE0', name: 'Épreuves',         desc: 'Missions en retard détectées automatiquement. À traiter en priorité.' },
        ].map(col => (
          <div key={col.name} className="flex items-start gap-3 p-3 rounded-xl"
            style={{ border: `1px solid ${col.accent}28`, background: `${col.accent}0A` }}>
            <div className="shrink-0 w-1 self-stretch rounded-full mt-1" style={{ background: col.accent }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: col.accent }}>{col.name}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: D.muted }}>{col.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionRisks() {
  return (
    <div className="space-y-5">
      <Title title="Risques & XP" subtitle="Calibrer l'importance d'une mission" />

      <p className="text-sm leading-relaxed" style={{ color: D.text }}>
        Le <strong style={{ color: '#FFFFFF' }}>niveau de risque</strong> détermine les XP gagnés quand tu termines une mission.
        Choisis-le selon l'impact réel de la tâche.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { risk: 'Calypso',   xp: 10,  color: '#6AACCF', desc: 'Petite correction, todo rapide.' },
          { risk: 'Scylla',    xp: 30,  color: '#C9963C', desc: 'Tâche standard de la journée.' },
          { risk: 'Charybde',  xp: 75,  color: '#E08060', desc: 'Livrable important, délai serré.' },
          { risk: 'Le Styx',   xp: 150, color: '#E06060', desc: 'Impact direct sur le business.' },
        ].map(r => (
          <div key={r.risk} className="p-3 rounded-xl"
            style={{ border: `1px solid ${r.color}30`, background: `${r.color}0A` }}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm" style={{ color: r.color }}>{r.risk}</p>
              <span className="text-xs font-bold" style={{ color: D.gold }}>+{r.xp} XP</span>
            </div>
            <p className="text-xs" style={{ color: D.muted }}>{r.desc}</p>
          </div>
        ))}
      </div>

      <InfoBox>
        <strong style={{ color: '#FFFFFF' }}>Mission maudite :</strong>{' '}
        Si une mission est maudite et que tu la termines quand même, tu reçois les XP avec une pénalité de <em style={{ color: '#E06060' }}>−30%</em>.
        Mieux vaut agir avant l'échéance.
      </InfoBox>
    </div>
  );
}

function SectionXP() {
  return (
    <div className="space-y-5">
      <Title title="Niveaux" subtitle="Progression et exploits" />

      <div className="space-y-1.5">
        {[
          { n: 1,  title: 'Naufragé',         xp: '0' },
          { n: 2,  title: 'Marin',            xp: '200' },
          { n: 3,  title: 'Navigateur',       xp: '600' },
          { n: 4,  title: 'Guerrier',         xp: '1 400' },
          { n: 5,  title: 'Hoplite',          xp: '3 000' },
          { n: 7,  title: 'Héros',            xp: '11 000' },
          { n: 10, title: 'Légende Vivante',  xp: '60 000' },
        ].map(l => (
          <div key={l.n} className="flex items-center justify-between text-xs py-1.5 border-b"
            style={{ borderColor: D.line }}>
            <div className="flex items-center gap-2">
              <span className="font-bold w-6 text-right" style={{ color: D.gold }}>{ l.n }</span>
              <span style={{ color: D.text }}>{l.title}</span>
            </div>
            <span style={{ color: D.muted }}>{l.xp} XP</span>
          </div>
        ))}
      </div>

      <InfoBox>
        <strong style={{ color: '#FFFFFF' }}>Exploits :</strong>{' '}
        Des exploits se débloquent automatiquement : première mission, 10 missions terminées, série journalière…
        Ils apparaissent en notification en bas à droite.
      </InfoBox>
    </div>
  );
}

function SectionModes() {
  return (
    <div className="space-y-5">
      <Title title="Modes journée" subtitle="Multiplicateurs d'XP selon ton agenda" />

      <p className="text-sm leading-relaxed" style={{ color: D.text }}>
        Sélectionne le mode correspondant à ta journée dans la barre en haut.
        Un multiplicateur s'applique à tous les XP gagnés dans la journée.
      </p>

      <div className="space-y-2.5">
        {[
          { label: 'Normal',    boost: '×1.0', color: '#6AACCF', desc: 'Journée standard.' },
          { label: 'Lecture',   boost: '×1.1', color: '#7FAB70', desc: 'Veille, formation, recherche.' },
          { label: 'Technique', boost: '×1.3', color: '#C9963C', desc: 'Deep-work, développement, audit.' },
          { label: 'Client',    boost: '×1.5', color: '#9B7FE0', desc: 'Réunion client, présentation, livraison.' },
        ].map(m => (
          <div key={m.label} className="flex items-center gap-4 p-3 rounded-xl"
            style={{ border: `1px solid ${m.color}25`, background: `${m.color}08` }}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm" style={{ color: m.color }}>{m.label}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${m.color}18`, color: m.color }}>
                  {m.boost}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: D.muted }}>{m.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shared sub-components ───────────────────────────────────────── */

function Title({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pb-3 border-b" style={{ borderColor: D.line }}>
      <h3 className="font-display text-xl font-bold tracking-wide" style={{ color: '#FFFFFF' }}>{title}</h3>
      <p className="text-xs mt-0.5 uppercase tracking-widest" style={{ color: D.muted }}>{subtitle}</p>
    </div>
  );
}

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ border: `1px solid ${D.border}`, background: D.bgPanel }}>
      <p className="font-semibold text-xs mb-1" style={{ color: '#FFFFFF' }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: D.muted }}>{desc}</p>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl text-xs leading-relaxed"
      style={{ background: 'rgba(201,150,60,0.08)', border: '1px solid rgba(201,150,60,0.20)', color: D.text }}>
      {children}
    </div>
  );
}

function Steps({ steps }: { steps: { n: string; title: string; desc: string }[] }) {
  return (
    <div className="space-y-3">
      {steps.map(s => (
        <div key={s.n} className="flex gap-3">
          <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(201,150,60,0.15)', color: D.gold, border: `1px solid rgba(201,150,60,0.35)` }}>
            {s.n}
          </div>
          <div className="flex-1 pb-3 border-b" style={{ borderColor: D.line }}>
            <p className="font-semibold text-sm" style={{ color: '#FFFFFF' }}>{s.title}</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: D.muted }}>{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
