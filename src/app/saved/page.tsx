'use client';

import { useState, useEffect } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import type { Restaurant } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import styles from './saved.module.css';

function priceLevelToNumber(pl: unknown): number | null {
  const map: Record<string, number> = {
    FREE: 0, INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4,
  };
  if (typeof pl === 'number') return pl;
  if (typeof pl === 'string') return map[pl] ?? null;
  return null;
}

function SavedContent() {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    async function loadSaved() {
      if (!placesLib) return;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }

        const res = await fetch('/api/user/saved');
        if (!res.ok) throw new Error('Failed to fetch saved items');
        const { data } = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const savedPlaces = data?.items?.filter((i: any) => i.item_type === 'restaurant') || [];

        const loadedRestaurants: Restaurant[] = [];
        const { Place } = placesLib;

        // Fetch details for each saved place
        for (const item of savedPlaces) {
          try {
            const place = new Place({ id: item.place_id });
            await place.fetchFields({
              fields: ['displayName', 'location', 'rating', 'priceLevel', 'photos', 'id', 'formattedAddress', 'regularOpeningHours']
            });
            loadedRestaurants.push({
              place_id: place.id || '',
              name: place.displayName || '',
              lat: place.location?.lat() || 0,
              lng: place.location?.lng() || 0,
              rating: place.rating ?? null,
              user_rating_count: null,
              price_level: priceLevelToNumber(place.priceLevel),
              formatted_address: place.formattedAddress || null,
              phone_number: null,
              website_url: null,
              photo_urls: place.photos?.slice(0, 1).map((photo) => photo.getURI({ maxHeight: 400, maxWidth: 600 })) || [],
              opening_hours: place.regularOpeningHours ? { open_now: place.regularOpeningHours.periods ? true : undefined } : null,
              editorial_summary: null,
            });
          } catch (e) {
            console.error(`Failed to load place ${item.place_id}`, e);
          }
        }

        setRestaurants(loadedRestaurants);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadSaved();
  }, [placesLib]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>My Saved Places</h1>
      <p className={styles.subtitle}>Restaurants you have saved for later</p>

      {loading ? (
        <div className={styles.skeletons}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-static" style={{ height: 160 }}>
              <div className="skeleton" style={{ width: '100%', height: '100%' }} />
            </div>
          ))}
        </div>
      ) : restaurants.length > 0 ? (
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {restaurants.map((r) => (
            <RestaurantCard key={r.place_id} restaurant={r} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>You haven&apos;t saved any restaurants yet.</p>
          <a href="/explore" className="btn btn-primary" style={{ marginTop: 'var(--space-4)', display: 'inline-block' }}>
            Explore Restaurants
          </a>
        </div>
      )}
    </div>
  );
}

export default function SavedPage() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <SavedContent />
    </APIProvider>
  );
}
