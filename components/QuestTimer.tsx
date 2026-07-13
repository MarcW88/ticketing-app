'use client';

import { useState, useEffect } from 'react';

interface QuestTimerProps {
  timeSpent: number;        // seconds already accumulated
  timerStartedAt?: string;  // if set, timer is currently running
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export default function QuestTimer({ timeSpent, timerStartedAt, onStart, onPause, onReset }: QuestTimerProps) {
  const isRunning = !!timerStartedAt;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, timerStartedAt]);

  const liveElapsed = isRunning && timerStartedAt
    ? Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000)
    : 0;

  const totalSeconds = (timeSpent ?? 0) + liveElapsed;
  const hasTime = totalSeconds > 0;

  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-xl mt-2"
      style={{ background: 'rgba(82,106,104,0.07)', border: '1px solid rgba(82,106,104,0.15)' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Left — indicator + time */}
      <div className="flex items-center gap-2">
        {/* Pulse dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: isRunning ? '#526a68' : hasTime ? '#c2915d' : 'rgba(139,122,100,0.35)',
            animation: isRunning ? 'timerPulse 1.4s ease-in-out infinite' : 'none',
          }}
        />
        {/* Time display */}
        <span
          className="font-mono text-sm font-bold tabular-nums"
          style={{ color: isRunning ? 'var(--petrol)' : hasTime ? 'var(--copper)' : 'var(--tweed)', letterSpacing: '0.05em' }}
        >
          {formatTime(totalSeconds)}
        </span>
        {isRunning && (
          <span className="text-xs" style={{ color: 'var(--tweed)', opacity: 0.7 }}>en cours</span>
        )}
      </div>

      {/* Right — controls */}
      <div className="flex items-center gap-1">
        {isRunning ? (
          <button
            onClick={onPause}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all hover:bg-black/5"
            style={{ color: 'var(--petrol)' }}
            title="Mettre en pause"
          >
            <PauseIcon /> Pause
          </button>
        ) : (
          <button
            onClick={onStart}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all hover:bg-black/5"
            style={{ color: 'var(--petrol)' }}
            title={hasTime ? 'Reprendre' : 'Démarrer le chrono'}
          >
            <PlayIcon /> {hasTime ? 'Reprendre' : 'Démarrer'}
          </button>
        )}
        {hasTime && !isRunning && (
          <button
            onClick={onReset}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-xs transition-all hover:bg-black/5"
            style={{ color: 'var(--tweed)' }}
            title="Remettre à zéro"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M2 1.5l6 3.5-6 3.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <rect x="2" y="1.5" width="2.5" height="7" rx="0.5" />
      <rect x="5.5" y="1.5" width="2.5" height="7" rx="0.5" />
    </svg>
  );
}
