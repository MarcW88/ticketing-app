export type UniverseId = 'mario' | 'assassins_creed' | 'spiderman' | 'crouch' | 'film_noir';
export type MissionClass = 'platform' | 'infiltration' | 'urban' | 'temporal' | 'narration';
export type QuestRisk = 'low' | 'medium' | 'high' | 'critical';
export type QuestStatus = 'backlog' | 'active' | 'done' | 'haunted' | 'cursed';
export type CompanionId = 'goomba' | 'raven' | 'anomaly';
export type DayMode = 'normal' | 'lecture' | 'technique' | 'client';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
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
