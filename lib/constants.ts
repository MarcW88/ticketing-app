import type { UniverseId, MissionClass, QuestRisk, CompanionId, DayMode, LevelInfo, AchievementDef, UniverseConfig } from './types';

export const DRACHMES_PER_XP = 3;
export const VAULT_RATIO = 0.20;

export interface RewardDef {
  id: string;
  tier: number;
  name: string;
  description: string;
  icon: string;
  coinCost: number;
  vaultCost: number;
  durationDays?: number;
  renewable?: boolean;
  renewalCost?: number;
  conditions?: string[];
  legendary?: boolean;
}

export const REWARDS: RewardDef[] = [
  { id: 'livre',      tier: 1, name: 'Parchemin du Savoir',   description: "Achat d'un livre",                         icon: '📚', coinCost: 500,   vaultCost: 0 },
  { id: 'cours',      tier: 2, name: 'École du Centaure',      description: 'Petit cours en ligne',                     icon: '🏛️', coinCost: 1500,  vaultCost: 0 },
  { id: 'abonnement', tier: 3, name: "Faveur d'un Dieu",      description: 'Abonnement 1 mois (Claude, Perplexity…)',  icon: '⚡', coinCost: 2000,  vaultCost: 0, durationDays: 30, renewable: true, renewalCost: 2500 },
  { id: 'formation',  tier: 5, name: "Révélation d'Athéna",   description: 'Formation premium / cours avancé',          icon: '🦉', coinCost: 5000,  vaultCost: 0 },
  { id: 'tech_petit', tier: 6, name: "Forge d'Héphaïstos",    description: 'Petit achat tech (8 000–10 000)',            icon: '🔧', coinCost: 0,     vaultCost: 8000 },
  { id: 'tech_grand', tier: 7, name: "Arsenal d'Achille",     description: 'Achat tech important (15 000–25 000)',      icon: '⚔️', coinCost: 0,     vaultCost: 15000 },
  { id: 'mer',        tier: 8, name: 'Escale des Cyclades',   description: 'Vacances à la mer',                         icon: '🌊', coinCost: 0,     vaultCost: 30000,  conditions: ['sea_10',    'streak_1m'] },
  { id: 'france',     tier: 9, name: 'Odyssée de Gaule',      description: 'Vacances en France',                       icon: '🇫🇷', coinCost: 0,     vaultCost: 45000,  conditions: ['france_20', 'streak_3m', 'no_catastrophic_2m'] },
  { id: 'italie',     tier: 10, name: 'Le Grand Retour',      description: "L'Italie — Destination Légendaire",        icon: '🇮🇹', coinCost: 0,     vaultCost: 100000, conditions: ['italy_60',  'streak_6m', 'boss_4', 'no_catastrophic_3m'], legendary: true },
];

export const LEVELS: LevelInfo[] = [
  { level: 1,  xpRequired: 0,     title: 'Naufragé',          icon: '☠️'  },
  { level: 2,  xpRequired: 200,   title: 'Marin',             icon: '⚓'  },
  { level: 3,  xpRequired: 600,   title: 'Navigateur',        icon: '🌊'  },
  { level: 4,  xpRequired: 1400,  title: 'Guerrier',          icon: '⚔️'  },
  { level: 5,  xpRequired: 3000,  title: 'Hoplite',           icon: '�️'  },
  { level: 6,  xpRequired: 6000,  title: 'Stratège',          icon: '🗺️'  },
  { level: 7,  xpRequired: 11000, title: 'Héros',             icon: '🏹'  },
  { level: 8,  xpRequired: 20000, title: "Roi d'Ithaque",     icon: '👑'  },
  { level: 9,  xpRequired: 35000, title: 'Demi-dieu',         icon: '⚡'  },
  { level: 10, xpRequired: 60000, title: 'Légende Vivante',   icon: '✨'  },
];

export const XP_BY_RISK: Record<QuestRisk, number> = {
  low:      10,
  medium:   30,
  high:     75,
  critical: 150,
};

export const XP_PENALTY_DAILY: Record<QuestRisk, number> = {
  low:      1,
  medium:   4,
  high:     10,
  critical: 25,
};

