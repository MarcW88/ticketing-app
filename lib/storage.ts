import type { GameState, Quest } from './types';
import { DEFAULT_GAME_STATE } from './constants';

const KEYS = {
  quests: 'questlog_v1_quests',
  state: 'questlog_v1_state',
} as const;

export const Storage = {
  getQuests(): Quest[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(KEYS.quests);
      return raw ? (JSON.parse(raw) as Quest[]) : [];
    } catch {
      return [];
    }
  },

  saveQuests(quests: Quest[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(KEYS.quests, JSON.stringify(quests));
    } catch (e) {
      console.warn('[QuestLog] Could not save quests:', e);
    }
  },

  getState(): GameState {
    if (typeof window === 'undefined') return { ...DEFAULT_GAME_STATE };
    try {
      const raw = localStorage.getItem(KEYS.state);
      return raw ? { ...DEFAULT_GAME_STATE, ...(JSON.parse(raw) as Partial<GameState>) } : { ...DEFAULT_GAME_STATE };
    } catch {
      return { ...DEFAULT_GAME_STATE };
    }
  },

  saveState(state: GameState): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(KEYS.state, JSON.stringify(state));
    } catch (e) {
      console.warn('[QuestLog] Could not save state:', e);
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEYS.quests);
    localStorage.removeItem(KEYS.state);
  },
};
