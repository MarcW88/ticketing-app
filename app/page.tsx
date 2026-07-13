'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Quest, GameState, QuestStatus, UniverseId, DayMode } from '@/lib/types';
import { Storage } from '@/lib/storage';
import { updateHauntedCursed, completeQuestWithXP, updateStreak, getLevelInfo } from '@/lib/gameEngine';
import { UNIVERSE_CONFIG, TAVERN_WISDOM, DEFAULT_GAME_STATE, ACHIEVEMENTS } from '@/lib/constants';
import Header from '@/components/Header';
import UniverseFilter from '@/components/UniverseFilter';
import QuestBoard from '@/components/QuestBoard';
import NewQuestModal from '@/components/NewQuestModal';
import AchievementToast from '@/components/AchievementToast';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import HelpModal from '@/components/HelpModal';
import TimesheetPanel from '@/components/TimesheetPanel';

export default function Page() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [gameState, setGameState] = useState<GameState>({ ...DEFAULT_GAME_STATE });
  const [universeFilter, setUniverseFilter] = useState<UniverseId | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [xpGain, setXPGain] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTimesheet, setShowTimesheet] = useState(false);
  const xpGainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedQuests = Storage.getQuests();
      const savedState = Storage.getState();
      const updatedQuests = updateHauntedCursed(savedQuests);
      const updatedState = updateStreak(savedState);
      setQuests(updatedQuests);
      setGameState(updatedState);
      Storage.saveQuests(updatedQuests);
      Storage.saveState(updatedState);
      // Auto-open guide on first visit
      const seen = localStorage.getItem('quest-log-guide-seen');
      if (!seen) setShowHelp(true);
    } catch (err) {
      console.error('[QuestLog] Init error:', err);
    } finally {
      setMounted(true);
    }
  }, []);

  const saveAll = useCallback((newQuests: Quest[], newState: GameState) => {
    Storage.saveQuests(newQuests);
    Storage.saveState(newState);
  }, []);

  // ── Quest CRUD ──────────────────────────────────────────────────────

  const handleSaveQuest = useCallback((data: Partial<Quest> & { id?: string }) => {
    setQuests(prev => {
      let newQuests: Quest[];

      if (data.id) {
        // Edit existing
        newQuests = prev.map(q =>
          q.id === data.id
            ? { ...q, ...data, updatedAt: new Date().toISOString() }
            : q
        );
      } else {
        // Create new
        const now = new Date().toISOString();
        const newQuest: Quest = {
          id: crypto.randomUUID(),
          title: data.title ?? 'Sans titre',
          description: data.description,
          status: 'backlog',
          risk: data.risk ?? 'medium',
          universe: data.universe ?? 'mario',
          missionClass: data.missionClass ?? 'platform',
          client: data.client,
          lore: data.lore,
          dueDate: data.dueDate,
          xpReward: data.xpReward ?? 50,
          subtasks: data.subtasks ?? [],
          tags: data.tags ?? [],
          createdAt: now,
          updatedAt: now,
        };
        newQuests = [newQuest, ...prev];

        // Check first_quest achievement
        if (prev.length === 0) {
          setGameState(gs => {
            if (!gs.unlockedAchievements.includes('first_quest')) {
              const updated = { ...gs, unlockedAchievements: [...gs.unlockedAchievements, 'first_quest'] };
              Storage.saveState(updated);
              setPendingAchievements(p => [...p, 'first_quest']);
              return updated;
            }
            return gs;
          });
        }
      }

      Storage.saveQuests(newQuests);
      return newQuests;
    });

    setIsModalOpen(false);
    setEditingQuest(null);
  }, []);

  const handleStatusChange = useCallback((id: string, status: QuestStatus) => {
    setQuests(prev => {
      const newQuests = prev.map(q =>
        q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q
      );
      Storage.saveQuests(newQuests);
      return newQuests;
    });
  }, []);

  const handleComplete = useCallback((id: string) => {
    setQuests(prev => {
      const quest = prev.find(q => q.id === id);
      if (!quest) return prev;

      const { updatedState, newAchievements, xpEarned, leveledUp, newLevel } =
        completeQuestWithXP(quest, gameState, prev);

      // Auto-stop timer if running and record the session
      const now = new Date().toISOString();
      let extraTimeSpent = 0;
      let extraSession = null;
      if (quest.timerStartedAt) {
        extraTimeSpent = Math.floor((Date.now() - new Date(quest.timerStartedAt).getTime()) / 1000);
        if (extraTimeSpent > 0) {
          extraSession = { startedAt: quest.timerStartedAt, endedAt: now, duration: extraTimeSpent };
        }
      }

      const newQuests = prev.map(q =>
        q.id === id ? {
          ...q,
          status: 'done' as const,
          completedAt: now,
          timerStartedAt: undefined,
          timeSpent: (q.timeSpent ?? 0) + extraTimeSpent,
          timeSessions: [...(q.timeSessions ?? []), ...(extraSession ? [extraSession] : [])],
        } : q
      );

      setGameState(updatedState);
      saveAll(newQuests, updatedState);

      // XP float animation
      setXPGain(xpEarned);
      if (xpGainTimer.current) clearTimeout(xpGainTimer.current);
      xpGainTimer.current = setTimeout(() => setXPGain(null), 1600);

      // Level up
      if (leveledUp) {
        setTimeout(() => setLevelUp(newLevel), 400);
      }

      // Achievements
      if (newAchievements.length > 0) {
        setPendingAchievements(p => [...p, ...newAchievements]);
      }

      return newQuests;
    });
  }, [gameState, saveAll]);

  const handleDelete = useCallback((id: string) => {
    setQuests(prev => {
      const newQuests = prev.filter(q => q.id !== id);
      Storage.saveQuests(newQuests);
      return newQuests;
    });
  }, []);

  const handleEdit = useCallback((quest: Quest) => {
    setEditingQuest(quest);
    setIsModalOpen(true);
  }, []);

  const handleDayModeChange = useCallback((mode: DayMode) => {
    setGameState(prev => {
      const updated = { ...prev, dayMode: mode };
      Storage.saveState(updated);
      return updated;
    });
  }, []);

  const handleDismissAchievement = useCallback((id: string) => {
    setPendingAchievements(prev => prev.filter(a => a !== id));
  }, []);

  const openNewQuest = useCallback(() => {
    setEditingQuest(null);
    setIsModalOpen(true);
  }, []);

  const handleTimerStart = useCallback((id: string) => {
    setQuests(prev => {
      const newQuests = prev.map(q =>
        q.id === id ? { ...q, timerStartedAt: new Date().toISOString() } : q
      );
      Storage.saveQuests(newQuests);
      return newQuests;
    });
  }, []);

  const handleTimerPause = useCallback((id: string) => {
    setQuests(prev => {
      const quest = prev.find(q => q.id === id);
      if (!quest?.timerStartedAt) return prev;
      const endedAt = new Date().toISOString();
      const duration = Math.floor((Date.now() - new Date(quest.timerStartedAt).getTime()) / 1000);
      if (duration < 1) return prev;
      const session = { startedAt: quest.timerStartedAt, endedAt, duration };
      const newQuests = prev.map(q =>
        q.id === id
          ? { ...q, timeSpent: (q.timeSpent ?? 0) + duration, timerStartedAt: undefined, timeSessions: [...(q.timeSessions ?? []), session] }
          : q
      );
      Storage.saveQuests(newQuests);
      return newQuests;
    });
  }, []);

  const handleTimerReset = useCallback((id: string) => {
    setQuests(prev => {
      const newQuests = prev.map(q =>
        q.id === id ? { ...q, timeSpent: 0, timerStartedAt: undefined } : q
      );
      Storage.saveQuests(newQuests);
      return newQuests;
    });
  }, []);

  // Tavern wisdom quote (changes daily)
  const wisdomIndex = Math.floor(Date.now() / 86400000) % TAVERN_WISDOM.length;
  const wisdom = TAVERN_WISDOM[wisdomIndex];

  // Stats
  const done = quests.filter(q => q.status === 'done');
  const active = quests.filter(q => q.status === 'active' || q.status === 'backlog');
  const haunted = quests.filter(q => q.status === 'haunted' || q.status === 'cursed');
  const levelInfo = getLevelInfo(gameState.level);
  const unlockedCount = gameState.unlockedAchievements.length;

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-float">📜</div>
          <p className="font-display text-xl" style={{ color: 'var(--petrol)' }}>Chargement du Codex...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        gameState={gameState}
        xpGain={xpGain}
        onDayModeChange={handleDayModeChange}
        onNewQuest={openNewQuest}
        onHelp={() => setShowHelp(true)}
      />

      <UniverseFilter
        current={universeFilter}
        quests={quests}
        onChange={setUniverseFilter}
      />

      {/* Empty state */}
      {quests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6 animate-float">🌌</div>
          <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--petrol)' }}>
            Le Codex est vide
          </h2>
          <p className="text-sm max-w-md mb-6" style={{ color: 'var(--tweed)' }}>
            Votre première quête vous attend. Choisissez un univers, définissez votre mission,
            et commencez à bâtir votre légende.
          </p>
          <button
            onClick={openNewQuest}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all"
            style={{ background: 'var(--petrol)', color: 'var(--cream)', boxShadow: '0 6px 24px rgba(82,106,104,0.35)' }}
          >
            ⚔️ Créer la Première Quête
          </button>
          <p className="text-xs mt-8 italic max-w-xs" style={{ color: 'var(--tweed)', opacity: 0.7 }}>
            &quot;{wisdom}&quot;
          </p>
        </div>
      )}

      {/* Main board */}
      {quests.length > 0 && (
        <QuestBoard
          quests={quests}
          universeFilter={universeFilter}
          onStatusChange={handleStatusChange}
          onComplete={handleComplete}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onNewQuest={openNewQuest}
          onTimerStart={handleTimerStart}
          onTimerPause={handleTimerPause}
          onTimerReset={handleTimerReset}
        />
      )}

      {/* Timesheet button */}
      <button
        onClick={() => setShowTimesheet(true)}
        className="fixed bottom-6 left-24 z-40 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border transition-all shadow-md"
        style={{ background: 'rgba(247,241,231,0.92)', color: 'var(--tweed)', borderColor: 'var(--line)' }}
        title="Voir la timesheet"
      >
        📊 Timesheet
      </button>

      {/* Stats toggle */}
      <button
        onClick={() => setShowStats(!showStats)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border transition-all shadow-md"
        style={{
          background: showStats ? 'var(--petrol)' : 'rgba(247,241,231,0.92)',
          color: showStats ? 'var(--cream)' : 'var(--tweed)',
          borderColor: 'var(--line)',
          backdropFilter: 'blur(8px)',
        }}
      >
        📊 Stats
      </button>

      {/* Stats panel */}
      {showStats && (
        <div
          className="fixed bottom-16 left-6 z-40 w-72 rounded-2xl shadow-xl border p-5 space-y-4"
          style={{ background: 'var(--cream)', borderColor: 'var(--line)', backdropFilter: 'blur(10px)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm" style={{ color: 'var(--petrol)' }}>
              {levelInfo.icon} {levelInfo.title}
            </h3>
            <button
              onClick={() => setShowStats(false)}
              className="text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/5"
              style={{ color: 'var(--tweed)' }}
            >✕</button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Terminées', value: done.length, icon: '✅' },
              { label: 'Actives', value: active.length, icon: '⚙️' },
              { label: 'Hantées', value: haunted.length, icon: haunted.length > 0 ? '👻' : '🕊️' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2" style={{ background: 'rgba(238,228,211,0.5)' }}>
                <p className="text-xl">{s.icon}</p>
                <p className="font-bold text-base" style={{ color: 'var(--petrol)' }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--tweed)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* XP + Streak */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: 'rgba(194,145,93,0.1)' }}>
              <p className="font-bold text-sm" style={{ color: 'var(--copper)' }}>{gameState.xpTotal.toLocaleString()}</p>
              <p className="text-xs" style={{ color: 'var(--tweed)' }}>XP total</p>
            </div>
            <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: 'rgba(194,145,93,0.1)' }}>
              <p className="font-bold text-sm" style={{ color: gameState.streak >= 3 ? '#c2410c' : 'var(--copper)' }}>
                {gameState.streak > 0 ? `🔥 ${gameState.streak}` : '—'}
              </p>
              <p className="text-xs" style={{ color: 'var(--tweed)' }}>Jours actifs</p>
            </div>
          </div>

          {/* Universe breakdown */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tweed)' }}>
              Par univers
            </p>
            {Object.values(UNIVERSE_CONFIG).map(u => {
              const count = done.filter(q => q.universe === u.id).length;
              const total = quests.filter(q => q.universe === u.id).length;
              if (total === 0) return null;
              return (
                <div key={u.id} className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm shrink-0">{u.icon}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(139,122,100,0.18)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${total ? (count / total) * 100 : 0}%`, background: u.color }}
                    />
                  </div>
                  <span className="text-xs shrink-0" style={{ color: 'var(--tweed)', minWidth: 28, textAlign: 'right' }}>
                    {count}/{total}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Achievements */}
          <div className="border-t pt-3" style={{ borderColor: 'var(--line)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tweed)' }}>
              Succès ({unlockedCount}/{ACHIEVEMENTS.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {ACHIEVEMENTS.map(a => (
                <span
                  key={a.id}
                  title={a.title}
                  className="text-base transition-all duration-200"
                  style={{ opacity: gameState.unlockedAchievements.includes(a.id) ? 1 : 0.2 }}
                >
                  {a.icon}
                </span>
              ))}
            </div>
          </div>

          {/* Wisdom */}
          <p className="text-xs italic leading-relaxed" style={{ color: 'var(--tweed)', opacity: 0.75 }}>
            &quot;{wisdom}&quot;
          </p>
        </div>
      )}

      {/* Modals & overlays */}
      <NewQuestModal
        isOpen={isModalOpen}
        editingQuest={editingQuest}
        dayMode={gameState.dayMode}
        onClose={() => { setIsModalOpen(false); setEditingQuest(null); }}
        onSave={handleSaveQuest}
      />

      <LevelUpOverlay
        newLevel={levelUp}
        onDone={() => setLevelUp(null)}
      />

      <HelpModal
        isOpen={showHelp}
        onClose={() => {
          setShowHelp(false);
          try { localStorage.setItem('quest-log-guide-seen', '1'); } catch {}
        }}
      />

      <TimesheetPanel
        quests={quests}
        isOpen={showTimesheet}
        onClose={() => setShowTimesheet(false)}
      />

      <AchievementToast
        achievementIds={pendingAchievements}
        onDismiss={handleDismissAchievement}
      />
    </div>
  );
}
