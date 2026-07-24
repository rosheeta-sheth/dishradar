'use client';

import Link from 'next/link';
import { getDistanceMeters, formatDistance, formatPriceLevel } from '@/lib/utils';
import type { Restaurant } from '@/lib/types';
import { Star } from 'lucide-react';
import styles from './SummaryCard.module.css';

interface SummaryCardProps {
  restaurant: Restaurant;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
}

export default function SummaryCard({ restaurant, userLocation, onClose }: SummaryCardProps) {
  const distance = userLocation
    ? formatDistance(getDistanceMeters(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng))
    : null;

  return (
    <div className={styles.card}>
      <button className={styles.close} onClick={onClose}>✕</button>
      <div className={styles.body}>
        {restaurant.photo_urls?.[0] && (
          <div className={styles.photo}>
            <img src={restaurant.photo_urls[0]} alt={restaurant.name} />
          </div>
        )}
        <div className={styles.info}>
          <h3 className={styles.name}>{restaurant.name}</h3>
          <div className={styles.meta}>
            {restaurant.rating && (
              <span className={styles.rating}>
                <Star size={14} className={styles.starIcon} fill="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {restaurant.rating.toFixed(1)}
              </span>
            )}
            {restaurant.price_level && <span className={styles.price}>{formatPriceLevel(restaurant.price_level)}</span>}
            {distance && <span className={styles.distance}>{distance}</span>}
          </div>
          {restaurant.formatted_address && (
            <p className={styles.address}>{restaurant.formatted_address}</p>
          )}
          <Link href={`/restaurant/${restaurant.place_id}`} className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-3)' }}>
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
