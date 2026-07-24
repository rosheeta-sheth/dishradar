/**
 * Calculate distance between two lat/lng points using Haversine formula.
 * Returns distance in meters.
 */
export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Format distance for display.
 */
export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) {
    return `${Math.round(meters * 3.28084)} ft`;
  }
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

/**
 * Format price level as dollar signs.
 */
export function formatPriceLevel(level: number | null | undefined): string {
  if (!level) return '';
  return '$'.repeat(level);
}

/**
 * Generate star rating display data.
 */
export function getStarRating(rating: number): { full: number; half: boolean; empty: number } {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const roundedUp = rating - full >= 0.75 ? 1 : 0;
  const totalFull = full + roundedUp;
  const empty = 5 - totalFull - (half ? 1 : 0);
  return { full: totalFull, half, empty };
}

/**
 * Render stars as text for simple display.
 */
export function renderStarsText(rating: number): string {
  const { full, half, empty } = getStarRating(rating);
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

/**
 * Format opening hours status.
 */
export function getOpenStatus(openNow?: boolean): { text: string; isOpen: boolean } {
  if (openNow === undefined || openNow === null) {
    return { text: 'Hours unavailable', isOpen: false };
  }
  return openNow
    ? { text: 'Open now', isOpen: true }
    : { text: 'Closed', isOpen: false };
}

/**
 * Generate a sentiment label from score.
 */
export function getSentimentLabel(score: number): {
  label: string;
  color: 'positive' | 'neutral' | 'negative';
} {
  if (score >= 0.3) return { label: 'Loved', color: 'positive' };
  if (score >= -0.3) return { label: 'Mixed', color: 'neutral' };
  return { label: 'Not great', color: 'negative' };
}

/**
 * Truncate text to a max length.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Debounce a function.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if a cache timestamp is still fresh.
 */
export function isCacheFresh(lastRefreshed: string | Date, maxAgeMs: number): boolean {
  const refreshed = new Date(lastRefreshed).getTime();
  return Date.now() - refreshed < maxAgeMs;
}

/**
 * Generate a random ID.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