export const UNIVERSE_CONFIG: Record<string, UniverseConfig & { keywords: string[]; bgClass: string }> = {
  odyssey: {
    id: 'odyssey' as UniverseId,
    name: "L'Odyssée",
    icon: '⚔️',
    missionClass: 'odyssey' as MissionClass,
    missionName: 'Épreuve',
    color: '#C9963C',
    darkColor: '#8B6520',
    bgClass: 'universe-odyssey',
    description: 'Naviguer, combattre, rentrer à Ithaque.',
    keywords: [],
  },
};

export const COMPANION_CONFIG: Record<CompanionId, { name: string; emoji: string; flavor: string }> = {
  athena: {
    name: 'Athéna',
    emoji: '🦉',
    flavor: "La déesse de la Sagesse veille sur votre route. Elle chuchote la stratégie là où d'autres ne voient que chaos.",
  },
  hermes: {
    name: 'Hermès',
    emoji: '⚡',
    flavor: 'Le messager des dieux. Rapide, insaisissable. Il vous rappelle que le temps est la ressource la plus précieuse.',
  },
  mentor: {
    name: 'Mentor',
    emoji: '🗡️',
    flavor: "Athéna sous les traits d'un mortel. Il guide vos fils vers Ithaque, une épreuve à la fois.",
  },
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_quest',   title: 'Première Épreuve',       description: 'Créer votre première quête',                     icon: '⚔️' },
  { id: 'five_done',     title: 'Cinq Victoires',          description: '5 épreuves surmontées',                          icon: '�️' },
  { id: 'ten_done',      title: 'Vétéran des Mers',        description: '10 épreuves surmontées',                         icon: '�' },
  { id: 'streak_3',      title: 'Momentum du Héros',       description: '3 jours actifs consécutifs',                     icon: '🔥' },
  { id: 'streak_7',      title: 'Semaine Légendaire',      description: '7 jours actifs consécutifs',                     icon: '⚡' },
  { id: 'level_5',       title: 'Hoplite Confirmé',        description: 'Atteindre le niveau 5',                          icon: '🛡️' },
  { id: 'level_10',      title: 'Légende Vivante',         description: 'Atteindre le niveau maximum',                    icon: '✨' },
  { id: 'critical_done', title: 'Sous le Styx',            description: 'Compléter une épreuve critique',                 icon: '💀' },
  { id: 'no_penalty',    title: 'Faveur des Dieux',        description: 'Compléter 5 épreuves dans les délais',           icon: '🦉' },
  { id: 'twenty_done',   title: 'Héros des Deux Rives',    description: '20 épreuves surmontées',                         icon: '🏹' },
  { id: 'fifty_done',    title: 'Épopée Accomplie',        description: '50 épreuves surmontées',                         icon: '👑' },
];

