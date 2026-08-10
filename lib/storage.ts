import type { GameState, Quest } from './types';
import { DEFAULT_GAME_STATE } from './constants';
import { supabase } from './supabase';

const KEYS = {
  quests: 'questlog_v1_quests',
  state:  'questlog_v1_state',
} as const;

// ── localStorage helpers (gameState stays local, quests go to Supabase) ────

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Supabase quest storage ───────────────────────────────────────────────────

export const Storage = {
  // Load quests: Supabase first, fallback to localStorage
  async getQuestsAsync(): Promise<Quest[]> {
    if (!supabase) return lsGet<Quest[]>(KEYS.quests, []);
    try {
      const { data, error } = await supabase
        .from('quests')
        .select('data')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) return data.map((r: { data: Quest }) => r.data);
    } catch (e) {
      console.warn('[QuestLog] Supabase read failed, using localStorage:', e);
    }
    return lsGet<Quest[]>(KEYS.quests, []);
  },

  // Save quests: Supabase + localStorage mirror
  async saveQuestsAsync(quests: Quest[]): Promise<void> {
    lsSet(KEYS.quests, quests);
    if (!supabase) return;
    try {
      if (quests.length === 0) return;
      const rows = quests.map(q => ({ id: q.id, data: q, updated_at: new Date().toISOString() }));
      const { error } = await supabase.from('quests').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    } catch (e) {
      console.warn('[QuestLog] Supabase write failed:', e);
    }
  },

  // Delete a single quest from Supabase
  async deleteQuestAsync(id: string): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.from('quests').delete().eq('id', id);
    } catch (e) {
      console.warn('[QuestLog] Supabase delete failed:', e);
    }
  },

  // GameState: localStorage + Supabase
  getState(): GameState {
    return lsGet<GameState>(KEYS.state, { ...DEFAULT_GAME_STATE });
  },

  saveState(state: GameState): void {
    lsSet(KEYS.state, state);
  },

  async saveStateAsync(state: GameState): Promise<void> {
    lsSet(KEYS.state, state);
    if (!supabase) return;
    try {
      await supabase.from('game_state').upsert(
        { id: 'singleton', data: state, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('[QuestLog] Supabase state write failed:', e);
    }
  },

  async getStateAsync(): Promise<GameState> {
    if (!supabase) return lsGet<GameState>(KEYS.state, { ...DEFAULT_GAME_STATE });
    try {
      const { data, error } = await supabase
        .from('game_state')
        .select('data')
        .eq('id', 'singleton')
        .single();
      if (!error && data?.data) {
        const remote = data.data as GameState;
        lsSet(KEYS.state, remote);
        return remote;
      }
    } catch {}
    return lsGet<GameState>(KEYS.state, { ...DEFAULT_GAME_STATE });
  },

  // Sync localStorage quests to Supabase (one-time migration)
  async migrateLocalToSupabase(): Promise<boolean> {
    if (!supabase) return false;
    const local = lsGet<Quest[]>(KEYS.quests, []);
    if (local.length === 0) return false;
    try {
      const rows = local.map(q => ({ id: q.id, data: q, updated_at: new Date().toISOString() }));
      const { error } = await supabase.from('quests').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn('[QuestLog] Migration failed:', e);
      return false;
    }
  },

  // Sync quests deleted individually
  getQuests(): Quest[] { return lsGet<Quest[]>(KEYS.quests, []); },
  saveQuests(quests: Quest[]): void { lsSet(KEYS.quests, quests); },
};
