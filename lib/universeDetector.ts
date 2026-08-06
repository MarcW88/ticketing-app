import type { UniverseId, MissionClass, QuestRisk } from './types';

export interface RiskDetectionResult {
  risk: QuestRisk;
  confidence: number; // 0-100
  reason: string;
}

const RISK_KEYWORDS: Record<QuestRisk, string[]> = {
  critical: [
    'urgent', 'urgente', 'asap', 'critique', 'bloquant', 'bloquante', 'blocker',
    'incident', 'down', 'crash', 'breaking', 'hotfix', 'p0', 'production',
    'maintenant', 'immédiat', 'immédiate', 'ce soir', 'aujourd\'hui', 'emergenc',
    'hors ligne', 'offline', 'ko', 'cassé', 'bug prod',
  ],
  high: [
    'important', 'importante', 'sprint', 'release', 'déploiement', 'deploiement',
    'lancement', 'deadline', 'livraison', 'présentation', 'presentation',
    'demo', 'démo', 'priorité', 'priority', 'migration', 'client attend',
    'cette semaine', 'semaine prochaine', 'refonte', 'replatforming',
  ],
  low: [
    'cosmétique', 'cosmetique', 'typo', 'doc', 'documentation', 'cleanup',
    'refactor', 'nice-to-have', 'todo', 'polish', 'readme', 'commentaire',
    'mineur', 'minor', 'petite amélioration', 'amélioration mineure',
  ],
  medium: [],
};

export function autoDetectRisk(title: string, description?: string, dueDate?: string): RiskDetectionResult {
  const text = `${title} ${description ?? ''}`.toLowerCase();

  const scores: Record<QuestRisk, number> = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const [risk, keywords] of Object.entries(RISK_KEYWORDS) as [QuestRisk, string[]][]) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        scores[risk] += kw.length > 6 ? 3 : 2;
      }
    }
  }

  // Due date proximity boost
  let dueDateLabel = '';
  if (dueDate) {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) { scores.critical += 5; dueDateLabel = 'échéance dépassée'; }
    else if (days === 1) { scores.critical += 4; dueDateLabel = 'demain'; }
    else if (days <= 3) { scores.high += 3; dueDateLabel = `dans ${days}j`; }
    else if (days <= 7) { scores.medium += 2; dueDateLabel = `cette semaine`; }
  }

  const LEVELS: QuestRisk[] = ['low', 'medium', 'high', 'critical'];
  const maxScore = Math.max(scores.critical, scores.high, scores.low);

  let risk: QuestRisk = 'medium';
  let confidence = 0;
  let reason = 'Intensité standard par défaut';

  if (scores.critical > 0 && scores.critical >= scores.high && scores.critical >= scores.low) {
    risk = 'critical';
    confidence = Math.min(95, scores.critical * 18);
    reason = dueDateLabel ? `Échéance ${dueDateLabel}` : 'Urgence détectée dans le titre';
  } else if (scores.high > 0 && scores.high >= scores.low) {
    risk = 'high';
    confidence = Math.min(90, scores.high * 18);
    reason = dueDateLabel ? `Deadline ${dueDateLabel}` : 'Tâche à fort impact';
  } else if (scores.low > 0) {
    risk = 'low';
    confidence = Math.min(85, scores.low * 18);
    reason = 'Tâche mineure ou cosmétique';
  } else {
    risk = 'medium';
    confidence = 25;
    reason = 'Complexité standard';
  }

  return { risk, confidence, reason };
}

export interface DetectionResult {
  universe: UniverseId;
  missionClass: MissionClass;
  confidence: number;
}

export function autoDetectUniverse(_title: string, _description?: string): DetectionResult {
  return { universe: 'odyssey', missionClass: 'odyssey', confidence: 100 };
}
