'use client';

import { SEARCH_RADIUS_OPTIONS, RATING_OPTIONS, PRICE_LEVELS } from '@/lib/constants';
import type { SearchFilters } from '@/lib/types';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (f: SearchFilters) => void;
}

const CUISINES = ['Italian', 'Japanese', 'Mexican', 'Indian', 'Thai', 'Chinese', 'American', 'Korean', 'Mediterranean'];
const DIETARY_OPTIONS = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Halal'];
const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Distance', value: 'distance' },
  { label: 'Rating', value: 'rating' },
  { label: 'Price (Low to High)', value: 'price' }
];

export default function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  function update(patch: Partial<SearchFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.group}>
        <span className={styles.label}>Sort By</span>
        <select
          className={styles.select}
          value={filters.sortBy || 'relevance'}
          onChange={(e) => update({ sortBy: e.target.value as SearchFilters['sortBy'] })}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Dietary</span>
        {DIETARY_OPTIONS.map((diet) => (
          <button
            key={diet}
            className={`${styles.chip} ${filters.dietary === diet ? styles.chipActive : ''}`}
            onClick={() => update({ dietary: filters.dietary === diet ? undefined : diet })}
          >
            {diet}
          </button>
        ))}
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Cuisine</span>
        {CUISINES.map((cuisine) => (
          <button
            key={cuisine}
            className={`${styles.chip} ${filters.cuisine === cuisine ? styles.chipActive : ''}`}
            onClick={() => update({ cuisine: filters.cuisine === cuisine ? undefined : cuisine })}
          >
            {cuisine}
          </button>
        ))}
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Distance</span>
        {SEARCH_RADIUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.chip} ${filters.radius === opt.value ? styles.chipActive : ''}`}
            onClick={() => update({ radius: filters.radius === opt.value ? undefined : opt.value })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Rating</span>
        {RATING_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.chip} ${filters.minRating === opt.value ? styles.chipActive : ''}`}
            onClick={() => update({ minRating: filters.minRating === opt.value ? undefined : opt.value })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Price</span>
        {PRICE_LEVELS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.chip} ${filters.maxPriceLevel === opt.value ? styles.chipActive : ''}`}
            onClick={() => update({ maxPriceLevel: filters.maxPriceLevel === opt.value ? undefined : opt.value })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={styles.group}>
        <button
          className={`${styles.chip} ${filters.openNow ? styles.chipActive : ''}`}
          onClick={() => update({ openNow: !filters.openNow })}
        >
          Open Now
        </button>
      </div>
    </div>
  );
}