export const STATUS_CONFIG = {
  backlog: { label: 'Port d\'Ithaque',  icon: '⚓', colorClass: 'text-amber-600',   bgClass: 'bg-amber-900/20'  },
  active:  { label: 'En Mer',           icon: '⚔️', colorClass: 'text-blue-400',    bgClass: 'bg-blue-900/20'   },
  done:    { label: 'Ithaque',          icon: '🏛️', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-900/20'},
  haunted:    { label: 'Chant des Sirènes', icon: '🌀', colorClass: 'text-purple-400',  bgClass: 'bg-purple-900/20'  },
  cursed:     { label: "Antre du Cyclope",  icon: '💀', colorClass: 'text-red-400',     bgClass: 'bg-red-900/20'     },
  maelstrom:  { label: 'Maelstrom',          icon: '🌪️', colorClass: 'text-red-700',     bgClass: 'bg-red-950/40'     },
} as const;

export const RISK_CONFIG: Record<QuestRisk, { label: string; color: string; bg: string; xp: number }> = {
  low:      { label: 'Calypso',   color: '#6AACCF', bg: 'rgba(55,110,155,0.18)',  xp: 10  },
  medium:   { label: 'Scylla',    color: '#C9963C', bg: 'rgba(201,150,60,0.15)',  xp: 30  },
  high:     { label: 'Charybde',  color: '#D4884A', bg: 'rgba(170,75,18,0.18)',   xp: 75  },
  critical: { label: 'Le Styx',   color: '#E06060', bg: 'rgba(139,26,26,0.22)',   xp: 150 },
};

export const DAY_MODES: Record<DayMode, { label: string; icon: string; defaultUniverse: UniverseId | null; xpBoost: number }> = {
  normal:   { label: 'Navigation',        icon: '�', defaultUniverse: 'odyssey', xpBoost: 1.0 },
  sirenes:  { label: 'Chant des Sirènes', icon: '🎵', defaultUniverse: 'odyssey', xpBoost: 1.2 },
  cyclope:  { label: 'Antre du Cyclope',  icon: '👁', defaultUniverse: 'odyssey', xpBoost: 1.5 },
  tempete:  { label: 'Tempête',           icon: '⛈️', defaultUniverse: 'odyssey', xpBoost: 1.3 },
};

export const NEMESIS_MESSAGES: Record<string, string[]> = {
  haunted: [
    "Les Sirènes chantent. Résistez, Héros...",
    "Chaque heure d'inaction est une rame perdue.",
    "Poséidon observe votre immobilité.",
    "Le chant vous envoûte. Fermez les yeux. Ramez.",
    "Votre équipage attend vos ordres.",
  ],
  cursed: [
    "Le Cyclope a fermé sa grotte. Il n'y a plus d'issue.",
    "Les dieux ont détourné le regard. Agissez maintenant.",
    "Vous êtes dans l'Antre depuis trop longtemps.",
    "Circé a transformé votre volonté en pierre.",
    "Cette épreuve corrode votre légende. Brisez-la.",
  ],
  maelstrom: [
    "Le Maelstrom vous engloutit. Votre XP s'évapore.",
    "Les prétendants pillent votre palais. Réagissez.",
    "Ithaque vacille. Votre légende disparaît dans les eaux noires.",
    "Même les dieux ont détourné le regard. Dernière chance.",
    "Chaque heure ici vous coûte tout ce que vous avez bâti.",
  ],
};

export const ORACLE_MESSAGES = {
  overdue:     "💀 La deadline est dépassée — les Sirènes vous cherchent déjà.",
  today:       "⚠️ Aujourd'hui est le dernier jour. Terminez avant minuit.",
  tomorrow:    "🌊 Dans 1 jour les Sirènes guettent. Priorité absolue.",
  soonHaunted: "🌀 Dans 2-3 jours vous entrerez dans les Sirènes si ce n'est pas fini.",
  comfortable: "⚓ Vous avez du temps — mais Poséidon peut changer les vents.",
  relaxed:     "🌿 La mer est calme. Naviguez sereinement.",
};

// Immediate XP cost when force-unlocking a backlog card
export const FORCE_UNLOCK_IMMEDIATE_COST: Record<string, number> = {
  low: 20,
  medium: 50,
  high: 100,
  critical: 150,
};
// Hourly drain per danger card while force-unlocked cards are active
export const XP_FORCE_UNLOCK_HOURLY: Record<string, number> = {
  haunted: 2,
  cursed: 5,
  maelstrom: 12,
};
export const FORCE_RELOCK_XP_THRESHOLD = -300;
export const FORCE_RELOCK_PENALTY = 75;
export const FORCE_RELOCK_HOURS = 12;

export const TAVERN_WISDOM = [
  "Ulysse ne rentrait pas vite — il rentrait bien.",
  "Un plan sans action est un navire sans voile.",
  "Athéna favorise ceux qui agissent, pas ceux qui espèrent.",
  "Chaque épreuve surmontée vous rapproche d'Ithaque.",
  "Même Poséidon ne peut arrêter celui qui rame.",
  "La ruse d'Ulysse valait mille soldats.",
  "Le héros ne craint pas le labyrinthe — il le cartographie.",
  "Les Sirènes promettent tout. Le héros livre quelque chose.",
];

export const DEFAULT_GAME_STATE = {
  xp: 0,
  level: 1,
  xpTotal: 0,
  unlockedAchievements: [] as string[],
  streak: 0,
  lastActiveDate: '',
  companion: 'athena' as CompanionId,
  dayMode: 'normal' as DayMode,
  questsCompleted: 0,
  coins: 0,
  vaultCoins: 0,
  italyFragments: 0,
  seaFragments: 0,
  franceFragments: 0,
  bossQuestsCompleted: 0,
  activeRewards: [] as import('./types').ActiveReward[],
  monthlyHistory: [] as import('./types').MonthRecord[],
};
