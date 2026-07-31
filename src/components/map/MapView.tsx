'use client';

import { useEffect } from 'react';
import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { GMP_ATTRIBUTION_ID } from '@/lib/constants';
import type { Restaurant } from '@/lib/types';
import { simulateBusyness } from '@/lib/utils';
import styles from './MapView.module.css';

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelectRestaurant: (r: Restaurant) => void;
  center: { lat: number; lng: number };
  zoom: number;
}

function getPinColor(rating: number | null): { bg: string; border: string } {
  if (!rating) return { bg: '#94A3B8', border: '#64748B' };
  if (rating >= 4.5) return { bg: '#8B5CF6', border: '#7C3AED' }; // Purple for high rating if not busy/quiet
  if (rating >= 4.0) return { bg: '#3B82F6', border: '#2563EB' }; // Blue for good rating
  return { bg: '#94A3B8', border: '#64748B' };
}

export default function MapView({ restaurants, selectedId, onSelectRestaurant, center, zoom }: MapViewProps) {
  const map = useMap();

  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center]);

  return (
    <div className={styles.container}>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#EF4444', border: '1px solid #B91C1C' }}></span>
          <span>Very Busy</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#22C55E', border: '1px solid #15803D' }}></span>
          <span>Quiet</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#8B5CF6', border: '1px solid #7C3AED' }}></span>
          <span>Exceptional (4.5+ ★)</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: '#3B82F6', border: '1px solid #2563EB' }}></span>
          <span>Great (4.0+ ★)</span>
        </div>
      </div>
      <Map
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID'}
        defaultCenter={center}
        defaultZoom={zoom}
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
        disableDefaultUI={false}
        internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
      >
        {restaurants.map((r) => {
          const busyness = simulateBusyness(r.place_id);
          let bg, border, className;
          
          if (busyness > 75) {
            bg = '#EF4444'; border = '#B91C1C';
            className = styles.busyPin;
          } else if (busyness < 30) {
            bg = '#22C55E'; border = '#15803D';
            className = styles.quietPin;
          } else {
            const colors = getPinColor(r.rating);
            bg = colors.bg; border = colors.border;
            className = '';
          }

          const isSelected = r.place_id === selectedId;

          return (
            <AdvancedMarker
              key={r.place_id}
              position={{ lat: r.lat, lng: r.lng }}
              onClick={() => onSelectRestaurant(r)}
              zIndex={isSelected ? 10 : 1}
              className={className}
            >
              <Pin
                background={isSelected ? '#FFB347' : bg}
                borderColor={isSelected ? '#FF8E53' : border}
                glyphColor="#FFFFFF"
                scale={isSelected ? 1.3 : 1}
              />
            </AdvancedMarker>
          );
        })}
      </Map>
    </div>
  );
}
