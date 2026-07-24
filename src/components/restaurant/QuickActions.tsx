'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Restaurant } from '@/lib/types';
import { Phone, Globe, Map, Share, Heart } from 'lucide-react';
import styles from './QuickActions.module.css';

interface QuickActionsProps {
  restaurant: Restaurant;
  placeId: string;
}

export default function QuickActions({ restaurant, placeId }: QuickActionsProps) {
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(true);
        // Check if already saved
        fetch('/api/user/saved')
          .then((r) => r.json())
          .then(({ data }) => {
            const items = data?.items || [];
            setSaved(items.some((i: { place_id: string }) => i.place_id === placeId));
          })
          .catch(() => {});
      }
    });
  }, [placeId]);

  async function toggleSave() {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await fetch('/api/user/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: 'restaurant', place_id: placeId, sentiment: 'like' }),
      });
      const { data } = await res.json();
      setSaved(data?.saved ?? !saved);
    } catch {
      // Ignore
    }
  }

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;

  async function handleShare() {
    const shareData = {
      title: `${restaurant.name} on DishRadar`,
      text: `Check out ${restaurant.name} on DishRadar!`,
      url: window.location.href,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch { /* ignore */ }
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(() => {});
    }
  }

  return (
    <div className={styles.actions}>
      {restaurant.phone_number && (
        <a href={`tel:${restaurant.phone_number}`} className={`btn btn-secondary ${styles.action}`}>
          <Phone size={18} /> Call
        </a>
      )}
      {restaurant.website_url && (
        <a href={restaurant.website_url} target="_blank" rel="noopener noreferrer" className={`btn btn-secondary ${styles.action}`}>
          <Globe size={18} /> Website
        </a>
      )}
      <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={`btn btn-secondary ${styles.action}`}>
        <Map size={18} /> Directions
      </a>
      <button onClick={handleShare} className={`btn btn-secondary ${styles.action}`}>
        <Share size={18} /> Share
      </button>
      <button onClick={toggleSave} className={`btn ${saved ? 'btn-primary' : 'btn-secondary'} ${styles.action}`}>
        <Heart size={18} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
      </button>
    </div>
  );
}
