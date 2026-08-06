'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Quest, GameState, QuestStatus, DayMode, XPChallenge } from '@/lib/types';
import { Storage } from '@/lib/storage';
import { updateHauntedCursed, updateRiskByDeadline, completeQuestWithXP, applyXPDrain, updateStreak, getLevelInfo } from '@/lib/gameEngine';
import { TAVERN_WISDOM, DEFAULT_GAME_STATE, ACHIEVEMENTS } from '@/lib/constants';
import Header from '@/components/Header';
import UniverseFilter from '@/components/UniverseFilter';
import QuestBoard from '@/components/QuestBoard';
import NewQuestModal from '@/components/NewQuestModal';
import AchievementToast from '@/components/AchievementToast';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import HelpModal from '@/components/HelpModal';
import EmberBackground from '@/components/EmberBackground';
import TimesheetPanel from '@/components/TimesheetPanel';

export default function Page() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [gameState, setGameState] = useState<GameState>({ ...DEFAULT_GAME_STATE });
  const [universeFilter, setUniverseFilter] = useState<string>('all');
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

  // Load from Supabase (with localStorage fallback + one-time migration)
  useEffect(() => {
    async function init() {
      try {
        // Migrate any existing localStorage quests to Supabase on first load
        await Storage.migrateLocalToSupabase();
        const savedQuests = await Storage.getQuestsAsync();
        const savedState = Storage.getState();
        const migratedQuests = savedQuests.map(q =>
          q.universe !== 'odyssey' ? { ...q, universe: 'odyssey' as const, missionClass: 'odyssey' as const } : q
        );
        const updatedQuests = updateRiskByDeadline(updateHauntedCursed(migratedQuests));
        const updatedState = updateStreak(savedState);
        const { state: drainedState, totalDrained } = applyXPDrain(updatedState, updatedQuests);
        setQuests(updatedQuests);
        setGameState(drainedState);
        if (totalDrained > 0) {
          setXPGain(-totalDrained);
          setTimeout(() => setXPGain(null), 2500);
        }
        await Storage.saveQuestsAsync(updatedQuests);
        Storage.saveState(drainedState);
        const seen = localStorage.getItem('quest-log-guide-seen');
        if (!seen) setShowHelp(true);
      } catch (err) {
        console.error('[QuestLog] Init error:', err);
      } finally {
        setMounted(true);
      }
    }
    init();
  }, []);

  const saveAll = useCallback((newQuests: Quest[], newState: GameState) => {
    Storage.saveQuestsAsync(newQuests);
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
          universe: 'odyssey' as const,
          missionClass: 'odyssey' as const,
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
      Storage.saveQuestsAsync(newQuests);
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

      // Auto-archive oldest done quests when count reaches 15
      const doneQuests = newQuests.filter(q => q.status === 'done');
      let finalQuests = newQuests;
      if (doneQuests.length >= 15) {
        const sorted = [...doneQuests].sort((a, b) =>
          (a.completedAt ?? a.updatedAt).localeCompare(b.completedAt ?? b.updatedAt)
        );
        const toArchive = new Set(sorted.slice(0, sorted.length - 14).map(q => q.id));
        finalQuests = newQuests.map(q => toArchive.has(q.id) ? { ...q, status: 'archived' as const } : q);
      }

      setGameState(updatedState);
      saveAll(finalQuests, updatedState);

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

      return finalQuests;
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

  const handleSetChallenge = useCallback((target: number, label: string) => {
    setGameState(prev => {
      const challenge: XPChallenge = { target, label, startXP: prev.xpTotal, createdAt: new Date().toISOString() };
      const updated = { ...prev, challenge };
      Storage.saveState(updated);
      return updated;
    });
  }, []);

  const handleClearChallenge = useCallback(() => {
    setGameState(prev => {
      const updated = { ...prev, challenge: undefined };
      Storage.saveState(updated);
      return updated;
    });
  }, []);

  const handleToggleChallengeTarget = useCallback((id: string) => {
    setQuests(prev => {
      const newQuests = prev.map(q =>
        q.id === id ? { ...q, challengeTarget: !q.challengeTarget } : q
      );
      Storage.saveQuests(newQuests);
      return newQuests;
    });
  }, []);

  const handleResetXP = useCallback(() => {
    setGameState(prev => {
      const updated = { ...prev, xp: 0, level: 1, challenge: undefined };
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

  const isBlocked = quests.some(q => q.status === 'haunted' || q.status === 'cursed' || q.status === 'maelstrom');

  const challengeTargets = gameState.challenge ? {
    total: quests.filter(q => q.challengeTarget).length,
    done: quests.filter(q => q.challengeTarget && q.status === 'done'
      && q.completedAt && gameState.challenge && q.completedAt >= gameState.challenge.createdAt).length,
  } : undefined;

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
    <div className="min-h-screen" style={{ position: 'relative' }}>
      <EmberBackground />
      <Header
        gameState={gameState}
        xpGain={xpGain}
        onDayModeChange={handleDayModeChange}
        onNewQuest={openNewQuest}
        onHelp={() => setShowHelp(true)}
        onSetChallenge={handleSetChallenge}
        onClearChallenge={handleClearChallenge}
        onResetXP={handleResetXP}
        challengeTargets={challengeTargets}
      />

      <UniverseFilter
        current={universeFilter}
        quests={quests}
        onChange={setUniverseFilter}
      />

      {/* Empty state */}
      {quests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">⚔️</div>
          <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--gold)' }}>
            L’Odyssée Commence
          </h2>
          <p className="text-sm max-w-md mb-6 italic" style={{ color: 'var(--tweed)' }}>
            Votre première épreuve vous attend. Définissez votre mission et partez à la conquête d’Ithaque.
          </p>
          <button
            onClick={openNewQuest}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all font-display"
            style={{ background: 'linear-gradient(135deg,#8B6520,#C9963C)', color: '#06090F', boxShadow: '0 6px 24px rgba(201,150,60,0.35)' }}
          >
            ⚔️ Première Épreuve
          </button>
          <p className="text-xs mt-8 italic max-w-xs font-display" style={{ color: 'var(--gold)', opacity: 0.6 }}>
            &ldquo;{wisdom}&rdquo;
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
          hasChallenge={!!gameState.challenge}
          onToggleChallengeTarget={handleToggleChallengeTarget}
          isBlocked={isBlocked}
        />
      )}

      {/* Timesheet button */}
      <button
        onClick={() => setShowTimesheet(true)}
        className="fixed bottom-6 left-24 z-40 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border transition-all shadow-md"
        style={{ background: 'rgba(6,9,15,0.92)', color: 'var(--tweed)', borderColor: 'var(--line)' }}
        title="Voir la timesheet"
      >
        📊 Timesheet
      </button>

      {/* Stats toggle */}
      <button
        onClick={() => setShowStats(!showStats)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border transition-all shadow-md"
        style={{
          background: showStats ? 'var(--gold)' : 'rgba(6,9,15,0.92)',
          color: showStats ? '#06090F' : 'var(--tweed)',
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
          style={{ background: 'rgba(11,18,32,0.97)', borderColor: 'var(--line)', backdropFilter: 'blur(10px)' }}
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
              { label: 'Ithaque', value: done.length, icon: '🏛️' },
              { label: 'En Mer', value: active.length, icon: '⚔️' },
              { label: 'Épreuves', value: haunted.length, icon: haunted.length > 0 ? '🌀' : '🦉' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2" style={{ background: 'rgba(201,150,60,0.08)' }}>
                <p className="text-xl">{s.icon}</p>
                <p className="font-bold text-base" style={{ color: 'var(--petrol)' }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--tweed)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* XP + Streak */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: 'rgba(201,150,60,0.08)' }}>
              <p className="font-bold text-sm" style={{ color: 'var(--gold)' }}>{gameState.xpTotal.toLocaleString()}</p>
              <p className="text-xs" style={{ color: 'var(--tweed)' }}>XP total</p>
            </div>
            <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: 'rgba(201,150,60,0.08)' }}>
              <p className="font-bold text-sm" style={{ color: gameState.streak >= 3 ? '#c2410c' : 'var(--copper)' }}>
                {gameState.streak > 0 ? `🔥 ${gameState.streak}` : '—'}
              </p>
              <p className="text-xs" style={{ color: 'var(--tweed)' }}>Jours actifs</p>
            </div>
          </div>

          {/* Journey progress */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 font-display" style={{ color: 'var(--gold)' }}>
              Voyage vers Ithaque
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(201,150,60,0.12)' }}>
                <div
                  className="h-full rounded-full xp-shimmer transition-all duration-500"
                  style={{ width: `${quests.length ? (done.length / quests.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs shrink-0 font-bold" style={{ color: 'var(--gold)' }}>
                {done.length}/{quests.length}
              </span>
            </div>
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

          {/* Export / Import */}
          <div className="border-t pt-3 flex gap-2" style={{ borderColor: 'var(--line)' }}>
            <button
              className="flex-1 text-xs py-1.5 rounded-lg border font-bold transition-all hover:opacity-80"
              style={{ borderColor: 'var(--line)', color: 'var(--tweed)' }}
              onClick={() => {
                const data = localStorage.getItem('questlog_v1_quests') ?? '[]';
                const blob = new Blob([data], { type: 'application/json' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = 'odyssey-quests.json'; a.click();
              }}
            >
              ⬇️ Exporter
            </button>
            <label
              className="flex-1 text-xs py-1.5 rounded-lg border font-bold transition-all hover:opacity-80 cursor-pointer text-center"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
            >
              ⬆️ Importer
              <input type="file" accept=".json" className="hidden" onChange={e => {
                const file = e.target.files?.[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  try {
                    const parsed = JSON.parse(ev.target?.result as string);
                    if (Array.isArray(parsed)) {
                      localStorage.setItem('questlog_v1_quests', JSON.stringify(parsed));
                      window.location.reload();
                    } else alert('Fichier invalide');
                  } catch { alert('Erreur de lecture'); }
                };
                reader.readAsText(file);
              }} />
            </label>
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
