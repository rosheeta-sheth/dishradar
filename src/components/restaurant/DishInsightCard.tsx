'use client';

import { getSentimentLabel } from '@/lib/utils';
import type { DishInsight } from '@/lib/types';
import { ChefHat, Star } from 'lucide-react';
import styles from './DishInsightCard.module.css';

interface DishInsightCardProps {
  insight: DishInsight;
  onGetRecipe: (dishName: string, cuisineTags: string[]) => void;
  onRate?: (dishName: string) => void;
}

export default function DishInsightCard({ insight, onGetRecipe, onRate }: DishInsightCardProps) {
  const { label, color } = getSentimentLabel(insight.sentiment_score);
  const sentimentPercent = Math.round((insight.sentiment_score + 1) * 50); // -1..1 -> 0..100

  return (
    <div className={`card-static ${styles.card}`}>
      <div className={styles.header}>
        <h3 className={styles.dishName}>{insight.dish_name}</h3>
        <span className={`badge badge-${color === 'positive' ? 'success' : color === 'negative' ? 'primary' : 'warning'}`}>
          {label}
        </span>
      </div>

      <div className="sentiment-bar">
        <div
          className={`sentiment-bar-fill sentiment-${color}`}
          style={{ width: `${sentimentPercent}%` }}
        />
      </div>

      <p className={styles.summary}>{insight.ai_summary}</p>

      {insight.review_quotes && insight.review_quotes.length > 0 && (
        <div className={styles.quotes}>
          {insight.review_quotes.slice(0, 2).map((quote, idx) => (
            <span key={idx} className={styles.quote}>{quote}</span>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.tags}>
          {insight.mention_count > 0 && (
            <span className="badge badge-secondary">
              {insight.mention_count} mention{insight.mention_count !== 1 ? 's' : ''}
            </span>
          )}
          {insight.cuisine_tags?.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onRate && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onRate(insight.dish_name)}
            >
              <Star size={16} /> Rate
            </button>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onGetRecipe(insight.dish_name, insight.cuisine_tags || [])}
          >
            <ChefHat size={16} /> Get Recipe
          </button>
        </div>
      </div>
    </div>
  );
}
