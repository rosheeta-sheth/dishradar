'use client';

import { useState } from 'react';
import { Star, Sparkles, Heart, ThumbsUp, Minus, ThumbsDown, X } from 'lucide-react';
import type { DishRecommendation } from '@/lib/types';
import styles from './RecommendationCard.module.css';

interface Props {
  recommendation: DishRecommendation;
  placeId: string;
  restaurantName: string;
  onRate: (dishName: string) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (dishName: string) => void;
}

const FEEDBACK_OPTIONS = [
  { value: 'loved_it', label: 'Loved it', icon: <Heart size={14} /> },
  { value: 'liked_it', label: 'Liked it', icon: <ThumbsUp size={14} /> },
  { value: 'neutral', label: 'OK', icon: <Minus size={14} /> },
  { value: 'didnt_like', label: "Didn't like", icon: <ThumbsDown size={14} /> },
];

export default function RecommendationCard({
  recommendation,
  onRate,
  isFavorited,
  onToggleFavorite,
}: Props) {
  const [hoverStar, setHoverStar] = useState(0);

  const matchColor =
    recommendation.match_score >= 80
      ? 'var(--color-success)'
      : recommendation.match_score >= 60
      ? 'var(--color-warning, #f59e0b)'
      : 'var(--color-text-tertiary)';

  return (
    <div className={`${styles.card} ${recommendation.is_bold ? styles.boldCard : ''}`}>
      {recommendation.is_bold && (
        <div className={styles.boldBadge}>
          <Sparkles size={12} /> Bold Pick
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h3 className={styles.dishName}>{recommendation.dish_name}</h3>
        </div>
        <div className={styles.scores}>
          <div className={styles.scoreBar}>
            <span className={styles.scoreLabel}>Match</span>
            <div className={styles.scoreTrack}>
              <div
                className={styles.scoreFill}
                style={{
                  width: `${recommendation.match_score}%`,
                  background: matchColor,
                }}
              />
            </div>
            <span className={styles.scoreNum} style={{ color: matchColor }}>
              {recommendation.match_score}%
            </span>
          </div>
        </div>
      </div>

      <p className={styles.explanation}>{recommendation.explanation}</p>

      <div className={styles.actions}>
        {/* Star rating row */}
        <div className={styles.starRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              className={styles.starBtn}
              onMouseEnter={() => setHoverStar(n)}
              onMouseLeave={() => setHoverStar(0)}
              onClick={() => onRate(recommendation.dish_name)}
              aria-label={`Rate ${n} stars`}
            >
              <Star
                size={18}
                fill={n <= (hoverStar) ? 'var(--color-warning, #f59e0b)' : 'none'}
                color={n <= hoverStar ? 'var(--color-warning, #f59e0b)' : 'var(--color-border)'}
              />
            </button>
          ))}
          <span className={styles.rateLabel}>Rate this dish</span>
        </div>

        {/* Favorite toggle */}
        {onToggleFavorite && (
          <button
            className={`${styles.favoriteBtn} ${isFavorited ? styles.favoriteBtnActive : ''}`}
            onClick={() => onToggleFavorite(recommendation.dish_name)}
            aria-label={isFavorited ? 'Unfavorite' : 'Favorite'}
          >
            <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Rating Modal ──────────────────────────────────────────────────────────────

interface RatingModalProps {
  initialDishName?: string;
  restaurantName: string;
  placeId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function RatingModal({ initialDishName, restaurantName, placeId, onClose, onSubmitted }: RatingModalProps) {
  const [dishName, setDishName] = useState(initialDishName || '');
  const [starRating, setStarRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!dishName || !starRating || !feedbackCategory) return;
    setSubmitting(true);
    try {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          restaurant_name: restaurantName,
          dish_name: dishName,
          star_rating: starRating,
          feedback_category: feedbackCategory,
          notes: notes || undefined,
        }),
      });
      onSubmitted();
      onClose();
    } catch (err) {
      console.error('Rating submit error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close rating modal"><X size={20} /></button>
        <h3 className={styles.modalTitle}>{initialDishName ? `Rate: ${initialDishName}` : 'Log Visit'}</h3>
        <p className={styles.modalSub}>at {restaurantName}</p>

        {!initialDishName && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <input
              type="text"
              className={styles.notesInput}
              placeholder="What dish did you eat?"
              value={dishName}
              onChange={e => setDishName(e.target.value)}
            />
          </div>
        )}

        {/* Stars */}
        <div className={styles.modalStars}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              className={styles.modalStarBtn}
              onMouseEnter={() => setHoverStar(n)}
              onMouseLeave={() => setHoverStar(0)}
              onClick={() => setStarRating(n)}
              aria-label={`Rate ${n} stars`}
            >
              <Star
                size={32}
                fill={n <= (hoverStar || starRating) ? '#f59e0b' : 'none'}
                color={n <= (hoverStar || starRating) ? '#f59e0b' : 'var(--color-border-strong)'}
              />
            </button>
          ))}
        </div>

        {/* Feedback */}
        <div className={styles.feedbackRow}>
          {FEEDBACK_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.feedbackBtn} ${feedbackCategory === opt.value ? styles.feedbackBtnActive : ''}`}
              onClick={() => setFeedbackCategory(opt.value)}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        {/* Notes */}
        <textarea
          className={styles.notesInput}
          placeholder="Any notes? (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
        />

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSubmit}
          disabled={!dishName || !starRating || !feedbackCategory || submitting}
        >
          {submitting ? 'Saving...' : 'Submit Rating'}
        </button>
      </div>
    </div>
  );
}
