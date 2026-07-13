import type { Quest, GameState, QuestRisk } from './types';
import { LEVELS, XP_BY_RISK, ACHIEVEMENTS, DAY_MODES } from './constants';

export function getLevelFromXP(xp: number): number {
  let level = 1;
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) level = l.level;
    else break;
  }
  return level;
}

export function getLevelInfo(level: number) {
  return LEVELS.find(l => l.level === level) ?? LEVELS[0];
}

export function getXPForLevel(level: number): number {
  return LEVELS.find(l => l.level === level)?.xpRequired ?? 0;
}

export function getXPForNextLevel(level: number): number {
  const next = LEVELS.find(l => l.level === level + 1);
  return next ? next.xpRequired : LEVELS[LEVELS.length - 1].xpRequired;
}

export function getXPProgress(xp: number, level: number): number {
  const current = getXPForLevel(level);
  const next = getXPForNextLevel(level);
  if (next <= current) return 100;
  return Math.min(100, Math.max(0, ((xp - current) / (next - current)) * 100));
}

export function calculateQuestXP(risk: QuestRisk, dayMode: string): number {
  const boost = DAY_MODES[dayMode as keyof typeof DAY_MODES]?.xpBoost ?? 1;
  return Math.round(XP_BY_RISK[risk] * boost);
}

export function updateHauntedCursed(quests: Quest[]): Quest[] {
  const now = new Date();
  return quests.map(q => {
    if (q.status === 'done') return q;
    if (!q.dueDate) return q;

    const due = new Date(q.dueDate);
    const diffDays = (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > 7 && q.status !== 'cursed') {
      return { ...q, status: 'cursed' as const, cursedAt: q.cursedAt ?? now.toISOString() };
    }
    if (diffDays > 2 && q.status !== 'cursed' && q.status !== 'haunted') {
      return { ...q, status: 'haunted' as const, hauntedAt: q.hauntedAt ?? now.toISOString() };
    }
    return q;
  });
}

export function checkNewAchievements(state: GameState, quests: Quest[]): string[] {
  const done = quests.filter(q => q.status === 'done');
  const universesDone = new Set(done.map(q => q.universe));
  const newOnes: string[] = [];

  const checks: Record<string, () => boolean> = {
    first_quest:    () => quests.length >= 1,
    five_done:      () => done.length >= 5,
    ten_done:       () => done.length >= 10,
    streak_3:       () => state.streak >= 3,
    streak_7:       () => state.streak >= 7,
    all_universes:  () => universesDone.size >= 5,
    level_5:        () => state.level >= 5,
    level_10:       () => state.level >= 10,
    noir_5:         () => done.filter(q => q.universe === 'film_noir').length >= 5,
    infiltration_5: () => done.filter(q => q.universe === 'assassins_creed').length >= 5,
    urban_5:        () => done.filter(q => q.universe === 'spiderman').length >= 5,
    temporal_3:     () => done.filter(q => q.universe === 'crouch').length >= 3,
    critical_done:  () => done.some(q => q.risk === 'critical'),
  };

  const allIds = ACHIEVEMENTS.map(a => a.id);
  for (const id of allIds) {
    if (!state.unlockedAchievements.includes(id) && checks[id]?.()) {
      newOnes.push(id);
    }
  }

  return newOnes;
}

export function updateStreak(state: GameState): GameState {
  const today = new Date().toDateString();
  if (state.lastActiveDate === today) return state;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = state.lastActiveDate === yesterday.toDateString();

  return {
    ...state,
    streak: isConsecutive ? state.streak + 1 : 1,
    lastActiveDate: today,
  };
}

export function completeQuestWithXP(
  quest: Quest,
  state: GameState,
  allQuests: Quest[]
): { updatedState: GameState; newAchievements: string[]; xpEarned: number; leveledUp: boolean; newLevel: number } {
  const xpEarned = calculateQuestXP(quest.risk, state.dayMode);
  const newXP = state.xp + xpEarned;
  const newXPTotal = state.xpTotal + xpEarned;
  const oldLevel = state.level;
  const newLevel = getLevelFromXP(newXP);
  const leveledUp = newLevel > oldLevel;

  const updatedState: GameState = {
    ...state,
    xp: newXP,
    xpTotal: newXPTotal,
    level: newLevel,
    questsCompleted: state.questsCompleted + 1,
  };

  const updatedQuests = allQuests.map(q =>
    q.id === quest.id ? { ...q, status: 'done' as const, completedAt: new Date().toISOString() } : q
  );

  const newAchievements = checkNewAchievements(updatedState, updatedQuests);
  updatedState.unlockedAchievements = [...updatedState.unlockedAchievements, ...newAchievements];

  return { updatedState, newAchievements, xpEarned, leveledUp, newLevel };
}
