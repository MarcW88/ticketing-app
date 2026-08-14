'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, Quest, MonthRecord, ActiveReward } from '@/lib/types';
import { REWARDS, type RewardDef } from '@/lib/constants';

interface TreasurePanelProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  quests: Quest[];
  onPurchase: (rewardId: string) => void;
  onRenew: (activeRewardId: string) => void;
}

type Tab = 'marche' | 'voyages' | 'actifs';

function computeStreakMonths(history: MonthRecord[]): number {
  const sorted = [...history].sort((a, b) => b.month.localeCompare(a.month));
  let streak = 0;
  for (const r of sorted) {
    if (r.questsDone >= 3 && r.xpGained >= r.xpLost) streak++;
    else break;
  }
  return streak;
}

function hasNoCatastrophicMonths(history: MonthRecord[], n: number): boolean {
  const sorted = [...history].sort((a, b) => b.month.localeCompare(a.month));
  const last = sorted.slice(0, n);
  if (last.length < n) return false;
  return last.every(m => m.questsDone >= 2 && m.xpGained >= m.xpLost);
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export default function TreasurePanel({ isOpen, onClose, gameState, quests, onPurchase, onRenew }: TreasurePanelProps) {
  const [tab, setTab] = useState<Tab>('marche');
  const [confirm, setConfirm] = useState<string | null>(null);

  const coins         = gameState.coins ?? 0;
  const vault         = gameState.vaultCoins ?? 0;
  const italy         = gameState.italyFragments ?? 0;
  const sea           = gameState.seaFragments ?? 0;
  const france        = gameState.franceFragments ?? 0;
  const boss          = gameState.bossQuestsCompleted ?? 0;
  const history       = gameState.monthlyHistory ?? [];
  const activeRewards = gameState.activeRewards ?? [];

  const streakMonths = useMemo(() => computeStreakMonths(history), [history]);

  function checkCond(cond: string): boolean {
    switch (cond) {
      case 'sea_10':             return sea    >= 10;
      case 'france_20':          return france >= 20;
      case 'italy_60':           return italy  >= 60;
      case 'streak_1m':          return streakMonths >= 1;
      case 'streak_3m':          return streakMonths >= 3;
      case 'streak_6m':          return streakMonths >= 6;
      case 'boss_4':             return boss   >= 4;
      case 'no_catastrophic_2m': return hasNoCatastrophicMonths(history, 2);
      case 'no_catastrophic_3m': return hasNoCatastrophicMonths(history, 3);
      default: return false;
    }
  }

  function condLabel(cond: string): string {
    switch (cond) {
      case 'sea_10':             return `🌊 Fragments Mer ${sea}/10`;
      case 'france_20':          return `🇫🇷 Fragments France ${france}/20`;
      case 'italy_60':           return `🇮🇹 Fragments Italie ${italy}/60`;
      case 'streak_1m':          return `🔥 1 mois actif (${Math.min(streakMonths,1)}/1)`;
      case 'streak_3m':          return `🔥 3 mois actifs (${Math.min(streakMonths,3)}/3)`;
      case 'streak_6m':          return `🔥 6 mois actifs (${Math.min(streakMonths,6)}/6)`;
      case 'boss_4':             return `💀 Quêtes Critiques ${boss}/4`;
      case 'no_catastrophic_2m': return 'Aucun mois catastrophique (2 derniers)';
      case 'no_catastrophic_3m': return 'Aucun mois catastrophique (3 derniers)';
      default: return cond;
    }
  }

  function canAfford(r: RewardDef): boolean {
    const c = r.coinCost === 0 || coins >= r.coinCost;
    const v = r.vaultCost === 0 || vault >= r.vaultCost;
    const conds = !r.conditions || r.conditions.every(checkCond);
    return c && v && conds;
  }

  function handleBuy(r: RewardDef) {
    if (confirm === r.id) {
      onPurchase(r.id);
      setConfirm(null);
    } else {
      setConfirm(r.id);
    }
  }

  const marketRewards = REWARDS.filter(r => r.tier <= 5);
  const voyageRewards = REWARDS.filter(r => r.tier >= 6);
  const italyReward   = REWARDS.find(r => r.id === 'italie')!;
  const now           = new Date();

  const activeSubscriptions = activeRewards.filter(r => r.expiresAt);
  const activePurchases     = activeRewards.filter(r => !r.expiresAt);

  const TIER_LABELS: Record<number, string> = {
    1: 'PARCHEMINS', 2: 'FORMATIONS', 3: 'ABONNEMENTS', 5: 'RÉVÉLATIONS',
    6: 'FORGES',     7: 'ARSENAUX',   8: 'VOYAGES',     9: 'ODYSSÉES',   10: 'LÉGENDAIRE',
  };

  function RewardCard({ r }: { r: RewardDef }) {
    const affordable = canAfford(r);
    const currency = r.vaultCost > 0 ? `${fmt(r.vaultCost)} ⚱️` : `${fmt(r.coinCost)} 🪙`;
    const confirming = confirm === r.id;
    return (
      <div
        className="rounded-xl p-3 mb-2 flex items-start gap-3"
        style={{
          background: r.legendary ? 'rgba(201,150,60,0.06)' : 'rgba(255,255,255,0.03)',
          border: r.legendary ? '1px solid rgba(201,150,60,0.3)' : '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <span className="text-2xl mt-0.5">{r.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold josefin" style={{ color: 'var(--tweed)' }}>{r.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,232,216,0.45)' }}>{r.description}</p>
          {r.conditions && (
            <div className="mt-1.5 space-y-0.5">
              {r.conditions.map(c => (
                <div key={c} className="flex items-center gap-1.5 text-xs josefin" style={{ color: checkCond(c) ? '#7FAB70' : 'rgba(240,232,216,0.45)' }}>
                  <span>{checkCond(c) ? '✓' : '✕'}</span>
                  <span>{condLabel(c)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs josefin mb-1" style={{ color: r.vaultCost > 0 ? '#A78BFA' : 'var(--gold)' }}>{currency}</p>
          {r.renewable && (
            <p className="text-xs josefin mb-1" style={{ color: 'rgba(240,232,216,0.35)' }}>renouvellement {fmt(r.renewalCost!)} 🪙</p>
          )}
          <button
            onClick={() => handleBuy(r)}
            disabled={!affordable}
            className="px-3 py-1 rounded-lg text-xs font-bold josefin transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={confirming
              ? { background: 'rgba(201,150,60,0.35)', color: '#fff', border: '1px solid rgba(201,150,60,0.6)' }
              : affordable
                ? { background: 'rgba(201,150,60,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,150,60,0.35)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(240,232,216,0.3)', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {confirming ? '⚠️ Confirmer' : affordable ? 'Acheter' : 'Verrouillé'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(6,9,15,0.5)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
            style={{ width: 'min(480px, 100vw)', background: 'rgba(10,13,20,0.98)', borderLeft: '1px solid rgba(201,150,60,0.2)', boxShadow: '-16px 0 48px rgba(0,0,0,0.6)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>
                <h2 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>⚱️ Trésor d&apos;Ithaque</h2>
                <p className="text-xs josefin mt-0.5" style={{ color: 'rgba(240,232,216,0.45)' }}>Les petites récompenses s&apos;achètent. Les grandes se méritent.</p>
              </div>
              <button onClick={onClose} className="text-xl" style={{ color: 'rgba(240,232,216,0.45)' }}>✕</button>
            </div>

            {/* Balance */}
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex gap-6 mb-3">
                <div>
                  <p className="text-xs josefin" style={{ color: 'rgba(240,232,216,0.45)' }}>🪙 DRACHMES</p>
                  <p className="text-2xl font-bold font-display" style={{ color: 'var(--gold)' }}>{fmt(coins)}</p>
                </div>
                <div>
                  <p className="text-xs josefin" style={{ color: 'rgba(160,130,255,0.7)' }}>⚱️ TRÉSOR DU RETOUR</p>
                  <p className="text-2xl font-bold font-display" style={{ color: '#A78BFA' }}>{fmt(vault)}</p>
                </div>
              </div>
              {/* Fragment progress */}
              <div className="flex gap-4">
                {[
                  { label: '🌊', val: sea,    max: 10,  color: '#60A5FA' },
                  { label: '🇫🇷', val: france, max: 20,  color: '#34D399' },
                  { label: '🇮🇹', val: italy,  max: 60,  color: '#F59E0B' },
                ].map(f => (
                  <div key={f.label} className="flex-1">
                    <div className="flex justify-between text-xs josefin mb-1" style={{ color: 'rgba(240,232,216,0.5)' }}>
                      <span>{f.label}</span>
                      <span>{f.val}/{f.max}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (f.val / f.max) * 100)}%`, background: f.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {([['marche', 'Marché'], ['voyages', 'Forges & Voyages'], ['actifs', `Actifs${activeRewards.length > 0 ? ` (${activeRewards.length})` : ''}`]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="py-3 px-3 text-xs josefin border-b-2 transition-all mr-1"
                  style={{
                    borderColor: tab === key ? 'var(--gold)' : 'transparent',
                    color: tab === key ? 'var(--gold)' : 'rgba(240,232,216,0.45)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4" onClick={() => setConfirm(null)}>

              {/* MARCHÉ */}
              {tab === 'marche' && (
                <div>
                  <p className="text-xs josefin mb-3" style={{ color: 'rgba(240,232,216,0.4)' }}>
                    Dépense tes Drachmes sur des investissements concrets. Les abonnements ne sont jamais acquis — renouvellement requis chaque mois.
                  </p>
                  {marketRewards.map(r => {
                    const label = TIER_LABELS[r.tier];
                    const prevTier = marketRewards[marketRewards.indexOf(r) - 1]?.tier;
                    return (
                      <div key={r.id}>
                        {prevTier !== r.tier && (
                          <p className="text-xs josefin mb-2 mt-4" style={{ color: 'rgba(201,150,60,0.6)', letterSpacing: '0.12em' }}>
                            — TIER {r.tier} · {label} —
                          </p>
                        )}
                        <RewardCard r={r} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* FORGES & VOYAGES */}
              {tab === 'voyages' && (
                <div>
                  <p className="text-xs josefin mb-3" style={{ color: 'rgba(240,232,216,0.4)' }}>
                    Le Trésor du Retour (⚱️) ne peut financer que les grandes ambitions. Les voyages nécessitent en plus des fragments et des conditions cumulées.
                  </p>
                  {voyageRewards.filter(r => r.id !== 'italie').map(r => {
                    const label = TIER_LABELS[r.tier];
                    const prevTier = voyageRewards[voyageRewards.indexOf(r) - 1]?.tier;
                    return (
                      <div key={r.id}>
                        {prevTier !== r.tier && r.tier <= 7 && (
                          <p className="text-xs josefin mb-2 mt-4" style={{ color: 'rgba(167,139,250,0.6)', letterSpacing: '0.12em' }}>
                            — TIER {r.tier} · {label} —
                          </p>
                        )}
                        {r.tier === 8 && (
                          <p className="text-xs josefin mb-2 mt-4" style={{ color: 'rgba(96,165,250,0.7)', letterSpacing: '0.12em' }}>
                            — VOYAGES —
                          </p>
                        )}
                        <RewardCard r={r} />
                      </div>
                    );
                  })}

                  {/* Italy — Final Boss */}
                  <div className="mt-6 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(201,150,60,0.08), rgba(120,80,20,0.12))', border: '1px solid rgba(201,150,60,0.4)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🇮🇹</span>
                      <div>
                        <p className="font-display font-bold text-base" style={{ color: 'var(--gold)' }}>Le Grand Retour</p>
                        <p className="text-xs josefin" style={{ color: 'rgba(240,232,216,0.5)' }}>Final Boss · Destination Légendaire</p>
                      </div>
                    </div>

                    {/* Vault progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs josefin mb-1" style={{ color: 'rgba(240,232,216,0.6)' }}>
                        <span>⚱️ Trésor</span>
                        <span>{fmt(vault)} / {fmt(100000)}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (vault / 100000) * 100)}%`, background: 'linear-gradient(90deg,#8B6520,#C9963C)' }} />
                      </div>
                    </div>

                    {/* Conditions */}
                    <div className="space-y-1.5 mb-4">
                      {italyReward.conditions!.map(c => (
                        <div key={c} className="flex items-center gap-2 text-sm josefin" style={{ color: checkCond(c) ? '#7FAB70' : 'rgba(240,232,216,0.5)' }}>
                          <span className="text-xs">{checkCond(c) ? '✓' : '✕'}</span>
                          <span>{condLabel(c)}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={!canAfford(italyReward)}
                      onClick={() => handleBuy(italyReward)}
                      className="w-full py-2.5 rounded-xl text-sm font-bold josefin transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={canAfford(italyReward)
                        ? { background: 'linear-gradient(135deg,#8B6520,#C9963C)', color: '#06090F' }
                        : { background: 'rgba(255,255,255,0.05)', color: 'rgba(240,232,216,0.35)', border: '1px solid rgba(255,255,255,0.1)' }
                      }
                    >
                      {canAfford(italyReward)
                        ? confirm === 'italie' ? '⚠️ Confirmer le Grand Retour' : '🎉 Débloquer — Le Grand Retour'
                        : '🔒 Conditions non réunies'}
                    </button>
                  </div>
                </div>
              )}

              {/* ACTIFS */}
              {tab === 'actifs' && (
                <div>
                  {activeRewards.length === 0 && (
                    <p className="text-sm josefin text-center py-12" style={{ color: 'rgba(240,232,216,0.35)' }}>
                      Aucun reward actif. Achetez dans le Marché.
                    </p>
                  )}

                  {activeSubscriptions.length > 0 && (
                    <>
                      <p className="text-xs josefin mb-3" style={{ color: 'rgba(240,232,216,0.4)', letterSpacing: '0.1em' }}>— ABONNEMENTS —</p>
                      {activeSubscriptions.map(ar => {
                        const days = daysLeft(ar.expiresAt!);
                        const expiring = days <= 7;
                        const rewardDef = REWARDS.find(r => r.id === ar.rewardId);
                        return (
                          <div key={ar.id} className="rounded-xl p-3 mb-2 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${expiring ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
                            <span className="text-2xl">{rewardDef?.icon ?? '⚡'}</span>
                            <div className="flex-1">
                              <p className="text-sm josefin font-semibold" style={{ color: 'var(--tweed)' }}>{ar.name}</p>
                              <p className="text-xs" style={{ color: expiring ? '#F87171' : 'rgba(240,232,216,0.45)' }}>
                                {days === 0 ? '⚠️ Expiré' : `⏱ ${days}j restants`}
                              </p>
                            </div>
                            {rewardDef?.renewable && (
                              <button
                                onClick={() => onRenew(ar.id)}
                                disabled={(gameState.coins ?? 0) < (rewardDef.renewalCost ?? 0)}
                                className="px-3 py-1 rounded-lg text-xs josefin font-bold transition-all disabled:opacity-30"
                                style={{ background: 'rgba(201,150,60,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,150,60,0.35)' }}
                              >
                                Renouveler {fmt(rewardDef.renewalCost!)} 🪙
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {activePurchases.length > 0 && (
                    <>
                      <p className="text-xs josefin mb-3 mt-4" style={{ color: 'rgba(240,232,216,0.4)', letterSpacing: '0.1em' }}>— ACHATS —</p>
                      {activePurchases.map(ar => {
                        const rewardDef = REWARDS.find(r => r.id === ar.rewardId);
                        return (
                          <div key={ar.id} className="rounded-xl p-3 mb-2 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <span className="text-2xl">{rewardDef?.icon ?? '🏛️'}</span>
                            <div>
                              <p className="text-sm josefin font-semibold" style={{ color: 'var(--tweed)' }}>{ar.name}</p>
                              <p className="text-xs" style={{ color: 'rgba(240,232,216,0.4)' }}>
                                {new Date(ar.purchasedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-xs italic josefin" style={{ color: 'rgba(240,232,216,0.3)' }}>
                1 XP = 3 🪙 · 80% drachmes · 20% trésor · perte amplifiée ×1.5 à ×3
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
