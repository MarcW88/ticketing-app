import type { UniverseId, MissionClass } from './types';
import { UNIVERSE_CONFIG } from './constants';

export interface DetectionResult {
  universe: UniverseId;
  missionClass: MissionClass;
  confidence: number;
}

export function autoDetectUniverse(title: string, description?: string): DetectionResult {
  const text = `${title} ${description ?? ''}`.toLowerCase();

  const scores: Record<UniverseId, number> = {
    mario: 0,
    assassins_creed: 0,
    spiderman: 0,
    crouch: 0,
    film_noir: 0,
  };

  for (const [uid, cfg] of Object.entries(UNIVERSE_CONFIG) as [UniverseId, typeof UNIVERSE_CONFIG[UniverseId]][]) {
    for (const kw of cfg.keywords) {
      if (text.includes(kw)) {
        scores[uid] += kw.length > 5 ? 3 : 2;
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores));

  if (maxScore === 0) {
    return { universe: 'mario', missionClass: 'platform', confidence: 0 };
  }

  const detected = (Object.keys(scores) as UniverseId[]).find(k => scores[k] === maxScore) ?? 'mario';

  const missionClassMap: Record<UniverseId, MissionClass> = {
    mario: 'platform',
    assassins_creed: 'infiltration',
    spiderman: 'urban',
    crouch: 'temporal',
    film_noir: 'narration',
  };

  return {
    universe: detected,
    missionClass: missionClassMap[detected],
    confidence: maxScore,
  };
}
