'use client';

import { useEffect } from 'react';
import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { GMP_ATTRIBUTION_ID } from '@/lib/constants';
import type { Restaurant } from '@/lib/types';
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
  if (rating >= 4.5) return { bg: '#4ADE80', border: '#22C55E' };
  if (rating >= 4.0) return { bg: '#FF6B6B', border: '#E85555' };
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
          const { bg, border } = getPinColor(r.rating);
          const isSelected = r.place_id === selectedId;

          return (
            <AdvancedMarker
              key={r.place_id}
              position={{ lat: r.lat, lng: r.lng }}
              onClick={() => onSelectRestaurant(r)}
              zIndex={isSelected ? 10 : 1}
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
