import type { UniverseId, MissionClass, QuestRisk, CompanionId, DayMode, LevelInfo, AchievementDef, UniverseConfig } from './types';

export const LEVELS: LevelInfo[] = [
  { level: 1,  xpRequired: 0,    title: 'Lecteur Occasionnel',          icon: '📖' },
  { level: 2,  xpRequired: 100,  title: 'Chroniqueur Junior',            icon: '🖊️' },
  { level: 3,  xpRequired: 250,  title: 'Scribe Apprenti',               icon: '📜' },
  { level: 4,  xpRequired: 500,  title: 'Architecte des SERP',           icon: '🏗️' },
  { level: 5,  xpRequired: 900,  title: 'Tisseur de Liens',              icon: '🕸️' },
  { level: 6,  xpRequired: 1400, title: 'Analyste Urbain',               icon: '🏙️' },
  { level: 7,  xpRequired: 2100, title: 'Voyageur Temporel',             icon: '⏳' },
  { level: 8,  xpRequired: 3000, title: 'Maître des Mondes Parallèles',  icon: '🌌' },
  { level: 9,  xpRequired: 4200, title: 'Gardien de la Toile',           icon: '🕷️' },
  { level: 10, xpRequired: 6000, title: 'Codex Vivant',                  icon: '🔮' },
];

export const XP_BY_RISK: Record<QuestRisk, number> = {
  low: 25,
  medium: 50,
  high: 100,
  critical: 200,
};

export const XP_PENALTY_DAILY: Record<QuestRisk, number> = {
  low: 3,
  medium: 8,
  high: 18,
  critical: 40,
};

export const UNIVERSE_CONFIG: Record<UniverseId, UniverseConfig & { keywords: string[]; bgClass: string }> = {
  mario: {
    id: 'mario' as UniverseId,
    name: 'Royaume des Pixels',
    icon: '🍄',
    missionClass: 'platform' as MissionClass,
    missionName: 'Quête de Plateforme',
    color: '#F7A800',
    darkColor: '#C48800',
    bgClass: 'universe-mario',
    description: 'Micro-tâches, correctifs rapides, obstacles à franchir',
    keywords: ['fix', 'correction', 'balise', '404', 'commit', 'patch', 'bug', 'typo', 'update', 'mise à jour', 'hotfix'],
  },
  assassins_creed: {
    id: 'assassins_creed' as UniverseId,
    name: 'Crépuscule des Assassins',
    icon: '🗡️',
    missionClass: 'infiltration' as MissionClass,
    missionName: "Quête d'Infiltration",
    color: '#2D6A4F',
    darkColor: '#1B4332',
    bgClass: 'universe-assassins_creed',
    description: 'Deep work, audits, refontes, architecture SEO',
    keywords: ['audit', 'migration', 'refonte', 'architecture', 'crawl', 'technique', 'structure', 'seo', 'core', 'redirect', 'indexation', 'canonical', 'sitemap'],
  },
  spiderman: {
    id: 'spiderman' as UniverseId,
    name: 'Toile Urbaine',
    icon: '🕷️',
    missionClass: 'urban' as MissionClass,
    missionName: 'Quête Urbaine',
    color: '#C0392B',
    darkColor: '#922B21',
    bgClass: 'universe-spiderman',
    description: 'Interactions clients, calls, workshops, reporting',
    keywords: ['call', 'réunion', 'atelier', 'workshop', 'rapport', 'reporting', 'client', 'meeting', 'présentation', 'compte rendu', 'suivi', 'sprint review'],
  },
  crouch: {
    id: 'crouch' as UniverseId,
    name: 'Lignes de Réalité',
    icon: '⚛️',
    missionClass: 'temporal' as MissionClass,
    missionName: 'Quête Temporelle',
    color: '#6D28D9',
    darkColor: '#4C1D95',
    bgClass: 'universe-crouch',
    description: 'Tests A/B, expérimentations, versioning, branches',
    keywords: ['test', 'expériment', 'variant', 'a/b', 'version', 'branch', 'feature flag', 'multivers', 'ab-test', 'expérimentation'],
  },
  film_noir: {
    id: 'film_noir' as UniverseId,
    name: 'Cinéma Obscur',
    icon: '🎬',
    missionClass: 'narration' as MissionClass,
    missionName: 'Quête de Narration',
    color: '#C9A84C',
    darkColor: '#8B6914',
    bgClass: 'universe-film_noir',
    description: 'Rédaction, contenus, storytelling, documentation',
    keywords: ['article', 'texte', 'copy', 'story', 'essai', 'script', 'rédact', 'écrire', 'film', 'cinéma', 'chronique', 'contenu', 'blog', 'newsletter', 'documentation'],
  },
};

