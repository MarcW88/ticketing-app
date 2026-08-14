export type UniverseId = 'odyssey' | 'mario' | 'assassins_creed' | 'spiderman' | 'crouch' | 'film_noir';
export type MissionClass = 'odyssey' | 'platform' | 'infiltration' | 'urban' | 'temporal' | 'narration';
export type QuestRisk = 'low' | 'medium' | 'high' | 'critical';
export type QuestStatus = 'backlog' | 'active' | 'done' | 'haunted' | 'cursed' | 'archived' | 'maelstrom';
export type CompanionId = 'athena' | 'hermes' | 'mentor';
export type DayMode = 'normal' | 'sirenes' | 'cyclope' | 'tempete';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TimeSession {
  startedAt: string;  // ISO
  endedAt: string;    // ISO
  duration: number;   // seconds
}

export interface Quest {
  id: string;
  title: string;
  description?: string;
  status: QuestStatus;
  risk: QuestRisk;
  universe: UniverseId;
  missionClass: MissionClass;
  client?: string;
  lore?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  hauntedAt?: string;
  cursedAt?: string;
  maelstromAt?: string;
  xpReward: number;
  subtasks: Subtask[];
  tags: string[];
  timeSpent?: number;         // total seconds accumulated
  timerStartedAt?: string;    // ISO string — present means timer is running
  timeSessions?: TimeSession[]; // history of individual work sessions
  imageUrl?: string;          // base64 or URL, optional card image
  challengeTarget?: boolean;  // flagged as objective for the current challenge
  circeTrapped?: boolean;     // backlog untouched >21 days → 0 XP on completion
  penelopeWeavedUntil?: string; // ISO — drain frozen until this date (costs 50 XP)
  forceUnlocked?: boolean;        // manually unlocked from danger status
  forceUnlockedAt?: string;       // ISO — when force-unlock was initiated (immutable)
  forceUnlockOrigin?: QuestStatus; // status at time of force-unlock (for escalation)
  cannotForceUnlock?: boolean;    // permanent after auto-relock — never unlockable again
}

export interface ActiveReward {
  id: string;
  rewardId: string;
  name: string;
  purchasedAt: string;
  expiresAt?: string;
  coinCost: number;
  vaultCost: number;
}

export interface MonthRecord {
  month: string;       // 'YYYY-MM'
  questsDone: number;
  xpGained: number;
  xpLost: number;
}

export interface XPChallenge {
  target: number;
  startXP: number;
  label: string;
  createdAt: string;
}

export interface GameState {
  xp: number;
  level: number;
  xpTotal: number;
  unlockedAchievements: string[];
  streak: number;
  lastActiveDate: string;
  companion: CompanionId;
  dayMode: DayMode;
  questsCompleted: number;
  challenge?: XPChallenge;
  lastDrainAt?: string;
  drainShieldUntil?: string;      // ISO — Athena's shield active (after 3 quests/day)
  lastQuestCompletedDate?: string; // 'YYYY-MM-DD' — for dawn bonus
  dailyQuestCount?: number;        // quests completed today (for momentum)
  coins?: number;                  // Drachmes spendables (tier 1-5)
  vaultCoins?: number;             // Trésor du Retour (tier 6-10 & voyages)
  italyFragments?: number;
  seaFragments?: number;
  franceFragments?: number;
  bossQuestsCompleted?: number;    // critical quests completed
  activeRewards?: ActiveReward[];
  monthlyHistory?: MonthRecord[];  // last 12 months
}

export interface UniverseConfig {
  id: UniverseId;
  name: string;
  icon: string;
  missionClass: MissionClass;
  missionName: string;
  color: string;
  darkColor: string;
  description: string;
}

export interface LevelInfo {
  level: number;
  xpRequired: number;
  title: string;
  icon: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}
