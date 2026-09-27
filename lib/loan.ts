import type { GameState } from './types';
import { getLevelFromXP } from './gameEngine';

export const LOAN_DAILY_RATE = 0.001; // 0.1% of borrowed XP in drachmes per started 24h
export const MAX_LOAN_XP = 20000;

export function loanInterest(principal: number, startedAt: string, now = Date.now()): number {
  const start = Date.parse(startedAt);
  if (!Number.isSafeInteger(principal) || principal <= 0 || !Number.isFinite(start)) return 0;
  const days = Math.max(1, Math.ceil(Math.max(0, now - start) / 86400000));
  return Math.ceil(principal * LOAN_DAILY_RATE * days);
}

export function startLoan(state: GameState, principal: number, now = Date.now()): GameState | null {
  if (state.xpLoan || !Number.isSafeInteger(principal) || principal < 1 || principal > MAX_LOAN_XP) return null;
  const xp = state.xp + principal;
  return { ...state, xp, xpLoan: { principal, startedAt: new Date(now).toISOString() } };
}

export function repayLoan(state: GameState, now = Date.now()): GameState | null {
  const loan = state.xpLoan;
  if (!loan) return null;
  const interest = loanInterest(loan.principal, loan.startedAt, now);
  if ((state.coins ?? 0) < interest) return null;
  const xp = state.xp - loan.principal;
  return { ...state, xp, level: getLevelFromXP(xp), coins: (state.coins ?? 0) - interest, xpLoan: undefined };
}