export const COMPANION_CONFIG: Record<CompanionId, { name: string; emoji: string; flavor: string; universe: UniverseId }> = {
  goomba: {
    name: 'Goomba Repenti',
    emoji: '🍄',
    flavor: 'Un ancien ennemi reconverti. Il vous encourage sur les petites quêtes.',
    universe: 'mario',
  },
  raven: {
    name: 'Corbeau de la Cité',
    emoji: '🪶',
    flavor: "Esprit du film noir. Il chuchote des vérités dans l'obscurité.",
    universe: 'film_noir',
  },
  anomaly: {
    name: 'Anomalie Quantique',
    emoji: '⚡',
    flavor: "Fragment d'une réalité parallèle. Il guide vos expérimentations.",
    universe: 'crouch',
  },
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_quest',    title: 'Première Mission',          description: 'Créer votre première quête',                    icon: '⚔️' },
  { id: 'five_done',      title: 'Quintet Héroïque',           description: '5 quêtes complétées',                           icon: '🏆' },
  { id: 'ten_done',       title: 'Vétéran du Codex',           description: '10 quêtes complétées',                          icon: '🎖️' },
  { id: 'streak_3',       title: 'Momentum',                   description: '3 jours actifs consécutifs',                    icon: '🔥' },
  { id: 'streak_7',       title: 'Semaine Légendaire',         description: '7 jours actifs consécutifs',                    icon: '💫' },
  { id: 'all_universes',  title: 'Codex Complet',              description: 'Créer une quête dans chaque univers',           icon: '🌌' },
  { id: 'level_5',        title: 'Architecte Confirmé',        description: 'Atteindre le niveau 5',                         icon: '🏗️' },
  { id: 'level_10',       title: 'Codex Vivant',               description: 'Atteindre le niveau maximum',                   icon: '🔮' },
  { id: 'noir_5',         title: 'Bouquin Noir',               description: '5 quêtes Cinéma Obscur complétées',             icon: '🎬' },
  { id: 'infiltration_5', title: 'Fantôme des Pixels',         description: '5 infiltrations accomplies',                    icon: '🗡️' },
  { id: 'urban_5',        title: 'Friendly Neighborhood SEO',  description: '5 quêtes urbaines terminées',                   icon: '🕷️' },
  { id: 'temporal_3',     title: 'Paradoxe du SEO',            description: '3 quêtes temporelles livrées',                  icon: '⚛️' },
  { id: 'critical_done',  title: 'Sous Pression Maximale',     description: 'Compléter une quête critique',                  icon: '💀' },
  { id: 'no_penalty',     title: 'Maître du Temps',            description: 'Compléter 5 quêtes sans jamais être en retard', icon: '⏰' },
];

export const STATUS_CONFIG = {
  backlog:  { label: 'Backlog',    icon: '📋', colorClass: 'text-amber-700',  bgClass: 'bg-amber-50'  },
  active:   { label: 'En Quête',   icon: '⚙️', colorClass: 'text-emerald-700', bgClass: 'bg-emerald-50' },
  done:     { label: 'Terminée',   icon: '✅', colorClass: 'text-petrol',      bgClass: 'bg-washBlue'  },
  haunted:  { label: 'Hantée',     icon: '👻', colorClass: 'text-purple-700',  bgClass: 'bg-purple-50' },
  cursed:   { label: 'Maudite',    icon: '💀', colorClass: 'text-red-800',     bgClass: 'bg-red-50'    },
} as const;

export const RISK_CONFIG: Record<QuestRisk, { label: string; color: string; bg: string; xp: number }> = {
  low:      { label: 'Faible',   color: '#15803d', bg: '#dcfce7', xp: 25  },
  medium:   { label: 'Moyen',    color: '#92400e', bg: '#fef3c7', xp: 50  },
  high:     { label: 'Élevé',    color: '#c2410c', bg: '#ffedd5', xp: 100 },
  critical: { label: 'Critique', color: '#991b1b', bg: '#fee2e2', xp: 200 },
};

export const DAY_MODES: Record<DayMode, { label: string; icon: string; defaultUniverse: UniverseId | null; xpBoost: number }> = {
  normal:    { label: 'Normal',          icon: '🌤️', defaultUniverse: null,            xpBoost: 1.0 },
  lecture:   { label: 'Journée Lecture', icon: '📚', defaultUniverse: 'film_noir',      xpBoost: 1.2 },
  technique: { label: 'Sprint Technique',icon: '⚡', defaultUniverse: 'assassins_creed',xpBoost: 1.5 },
  client:    { label: 'Mode Client',     icon: '🤝', defaultUniverse: 'spiderman',      xpBoost: 1.3 },
};

export const NEMESIS_MESSAGES = {
  haunted: [
    "Cette quête vous observe depuis l'ombre...",
    "Le temps passe. La dette grandit.",
    "Votre passé vous rattrape, Architecte.",
    "Une timeline diverge à chaque heure d'inaction.",
    "Le Corbeau de la Cité a remarqué votre retard.",
  ],
  cursed: [
    "Dans cette version de vous, ce projet n'a jamais été livré.",
    "La malédiction s'étend. L'univers se fracture.",
    "Votre Nemesis sourit dans l'obscurité.",
    "Les pixels se corrompent. Agissez maintenant.",
    "Cette timeline est compromise. Bifurquez.",
  ],
};

export const TAVERN_WISDOM = [
  "L'infiltration parfaite commence par une ligne de code propre.",
  "Dans chaque timeline, le SEO technique domine.",
  "Le corbeau de la cité sait : un bon brief vaut mille réunions.",
  "Mario ne saute jamais sans voir la plateforme d'atterrissage.",
  "L'anomalie quantique vous dit : testez avant de déployer.",
  "Dans le Cinéma Obscur, chaque mot compte double.",
  "Toute refonte non planifiée est une mission maudite.",
  "Le gardien de la Toile tisse des liens là où d'autres voient du chaos.",
];

export const DEFAULT_GAME_STATE = {
  xp: 0,
  level: 1,
  xpTotal: 0,
  unlockedAchievements: [] as string[],
  streak: 0,
  lastActiveDate: '',
  companion: 'goomba' as CompanionId,
  dayMode: 'normal' as DayMode,
  questsCompleted: 0,
};
