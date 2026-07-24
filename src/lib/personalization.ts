import type { UserProfile } from './types';

/**
 * Simple personalization engine for Phase 1.
 * Computes user taste preferences from interaction history.
 */

interface InteractionRecord {
  cuisine_tags: string[];
  interaction_type: string;
  place_id?: string;
}

/**
 * Compute preferred cuisines from interaction history.
 * Returns top cuisines ranked by frequency.
 */
export function computePreferredCuisines(
  interactions: InteractionRecord[],
  topN: number = 5
): string[] {
  const cuisineCounts = new Map<string, number>();

  for (const interaction of interactions) {
    if (!interaction.cuisine_tags) continue;
    // Weight by interaction type
    const weight = getInteractionWeight(interaction.interaction_type);
    for (const tag of interaction.cuisine_tags) {
      cuisineCounts.set(tag, (cuisineCounts.get(tag) || 0) + weight);
    }
  }

  return [...cuisineCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([cuisine]) => cuisine);
}

/**
 * Compute adventurousness score from interaction history.
 * Ratio of unique cuisine types to total interactions (normalized 0-1).
 */
export function computeAdventurousness(interactions: InteractionRecord[]): number {
  if (interactions.length < 5) return 0.5; // Not enough data

  const allCuisines = new Set<string>();
  let totalTags = 0;

  for (const interaction of interactions) {
    if (!interaction.cuisine_tags) continue;
    for (const tag of interaction.cuisine_tags) {
      allCuisines.add(tag);
      totalTags++;
    }
  }

  if (totalTags === 0) return 0.5;

  // Unique cuisines / total tags — higher = more adventurous
  const rawScore = allCuisines.size / Math.min(totalTags, 50);
  // Normalize to 0-1 range (a score > 0.5 means exploring diverse cuisines)
  return Math.min(Math.max(rawScore, 0), 1);
}

/**
 * Re-rank restaurants based on user preferences.
 * Boosts restaurants matching preferred cuisines.
 */
export function personalizeResults<T extends { cuisine_tags?: string[]; rating?: number | null }>(
  items: T[],
  profile: UserProfile | null
): T[] {
  if (!profile || !profile.preferred_cuisines.length) return items;

  return [...items].sort((a, b) => {
    const scoreA = getPersonalizationScore(a, profile);
    const scoreB = getPersonalizationScore(b, profile);
    return scoreB - scoreA;
  });
}

function getPersonalizationScore<T extends { cuisine_tags?: string[]; rating?: number | null }>(
  item: T,
  profile: UserProfile
): number {
  let score = 0;

  // Boost for matching preferred cuisines
  if (item.cuisine_tags) {
    const matchCount = item.cuisine_tags.filter((t) =>
      profile.preferred_cuisines.includes(t)
    ).length;
    score += matchCount * 10;
  }

  // Factor in rating
  if (item.rating) {
    score += item.rating * 2;
  }

  return score;
}

function getInteractionWeight(type: string): number {
  switch (type) {
    case 'like':
      return 3;
    case 'save':
      return 2.5;
    case 'view':
      return 1;
    case 'search':
      return 0.5;
    case 'dislike':
      return -2;
    default:
      return 1;
  }
}
