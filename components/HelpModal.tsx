'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: 'overview', icon: '🗺️', label: 'Vue d\'ensemble' },
  { id: 'create',   icon: '⚔️', label: 'Créer une quête' },
  { id: 'board',    icon: '📋', label: 'Le tableau' },
  { id: 'universes', icon: '🌌', label: 'Les univers' },
  { id: 'xp',       icon: '✨', label: 'XP & Niveaux' },
  { id: 'modes',    icon: '🕐', label: 'Modes journée' },
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
            style={{ background: 'rgba(44, 41, 36, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          <motion.div
            key="help-modal"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed inset-x-4 top-8 bottom-8 z-50 max-w-3xl mx-auto rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ background: 'var(--cream)', border: '1.5px solid var(--line)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={{ borderColor: 'var(--line)', background: 'rgba(238,228,211,0.5)' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📜</span>
                <div>
                  <h2 className="font-display text-lg font-bold leading-none" style={{ color: 'var(--petrol)' }}>
                    Guide du Codex
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tweed)' }}>Tout ce qu'il faut savoir</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:bg-black/8"
                style={{ color: 'var(--tweed)' }}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left nav */}
              <nav className="w-40 shrink-0 border-r py-3 overflow-y-auto hidden sm:block"
                style={{ borderColor: 'var(--line)', background: 'rgba(247,241,231,0.5)' }}>
                {SECTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-all"
                    style={active === s.id
                      ? { color: 'var(--petrol)', fontWeight: 700, background: 'rgba(82,106,104,0.1)', borderRight: '2px solid var(--petrol)' }
                      : { color: 'var(--tweed)' }
                    }
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </nav>

              {/* Mobile tab bar */}
              <div className="sm:hidden w-full overflow-x-auto absolute top-[73px] left-0 right-0 flex gap-1 px-3 py-2 border-b z-10"
                style={{ borderColor: 'var(--line)', background: 'var(--cream)' }}>
                {SECTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className="shrink-0 px-2 py-1 rounded-full text-xs font-medium"
                    style={active === s.id
                      ? { background: 'var(--petrol)', color: 'var(--cream)' }
                      : { color: 'var(--tweed)', background: 'rgba(139,122,100,0.1)' }
                    }
                  >
                    {s.icon}
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
                    {active === 'universes' && <SectionUniverses />}
                    {active === 'xp'       && <SectionXP />}
                    {active === 'modes'    && <SectionModes />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between px-6 py-3 border-t shrink-0"
              style={{ borderColor: 'var(--line)', background: 'rgba(238,228,211,0.4)' }}>
              <button
                onClick={() => {
                  const idx = SECTIONS.findIndex(s => s.id === active);
                  if (idx > 0) setActive(SECTIONS[idx - 1].id);
                }}
                disabled={SECTIONS[0].id === active}
                className="text-xs px-3 py-1.5 rounded-full transition-all disabled:opacity-30"
                style={{ color: 'var(--tweed)', background: 'rgba(139,122,100,0.12)' }}
              >
                ← Précédent
              </button>
              <span className="text-xs" style={{ color: 'var(--tweed)' }}>
                {SECTIONS.findIndex(s => s.id === active) + 1} / {SECTIONS.length}
              </span>
              {SECTIONS[SECTIONS.length - 1].id === active ? (
                <button
                  onClick={onClose}
                  className="text-xs px-4 py-1.5 rounded-full font-bold transition-all"
                  style={{ background: 'var(--petrol)', color: 'var(--cream)' }}
                >
                  C'est parti ! ⚔️
                </button>
              ) : (
                <button
                  onClick={() => {
                    const idx = SECTIONS.findIndex(s => s.id === active);
                    if (idx < SECTIONS.length - 1) setActive(SECTIONS[idx + 1].id);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{ color: 'var(--tweed)', background: 'rgba(139,122,100,0.12)' }}
                >
                  Suivant →
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Section components ──────────────────────────────────────────── */

function SectionOverview() {
  return (
    <div className="space-y-5">
      <Title icon="🗺️" title="Qu'est-ce que le Codex ?" />
      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
        Le Codex des Mondes est un <strong>gestionnaire de tâches gamifié</strong>. Chaque tâche devient une <em>Quête</em>,
        classée dans un univers narratif. Tu gagnes de l'XP en complétant tes quêtes et tu montes en niveau.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '📋', title: 'Tableau Kanban', desc: 'Tes quêtes avancent de colonne en colonne, de Backlog à Terminée.' },
          { icon: '🌌', title: '5 Univers', desc: 'Chaque quête appartient à un univers selon son type (tech, contenu, réunion…).' },
          { icon: '✨', title: 'XP & Niveaux', desc: 'Complète des quêtes pour gagner de l\'XP et débloquer des succès.' },
          { icon: '👻', title: 'Quêtes hantées', desc: 'Les quêtes en retard deviennent "hantées" puis "maudites" automatiquement.' },
        ].map(c => (
          <Card key={c.title} icon={c.icon} title={c.title} desc={c.desc} />
        ))}
      </div>

      <InfoBox>
        💡 <strong>Workflow rapide :</strong> Clique sur <em>⚔️ Nouvelle Quête</em> → remplis le titre → sauvegarde.
        L'univers est détecté automatiquement. La quête arrive dans le <strong>Backlog</strong>.
      </InfoBox>
    </div>
  );
}

function SectionCreate() {
  return (
    <div className="space-y-5">
      <Title icon="⚔️" title="Créer une quête" />

      <Steps steps={[
        {
          n: '1',
          title: 'Ouvre le formulaire',
          desc: 'Clique sur le bouton ⚔️ Nouvelle Quête en haut à droite (ou sur le + dans une colonne).',
        },
        {
          n: '2',
          title: 'Titre & description',
          desc: 'Écris le titre de ta tâche. L\'univers est détecté en live pendant que tu tapes — tu peux le garder ou le changer manuellement.',
        },
        {
          n: '3',
          title: 'Risque',
          desc: (
            <span>Choisis l'importance : <em>Faible</em> (petit bug) → <em>Critique</em> (livraison urgente). Le risque détermine les XP gagnés.</span>
          ),
        },
        {
          n: '4',
          title: 'Options avancées (facultatif)',
          desc: 'Ajoute une date d\'échéance, un client, une lore (description narrative) et des sous-tâches.',
        },
        {
          n: '5',
          title: 'Sauvegarde',
          desc: 'La quête apparaît immédiatement dans la colonne Backlog. Glisse-la ou change son statut depuis le menu ···.',
        },
      ]} />

      <InfoBox>
        📅 <strong>Date d'échéance :</strong> si la quête dépasse 2 jours de retard elle devient <em>Hantée 👻</em>,
        au-delà de 7 jours elle est <em>Maudite 💀</em>. Complète-la pour lever la malédiction !
      </InfoBox>
    </div>
  );
}

function SectionBoard() {
  return (
    <div className="space-y-5">
      <Title icon="📋" title="Le tableau Kanban" />
      <p className="text-sm" style={{ color: 'var(--ink)' }}>
        Les quêtes se déplacent entre 4 colonnes selon leur avancement.
      </p>

      <div className="space-y-2.5">
        {[
          { color: '#526a68', icon: '📦', name: 'Backlog', desc: 'Toutes tes quêtes en attente. Le point de départ par défaut.' },
          { color: '#c2915d', icon: '⚙️', name: 'En Quête', desc: 'Ce sur quoi tu travailles activement en ce moment.' },
          { color: '#4a8c5c', icon: '✅', name: 'Terminée', desc: 'Mission accomplie ! Tu reçois l\'XP au passage en "Terminée".' },
          { color: '#7c3aed', icon: '👻', name: 'Hantée / Maudite', desc: 'Quêtes en retard détectées automatiquement. Elles sont mises en évidence pour que tu les traites en priorité.' },
        ].map(col => (
          <div key={col.name} className="flex items-start gap-3 p-3 rounded-xl border"
            style={{ borderColor: `${col.color}30`, background: `${col.color}08` }}>
            <span className="text-xl shrink-0 mt-0.5">{col.icon}</span>
            <div>
              <p className="font-bold text-sm" style={{ color: col.color }}>{col.name}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--tweed)' }}>{col.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <InfoBox>
        🔄 Pour déplacer une quête : clique sur <strong>···</strong> sur la carte → <em>Changer le statut</em>,
        ou utilise les boutons d'action rapide en bas de chaque carte.
      </InfoBox>
    </div>
  );
}

function SectionUniverses() {
  const univers = [
    { icon: '🍄', color: '#e4522b', name: 'Mario — Plateforme', desc: 'Petites tâches simples, corrections rapides, todo du quotidien. Mots-clés : fix, correction, mise à jour…' },
    { icon: '🗡️', color: '#2c3e50', name: 'Assassin\'s Creed — Infiltration', desc: 'Tâches techniques : audit, migration, refonte, SEO, architecture. Mots-clés : audit, migration, crawl, architecture…' },
    { icon: '🕷️', color: '#c0392b', name: 'Spider-Man — Urbain', desc: 'Réunions, ateliers, reporting, communication client. Mots-clés : call, réunion, atelier, rapport…' },
    { icon: '⚛️', color: '#2980b9', name: 'Blake Crouch — Temporel', desc: 'Expérimentations, tests A/B, versions multiples. Mots-clés : test, expériment, variant, version…' },
    { icon: '🎬', color: '#1a1a2e', name: 'Film Noir — Narration', desc: 'Rédaction, articles, scripts, contenu éditorial. Mots-clés : article, texte, copy, story, script…' },
  ];

  return (
    <div className="space-y-5">
      <Title icon="🌌" title="Les 5 univers" />
      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
        Chaque quête appartient à un <strong>univers narratif</strong> qui reflète sa nature.
        L'univers est <strong>auto-détecté</strong> depuis le titre/description, mais tu peux toujours le changer manuellement.
      </p>

      <div className="space-y-2">
        {univers.map(u => (
          <div key={u.name} className="flex items-start gap-3 p-3 rounded-xl border"
            style={{ borderColor: `${u.color}25`, background: `${u.color}08` }}>
            <span className="text-xl shrink-0 mt-0.5">{u.icon}</span>
            <div>
              <p className="font-bold text-sm" style={{ color: u.color }}>{u.name}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--tweed)' }}>{u.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <InfoBox>
        🤖 <strong>Auto-détection :</strong> dès que tu tapes le titre, le système analyse les mots-clés
        et propose un univers avec un score de confiance. Tu peux l'override avec le sélecteur dans le formulaire.
      </InfoBox>
    </div>
  );
}

function SectionXP() {
  return (
    <div className="space-y-5">
      <Title icon="✨" title="XP & Niveaux" />

      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
        Tu gagnes de l'XP en <strong>passant une quête en "Terminée"</strong>. Le montant dépend du risque choisi.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {[
          { risk: 'Faible', xp: 20, color: '#4a8c5c', icon: '🟢' },
          { risk: 'Moyen', xp: 50, color: '#c2915d', icon: '🟡' },
          { risk: 'Élevé', xp: 100, color: '#c2541b', icon: '🟠' },
          { risk: 'Critique', xp: 200, color: '#7c3aed', icon: '🔴' },
        ].map(r => (
          <div key={r.risk} className="p-3 rounded-xl border text-center"
            style={{ borderColor: `${r.color}30`, background: `${r.color}10` }}>
            <p className="text-lg">{r.icon}</p>
            <p className="font-bold text-sm mt-1" style={{ color: r.color }}>{r.risk}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--copper)' }}>+{r.xp} XP</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tweed)' }}>
          Progression des niveaux
        </p>
        {[
          { n: 1, title: 'Pèlerin du Codex', xp: '0' },
          { n: 2, title: 'Explorateur', xp: '100' },
          { n: 3, title: 'Chasseur de Quêtes', xp: '250' },
          { n: 5, title: 'Maître des Mondes', xp: '700' },
          { n: 10, title: 'Archiviste Légendaire', xp: '3000+' },
        ].map(l => (
          <div key={l.n} className="flex items-center justify-between text-xs py-1 border-b"
            style={{ borderColor: 'var(--line)', color: 'var(--tweed)' }}>
            <span className="font-bold" style={{ color: 'var(--petrol)' }}>Niv. {l.n} — {l.title}</span>
            <span style={{ color: 'var(--copper)' }}>{l.xp} XP</span>
          </div>
        ))}
      </div>

      <InfoBox>
        🏆 <strong>Succès :</strong> des succès spéciaux se débloquent automatiquement (première quête,
        série de 3 jours, 10 quêtes terminées…). Ils apparaissent en toast en bas à droite.
      </InfoBox>
    </div>
  );
}

function SectionModes() {
  return (
    <div className="space-y-5">
      <Title icon="🕐" title="Modes journée" />

      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
        Le <strong>mode journée</strong> applique un multiplicateur d'XP sur toutes les quêtes complétées
        dans la journée. Change-le depuis la barre en haut selon ton agenda.
      </p>

      <div className="space-y-2.5">
        {[
          { icon: '⚡', label: 'Normal', boost: '×1.0', color: '#526a68', desc: 'Mode standard. Pas de bonus particulier.' },
          { icon: '📚', label: 'Lecture', boost: '×1.1', color: '#2980b9', desc: 'Journée de veille ou de formation. Léger bonus.' },
          { icon: '🔧', label: 'Technique', boost: '×1.3', color: '#c2915d', desc: 'Journée deep-work technique. Bon bonus XP pour les tâches longues.' },
          { icon: '🤝', label: 'Client', boost: '×1.5', color: '#7c3aed', desc: 'Journée client ou commerciale. Maximum de XP — ces journées valent cher !' },
        ].map(m => (
          <div key={m.label} className="flex items-center gap-4 p-3 rounded-xl border"
            style={{ borderColor: `${m.color}25`, background: `${m.color}08` }}>
            <span className="text-2xl shrink-0">{m.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm" style={{ color: m.color }}>{m.label}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${m.color}20`, color: m.color }}>
                  {m.boost} XP
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tweed)' }}>{m.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <InfoBox>
        🔥 <strong>Série journalière :</strong> si tu complètes au moins une quête chaque jour,
        tu maintiens une série. Visible sur le compagnon en haut à droite.
      </InfoBox>
    </div>
  );
}

/* ── Shared sub-components ───────────────────────────────────────── */

function Title({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--line)' }}>
      <span className="text-2xl">{icon}</span>
      <h3 className="font-display text-xl font-bold" style={{ color: 'var(--petrol)' }}>{title}</h3>
    </div>
  );
}

function Card({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--line)', background: 'rgba(238,228,211,0.4)' }}>
      <div className="text-xl mb-1.5">{icon}</div>
      <p className="font-bold text-xs mb-1" style={{ color: 'var(--petrol)' }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--tweed)' }}>{desc}</p>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl text-xs leading-relaxed"
      style={{ background: 'rgba(194,145,93,0.1)', border: '1px solid rgba(194,145,93,0.25)', color: 'var(--ink)' }}>
      {children}
    </div>
  );
}

function Steps({ steps }: { steps: { n: string; title: string; desc: React.ReactNode }[] }) {
  return (
    <div className="space-y-3">
      {steps.map(s => (
        <div key={s.n} className="flex gap-3">
          <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--petrol)', color: 'var(--cream)' }}>
            {s.n}
          </div>
          <div className="flex-1 pb-3 border-b" style={{ borderColor: 'var(--line)' }}>
            <p className="font-bold text-sm" style={{ color: 'var(--petrol)' }}>{s.title}</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--tweed)' }}>{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
