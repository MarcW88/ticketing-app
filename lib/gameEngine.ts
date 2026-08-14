import type { Quest, GameState, QuestRisk, QuestStatus } from './types';
import { LEVELS, XP_BY_RISK, XP_PENALTY_DAILY, ACHIEVEMENTS, DAY_MODES, XP_FORCE_UNLOCK_HOURLY, FORCE_UNLOCK_IMMEDIATE_COST, FORCE_RELOCK_XP_THRESHOLD, FORCE_RELOCK_PENALTY, FORCE_RELOCK_HOURS, DRACHMES_PER_XP, VAULT_RATIO } from './constants';

export function calculateCoinsEarned(xp: number): { spendable: number; vault: number } {
  const total = Math.floor(xp * DRACHMES_PER_XP);
  const vault = Math.floor(total * VAULT_RATIO);
  return { spendable: total - vault, vault };
}

export function calculateCoinsLost(xpLost: number): number {
  if (xpLost <= 0) return 0;
  const multiplier = xpLost <= 20 ? 1 : xpLost <= 50 ? 1.5 : xpLost <= 100 ? 2 : 3;
  return Math.floor(xpLost * DRACHMES_PER_XP * multiplier);
}

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

export function updateRiskByDeadline(quests: Quest[]): Quest[] {
  const LEVELS: QuestRisk[] = ['low', 'medium', 'high', 'critical'];
  return quests.map(q => {
    if (q.status === 'done') return q;
    if (!q.dueDate) return q;

    const days = Math.ceil((new Date(q.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    let minRisk: QuestRisk = 'low';
    if (days <= 1)  minRisk = 'critical';
    else if (days <= 3) minRisk = 'high';
    else if (days <= 7) minRisk = 'medium';
    else return q; // >7 days: no change

    // Only escalate — never downgrade
    if (LEVELS.indexOf(minRisk) <= LEVELS.indexOf(q.risk)) return q;

    return { ...q, risk: minRisk, xpReward: XP_BY_RISK[minRisk] };
  });
}

export function updateHauntedCursed(quests: Quest[]): Quest[] {
  const now = new Date();

  // Step 1: time-based status escalation
  let result = quests.map(q => {
    if (q.status === 'done' || q.status === 'archived') return q;
    if (!q.dueDate) return q;
    const due = new Date(q.dueDate);
    const diffDays = (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 14 && q.status !== 'maelstrom') {
      return { ...q, status: 'maelstrom' as const, maelstromAt: q.maelstromAt ?? now.toISOString() };
    }
    if (diffDays > 7 && q.status !== 'cursed' && q.status !== 'maelstrom') {
      return { ...q, status: 'cursed' as const, cursedAt: q.cursedAt ?? now.toISOString() };
    }
    // Backlog cards: haunted as soon as past due; active cards: 2-day grace period
    const hauntedThreshold = q.status === 'backlog' ? 0 : 2;
    if (diffDays > hauntedThreshold && q.status !== 'cursed' && q.status !== 'haunted' && q.status !== 'maelstrom') {
      return { ...q, status: 'haunted' as const, hauntedAt: q.hauntedAt ?? now.toISOString() };
    }
    return q;
  });

  // Step 2: CONTAGION — haunted quest ≥48h infects oldest backlog quest
  const hasContagion = result.some(
    q => q.status === 'haunted' && q.hauntedAt &&
      (now.getTime() - new Date(q.hauntedAt).getTime()) >= 48 * 3600 * 1000
  );
  if (hasContagion) {
    const backlog = result.filter(q => q.status === 'backlog');
    if (backlog.length > 0) {
      const oldest = [...backlog].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      result = result.map(q =>
        q.id === oldest.id
          ? { ...q, status: 'haunted' as const, hauntedAt: q.hauntedAt ?? now.toISOString() }
          : q
      );
    }
  }

  // Step 3: CIRCE TRAP — backlog quest untouched >21 days → 0 XP on completion
  result = result.map(q => {
    if (q.status !== 'backlog' || q.circeTrapped) return q;
    const days = (now.getTime() - new Date(q.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (days > 21) return { ...q, circeTrapped: true };
    return q;
  });

  return result;
}

export function applyXPDrain(
  state: GameState,
  quests: Quest[]
): { state: GameState; totalDrained: number; updatedQuests: Quest[] } {
  const now = new Date();
  const shieldActive = !!(state.drainShieldUntil && new Date(state.drainShieldUntil) > now);

  if (!state.lastDrainAt) {
    return { state: { ...state, lastDrainAt: now.toISOString() }, totalDrained: 0, updatedQuests: quests };
  }

  const hoursSince = (now.getTime() - new Date(state.lastDrainAt).getTime()) / (1000 * 60 * 60);
  const daysSince = Math.floor(hoursSince / 24);
  let totalDrained = 0;

  // Daily drain: haunted/cursed/maelstrom
  if (daysSince >= 1) {
    const drainable = quests.filter(q => q.status === 'haunted' || q.status === 'cursed' || q.status === 'maelstrom');
    for (const q of drainable) {
      if (q.penelopeWeavedUntil && new Date(q.penelopeWeavedUntil) > now) continue;
      const base = XP_PENALTY_DAILY[q.risk];
      const mult = q.status === 'maelstrom' ? 4 : q.status === 'cursed' ? 2 : 1;
      const raw = base * mult * daysSince;
      totalDrained += shieldActive ? Math.round(raw * 0.5) : raw;
    }
  }

  // Hourly drain on danger cards while any force-unlocked active card exists
  const hasForceUnlocked = quests.some(q => q.forceUnlocked && q.status === 'active');
  if (hasForceUnlocked && hoursSince >= 0.5) {
    const dangerCards = quests.filter(q => q.status === 'haunted' || q.status === 'cursed' || q.status === 'maelstrom');
    for (const q of dangerCards) {
      if (q.penelopeWeavedUntil && new Date(q.penelopeWeavedUntil) > now) continue;
      const rate = XP_FORCE_UNLOCK_HOURLY[q.status] ?? 2;
      totalDrained += Math.floor(hoursSince * rate);
    }
  }

  if (totalDrained === 0) {
    const shouldUpdate = daysSince >= 1 || quests.some(q => q.forceUnlocked);
    return { state: shouldUpdate ? { ...state, lastDrainAt: now.toISOString() } : state, totalDrained: 0, updatedQuests: quests };
  }

  const newXP = state.xp - totalDrained;
  const newLevel = getLevelFromXP(Math.max(0, newXP));
  return {
    state: { ...state, xp: newXP, level: newLevel, lastDrainAt: now.toISOString() },
    totalDrained,
    updatedQuests: quests,
  };
}

export function checkAndApplyRelock(
  state: GameState,
  quests: Quest[]
): { state: GameState; quests: Quest[]; relockedCount: number } {
  const now = new Date();
  const xpTriggered = state.xp < FORCE_RELOCK_XP_THRESHOLD;

  let relockedCount = 0;
  let penalty = 0;

  const updatedQuests = quests.map(q => {
    if (!q.forceUnlocked || q.status !== 'active' || !q.forceUnlockedAt) return q;
    const hoursSinceUnlock = (now.getTime() - new Date(q.forceUnlockedAt).getTime()) / (1000 * 60 * 60);
    const timeTriggered = hoursSinceUnlock > FORCE_RELOCK_HOURS;
    if (!xpTriggered && !timeTriggered) return q;

    relockedCount++;
    penalty += FORCE_RELOCK_PENALTY;
    const escalated: QuestStatus =
      q.forceUnlockOrigin === 'maelstrom' ? 'maelstrom' :
      q.forceUnlockOrigin === 'cursed' ? 'maelstrom' : 'cursed';
    return {
      ...q,
      status: escalated,
      forceUnlocked: false,
      cannotForceUnlock: true,
      forceUnlockedAt: undefined,
      forceUnlockOrigin: undefined,
      updatedAt: now.toISOString(),
      ...(escalated === 'cursed' ? { cursedAt: now.toISOString() } : { maelstromAt: now.toISOString() }),
    };
  });

  if (relockedCount === 0) return { state, quests, relockedCount: 0 };

  const newXP = state.xp - penalty;
  return {
    state: { ...state, xp: newXP, level: getLevelFromXP(Math.max(0, newXP)) },
    quests: updatedQuests,
    relockedCount,
  };
}

export function checkNewAchievements(state: GameState, quests: Quest[]): string[] {
  const done = quests.filter(q => q.status === 'done');
  const newOnes: string[] = [];

  const checks: Record<string, () => boolean> = {
    first_quest:   () => quests.length >= 1,
    five_done:     () => done.length >= 5,
    ten_done:      () => done.length >= 10,
    twenty_done:   () => done.length >= 20,
    fifty_done:    () => done.length >= 50,
    streak_3:      () => state.streak >= 3,
    streak_7:      () => state.streak >= 7,
    level_5:       () => state.level >= 5,
    level_10:      () => state.level >= 10,
    critical_done: () => done.some(q => q.risk === 'critical'),
    no_penalty:    () => done.filter(q => !q.hauntedAt).length >= 5,
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
): { updatedState: GameState; newAchievements: string[]; xpEarned: number; leveledUp: boolean; newLevel: number; bonusType?: string } {
  const today = new Date().toDateString();
  const isFirstToday = state.lastQuestCompletedDate !== today;
  const dailyCount = isFirstToday ? 0 : (state.dailyQuestCount ?? 0);
  const newDailyCount = dailyCount + 1;

  // Athena's shield: 4+ quests in a day → 50% drain reduction for 12h
  const shieldActivated = newDailyCount >= 4;
  const drainShieldUntil = shieldActivated
    ? new Date(Date.now() + 12 * 3600 * 1000).toISOString()
    : state.drainShieldUntil;

  // CIRCE TRAP: quest gives 0 XP
  if (quest.circeTrapped) {
    const updatedState: GameState = {
      ...state,
      questsCompleted: state.questsCompleted + 1,
      lastQuestCompletedDate: today,
      dailyQuestCount: newDailyCount,
      ...(drainShieldUntil ? { drainShieldUntil } : {}),
    };
    const updatedQuests = allQuests.map(q =>
      q.id === quest.id ? { ...q, status: 'done' as const, completedAt: new Date().toISOString() } : q
    );
    const newAchievements = checkNewAchievements(updatedState, updatedQuests);
    updatedState.unlockedAchievements = [...updatedState.unlockedAchievements, ...newAchievements];
    return { updatedState, newAchievements, xpEarned: 0, leveledUp: false, newLevel: state.level, bonusType: 'circe' };
  }

  // Base XP with danger penalties
  let xpEarned = calculateQuestXP(quest.risk, state.dayMode);
  if (quest.status === 'maelstrom') xpEarned = Math.round(xpEarned * 0.5);
  else if (quest.status === 'cursed') xpEarned = Math.round(xpEarned * 0.75);

  // PREMIER DU MATIN: first quest of the day → +50%
  let bonusType: string | undefined;
  if (isFirstToday) {
    xpEarned = Math.round(xpEarned * 1.5);
    bonusType = 'dawn';
  } else {
    // MOMENTUM: each subsequent quest same day multiplies XP
    const mults = [1.0, 1.1, 1.2, 1.4];
    const mult = mults[Math.min(dailyCount, mults.length - 1)];
    if (mult > 1.0) {
      xpEarned = Math.round(xpEarned * mult);
      bonusType = 'momentum';
    }
  }

  if (shieldActivated) bonusType = 'shield';

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
    lastQuestCompletedDate: today,
    dailyQuestCount: newDailyCount,
    ...(drainShieldUntil ? { drainShieldUntil } : {}),
  };

  const updatedQuests = allQuests.map(q =>
    q.id === quest.id ? { ...q, status: 'done' as const, completedAt: new Date().toISOString() } : q
  );

  const newAchievements = checkNewAchievements(updatedState, updatedQuests);
  updatedState.unlockedAchievements = [...updatedState.unlockedAchievements, ...newAchievements];

  return { updatedState, newAchievements, xpEarned, leveledUp, newLevel, bonusType };
}
