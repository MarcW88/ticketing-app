'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Quest } from '@/lib/types';
import { UNIVERSE_CONFIG } from '@/lib/constants';

interface TimesheetPanelProps {
  quests: Quest[];
  isOpen: boolean;
  onClose: () => void;
}

/* ── helpers ──────────────────────────────────────────────────── */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min`;
  return `${m}min`;
}

function toLocalDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function isoToDay(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function dayLabel(day: string): string {
  const date = new Date(day + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (day === today.toISOString().slice(0, 10)) return "Aujourd'hui";
  if (day === yesterday.toISOString().slice(0, 10)) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
}

/* ── build data ───────────────────────────────────────────────── */

interface SessionRow {
  questId: string;
  questTitle: string;
  universe: string;
  universeIcon: string;
  universeColor: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  day: string;
}

interface QuestSummary {
  questId: string;
  questTitle: string;
  universeIcon: string;
  universeColor: string;
  universeId: string;
  total: number;
  status: string;
}

function buildRows(quests: Quest[]): SessionRow[] {
  const rows: SessionRow[] = [];
  for (const q of quests) {
    const u = UNIVERSE_CONFIG[q.universe];
    for (const s of q.timeSessions ?? []) {
      rows.push({
        questId: q.id,
        questTitle: q.title,
        universe: u.name,
        universeIcon: u.icon,
        universeColor: u.color,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        duration: s.duration,
        day: isoToDay(s.startedAt),
      });
    }
  }
  return rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function buildQuestSummaries(quests: Quest[]): QuestSummary[] {
  return quests
    .filter(q => (q.timeSpent ?? 0) > 0 || (q.timeSessions ?? []).length > 0)
    .map(q => {
      const u = UNIVERSE_CONFIG[q.universe];
      return {
        questId: q.id,
        questTitle: q.title,
        universeIcon: u.icon,
        universeColor: u.color,
        universeId: q.universe,
        total: q.timeSpent ?? 0,
        status: q.status,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function exportCSV(rows: SessionRow[], questSummaries: QuestSummary[]) {
  const lines = [
    'Date,Heure début,Heure fin,Durée (min),Quête,Univers',
    ...rows.map(r => [
      toLocalDate(r.startedAt),
      toLocalTime(r.startedAt),
      toLocalTime(r.endedAt),
      (r.duration / 60).toFixed(1),
      `"${r.questTitle.replace(/"/g, '""')}"`,
      r.universe,
    ].join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timesheet-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── component ────────────────────────────────────────────────── */

export default function TimesheetPanel({ quests, isOpen, onClose }: TimesheetPanelProps) {
  const rows = useMemo(() => buildRows(quests), [quests]);
  const questSummaries = useMemo(() => buildQuestSummaries(quests), [quests]);
  const totalSeconds = useMemo(() => rows.reduce((s, r) => s + r.duration, 0), [rows]);

  // Group rows by day
  const byDay = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const r of rows) {
      if (!map.has(r.day)) map.set(r.day, []);
      map.get(r.day)!.push(r);
    }
    return map;
  }, [rows]);

  // This week total
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekTotal = rows.filter(r => r.day >= weekStartStr).reduce((s, r) => s + r.duration, 0);

  // Today total
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTotal = rows.filter(r => r.day === todayStr).reduce((s, r) => s + r.duration, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="ts-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(44,41,36,0.55)', backdropFilter: 'blur(3px)' }}
            onClick={onClose}
          />

          <motion.div
            key="ts-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col shadow-2xl"
            style={{ width: '420px', maxWidth: '100vw', background: 'var(--cream)', borderLeft: '1.5px solid var(--line)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: 'var(--line)', background: 'rgba(238,228,211,0.6)' }}>
              <div>
                <h2 className="font-display text-lg font-bold" style={{ color: 'var(--petrol)' }}>
                  📊 Timesheet
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--tweed)' }}>
                  Historique du temps tracké
                </p>
              </div>
              <div className="flex items-center gap-2">
                {rows.length > 0 && (
                  <button
                    onClick={() => exportCSV(rows, questSummaries)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:shadow-sm"
                    style={{ borderColor: 'var(--petrol)', color: 'var(--petrol)' }}
                    title="Exporter en CSV"
                  >
                    ↓ CSV
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:bg-black/8 transition-all"
                  style={{ color: 'var(--tweed)' }}
                >✕</button>
              </div>
            </div>

            {/* Summary bar */}
            {totalSeconds > 0 && (
              <div className="flex gap-0 border-b shrink-0" style={{ borderColor: 'var(--line)' }}>
                <StatCell label="Aujourd'hui" value={formatDuration(todayTotal)} accent="#526a68" />
                <StatCell label="Cette semaine" value={formatDuration(weekTotal)} accent="#c2915d" />
                <StatCell label="Total" value={formatDuration(totalSeconds)} accent="#6D28D9" />
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <span className="text-4xl">⏱</span>
                  <p className="font-bold text-sm" style={{ color: 'var(--petrol)' }}>
                    Aucune session enregistrée
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--tweed)' }}>
                    Démarre le chrono sur une carte "En Quête" puis mets-le en pause pour enregistrer une session.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Sessions by day */}
                  <div className="px-5 pt-4 pb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--tweed)' }}>
                      Sessions
                    </p>
                    {Array.from(byDay.entries()).map(([day, dayRows]) => {
                      const dayTotal = dayRows.reduce((s, r) => s + r.duration, 0);
                      return (
                        <div key={day} className="mb-4">
                          {/* Day header */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold capitalize" style={{ color: 'var(--petrol)' }}>
                              {dayLabel(day)}
                            </span>
                            <span className="text-xs font-bold" style={{ color: 'var(--copper)' }}>
                              {formatDuration(dayTotal)}
                            </span>
                          </div>
                          {/* Sessions */}
                          <div className="space-y-1.5">
                            {dayRows.map((r, i) => (
                              <div key={i}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl border"
                                style={{ borderColor: `${r.universeColor}25`, background: `${r.universeColor}07` }}
                              >
                                <span className="text-base shrink-0">{r.universeIcon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>
                                    {r.questTitle}
                                  </p>
                                  <p className="text-xs" style={{ color: 'var(--tweed)' }}>
                                    {toLocalTime(r.startedAt)} → {toLocalTime(r.endedAt)}
                                  </p>
                                </div>
                                <span className="text-xs font-bold shrink-0" style={{ color: r.universeColor }}>
                                  {formatDuration(r.duration)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Per-quest totals */}
                  <div className="px-5 pt-2 pb-6 border-t" style={{ borderColor: 'var(--line)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3 pt-4" style={{ color: 'var(--tweed)' }}>
                      Total par quête
                    </p>
                    <div className="space-y-1.5">
                      {questSummaries.map(q => (
                        <div key={q.questId} className="flex items-center gap-3">
                          <span className="text-base shrink-0">{q.universeIcon}</span>
                          <p className="flex-1 text-xs truncate" style={{ color: 'var(--ink)' }}>
                            {q.questTitle}
                            {q.status === 'done' && <span className="ml-1 opacity-50">✅</span>}
                          </p>
                          <span className="text-xs font-bold shrink-0" style={{ color: 'var(--copper)' }}>
                            {formatDuration(q.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex-1 px-4 py-3 text-center border-r last:border-r-0" style={{ borderColor: 'var(--line)' }}>
      <p className="text-xs" style={{ color: 'var(--tweed)' }}>{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: accent }}>{value}</p>
    </div>
  );
}
