export type UniverseId = 'odyssey' | 'mario' | 'assassins_creed' | 'spiderman' | 'crouch' | 'film_noir';
export type MissionClass = 'odyssey' | 'platform' | 'infiltration' | 'urban' | 'temporal' | 'narration';
export type QuestRisk = 'low' | 'medium' | 'high' | 'critical';
export type QuestStatus = 'backlog' | 'active' | 'done' | 'haunted' | 'cursed' | 'archived';
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
  xpReward: number;
  subtasks: Subtask[];
  tags: string[];
  timeSpent?: number;         // total seconds accumulated
  timerStartedAt?: string;    // ISO string — present means timer is running
  timeSessions?: TimeSession[]; // history of individual work sessions
  imageUrl?: string;          // base64 or URL, optional card image
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
