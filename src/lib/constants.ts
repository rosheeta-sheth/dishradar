export const APP_NAME = 'DishRadar';
export const APP_DESCRIPTION = 'Discover restaurants, explore dishes, and generate recipes with AI-powered insights.';

export const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 }; // NYC
export const DEFAULT_ZOOM = 13;
export const SEARCH_RADIUS_DEFAULT = 8047; // 5 miles
export const SEARCH_RADIUS_OPTIONS = [
  { label: '1 mile', value: 1609 },
  { label: '2 miles', value: 3219 },
  { label: '5 miles', value: 8047 },
  { label: '10 miles', value: 16093 },
  { label: '25 miles', value: 40234 },
];

export const PRICE_LEVELS = [
  { label: '$', value: 1 },
  { label: '$$', value: 2 },
  { label: '$$$', value: 3 },
  { label: '$$$$', value: 4 },
];

export const RATING_OPTIONS = [
  { label: '3+ ★', value: 3 },
  { label: '3.5+ ★', value: 3.5 },
  { label: '4+ ★', value: 4 },
  { label: '4.5+ ★', value: 4.5 },
];

export const CUISINE_TAGS = [
  'Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian',
  'Thai', 'French', 'Korean', 'Mediterranean', 'Vietnamese',
  'American', 'Greek', 'Spanish', 'Middle Eastern', 'Ethiopian',
  'Peruvian', 'Brazilian', 'Turkish', 'Caribbean', 'Soul Food',
];

export const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SEARCH_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Google Maps attribution (required by ToS)
export const GMP_ATTRIBUTION_ID = 'gmp_git_agentskills_v1';
