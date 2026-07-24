'use client';

import Link from 'next/link';
import { getDistanceMeters, formatDistance, formatPriceLevel } from '@/lib/utils';
import type { Restaurant } from '@/lib/types';
import { Star, Utensils } from 'lucide-react';
import styles from './RestaurantCard.module.css';

interface RestaurantCardProps {
  restaurant: Restaurant;
  userLocation?: { lat: number; lng: number } | null;
}

export default function RestaurantCard({ restaurant, userLocation }: RestaurantCardProps) {
  const distance = userLocation
    ? formatDistance(getDistanceMeters(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng))
    : null;

  return (
    <Link href={`/restaurant/${restaurant.place_id}`} className={`card ${styles.card}`}>
      <div className={styles.photo}>
        {restaurant.photo_urls?.[0] ? (
          <img src={restaurant.photo_urls[0]} alt={restaurant.name} />
        ) : (
          <div className={styles.placeholder}>
            <Utensils size={32} />
          </div>
        )}
      </div>
      <div className={styles.info}>
        <h3 className={styles.name}>{restaurant.name}</h3>
        <div className={styles.meta}>
          {restaurant.rating && (
            <span className={styles.rating}>
              <Star size={14} className={styles.starIcon} fill="currentColor" />
              {restaurant.rating.toFixed(1)}
            </span>
          )}
          {restaurant.price_level && (
            <span className={styles.price}>{formatPriceLevel(restaurant.price_level)}</span>
          )}
          {distance && <span className={styles.distance}>{distance}</span>}
        </div>
        {restaurant.formatted_address && (
          <p className={styles.address}>{restaurant.formatted_address}</p>
        )}
      </div>
    </Link>
  );
}
