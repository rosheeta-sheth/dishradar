'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { APIProvider, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import MapView from '@/components/map/MapView';
import SummaryCard from '@/components/map/SummaryCard';
import SearchBar from '@/components/search/SearchBar';
import FilterPanel from '@/components/search/FilterPanel';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { DEFAULT_CENTER, SEARCH_RADIUS_DEFAULT, DEFAULT_ZOOM } from '@/lib/constants';
import type { Restaurant, SearchFilters } from '@/lib/types';
import { Map, List, SearchX, Search, MessageSquare, Minus, Maximize2 } from 'lucide-react';
import Draggable from 'react-draggable';
import styles from './explore.module.css';

function priceLevelToNumber(pl: unknown): number | null {
  const map: Record<string, number> = {
    FREE: 0, INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4,
  };
  if (typeof pl === 'number') return pl;
  if (typeof pl === 'string') return map[pl] ?? null;
  return null;
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  
  const initialFilters: SearchFilters = {
    query: initialQuery,
    radius: parseInt(searchParams.get('radius') || '') || SEARCH_RADIUS_DEFAULT,
    minRating: parseInt(searchParams.get('minRating') || '') || undefined,
    maxPriceLevel: parseInt(searchParams.get('maxPriceLevel') || '') || undefined,
    openNow: searchParams.get('openNow') === 'true',
    cuisine: searchParams.get('cuisine') || undefined,
    dietary: searchParams.get('dietary') || undefined,
    sortBy: (searchParams.get('sortBy') as SearchFilters['sortBy']) || 'relevance',
  };

  const [query, setQuery] = useState(initialQuery);
  const [cityQuery, setCityQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const chatDraggableRef = useRef<HTMLDivElement>(null);

  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setCenter(loc);
        },
        () => { /* Permission denied — use default center */ }
      );
    }
  }, []);

  // (moved below handleSearch)

  // Sync filters to URL when they change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.radius && filters.radius !== SEARCH_RADIUS_DEFAULT) params.set('radius', filters.radius.toString());
    if (filters.minRating) params.set('minRating', filters.minRating.toString());
    if (filters.maxPriceLevel) params.set('maxPriceLevel', filters.maxPriceLevel.toString());
    if (filters.openNow) params.set('openNow', 'true');
    if (filters.cuisine) params.set('cuisine', filters.cuisine);
    if (filters.dietary) params.set('dietary', filters.dietary);
    if (filters.sortBy && filters.sortBy !== 'relevance') params.set('sortBy', filters.sortBy);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [query, filters, router]);

  const handleSearch = useCallback(async (overrideCenter?: {lat: number, lng: number}) => {
    if (!placesLib) {
      setError('Google Maps is still loading or API key is missing. Please check your configuration.');
      return;
    }
    setError(null);

    let textQuery = query.trim();
    if (filters.dietary) {
      textQuery = textQuery ? `${textQuery} ${filters.dietary}` : filters.dietary;
    }
    if (filters.cuisine) {
      textQuery = textQuery ? `${textQuery} ${filters.cuisine}` : filters.cuisine;
    }
    if (!textQuery) {
      textQuery = 'restaurant';
    }

    setLoading(true);
    setSearched(true);

    try {
      const { Place } = placesLib;
      const request: google.maps.places.SearchByTextRequest = {
        textQuery,
        includedType: 'restaurant',
        fields: ['displayName', 'location', 'rating', 'priceLevel', 'photos', 'id', 'formattedAddress', 'regularOpeningHours'],
        maxResultCount: 20,
        locationBias: new google.maps.Circle({
          center: overrideCenter || center,
          radius: filters.radius || SEARCH_RADIUS_DEFAULT,
        }).getBounds() || undefined,
      };

      const { places } = await Place.searchByText(request);

      const results: Restaurant[] = (places || []).map((p) => ({
        place_id: p.id || '',
        name: p.displayName || '',
        lat: p.location?.lat() || 0,
        lng: p.location?.lng() || 0,
        rating: p.rating ?? null,
        user_rating_count: null,
        price_level: priceLevelToNumber(p.priceLevel),
        formatted_address: p.formattedAddress || null,
        phone_number: null,
        website_url: null,
        photo_urls: p.photos?.slice(0, 3).map((photo) => photo.getURI({ maxHeight: 400, maxWidth: 600 })) || [],
        opening_hours: p.regularOpeningHours ? { open_now: p.regularOpeningHours.periods ? true : undefined } : null,
        editorial_summary: null,
      }));

      // Apply client-side filters
      let filtered = results;
      if (filters.minRating) {
        filtered = filtered.filter((r) => r.rating && r.rating >= (filters.minRating || 0));
      }
      if (filters.maxPriceLevel) {
        filtered = filtered.filter((r) => r.price_level && r.price_level <= (filters.maxPriceLevel || 4));
      }

      // Apply sorting
      if (filters.sortBy === 'rating') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (filters.sortBy === 'price') {
        filtered.sort((a, b) => (a.price_level || 0) - (b.price_level || 0));
      } else if (filters.sortBy === 'distance' && userLocation) {
        // Compute rough distance for sorting
        const dist = (r: Restaurant) => Math.hypot(r.lat - userLocation.lat, r.lng - userLocation.lng);
        filtered.sort((a, b) => dist(a) - dist(b));
      }

      setRestaurants(filtered);

      // Pan map to first result
      if (filtered.length > 0 && map) {
        const bounds = new google.maps.LatLngBounds();
        filtered.forEach((r) => bounds.extend({ lat: r.lat, lng: r.lng }));
        map.fitBounds(bounds, 60);
      }

      // Cache results
      if (filtered.length > 0) {
        fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurants: filtered }),
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to search. The Google Maps API key might be missing, invalid, or missing the Places API scope.');
    } finally {
      setLoading(false);
    }
  }, [placesLib, query, filters, center, map, userLocation]);

  const handleCitySearch = useCallback(async () => {
    if (!cityQuery.trim() || !geocodingLib) return;
    const geocoder = new geocodingLib.Geocoder();
    try {
      const res = await geocoder.geocode({ address: cityQuery });
      if (res.results.length > 0) {
        const result = res.results[0];
        const isGeographic = result.types.some(t => 
          ['locality', 'sublocality', 'administrative_area_level_1', 'administrative_area_level_2', 'country', 'postal_code', 'neighborhood', 'political', 'colloquial_area'].includes(t)
        );

        if (!isGeographic) {
          setError("Please enter a valid city, neighborhood, or zip code.");
          return;
        }

        const loc = result.geometry.location;
        const newCenter = { lat: loc.lat(), lng: loc.lng() };
        setCenter(newCenter);
        setError(null);
        // Map will automatically pan due to the useEffect watching center
        handleSearch(newCenter); 
      } else {
        setError("Could not find that city. Please try again.");
      }
    } catch (e) {
      setError("Could not find that city. Please try again.");
    }
  }, [cityQuery, geocodingLib, handleSearch]);

  // Run initial search if there's an initial query or any active filters, or just run it to show default restaurants
  useEffect(() => {
    if (placesLib) {
      Promise.resolve().then(() => handleSearch());
    }
  }, [placesLib, filters.cuisine, filters.dietary, filters.radius, filters.minRating, filters.maxPriceLevel, filters.openNow, filters.sortBy]); // Removed handleSearch from deps to avoid infinite loops if center updates

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;

    const newQuery = chatQuery.trim();
    setChatHistory(prev => [...prev, {role: 'user', text: newQuery}]);
    setChatQuery('');
    
    setQuery(newQuery);
    
    setTimeout(() => {
      setChatHistory(prev => [...prev, {role: 'ai', text: `I found some great places matching "${newQuery}" for you on the map!` }]);
    }, 1000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <SearchBar
              value={query}
              onChange={setQuery}
              onSearch={() => handleSearch()}
              placeholder='What are you craving?'
            />
          </div>
          <div style={{ flex: 1 }}>
            <SearchBar
              value={cityQuery}
              onChange={setCityQuery}
              onSearch={handleCitySearch}
              placeholder='Where? (e.g. Chicago)'
            />
          </div>
        </div>
        <FilterPanel filters={filters} onFiltersChange={setFilters} />
      </div>

      {error && (
        <div style={{ margin: '0 var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
          {error}
        </div>
      )}

      <div className={styles.toggleBar}>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'map' ? styles.toggleActive : ''}`}
          onClick={() => setViewMode('map')}
        >
          <Map size={16} /> Map
        </button>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleActive : ''}`}
          onClick={() => setViewMode('list')}
        >
          <List size={16} /> List
        </button>
        <span className={styles.resultCount}>
          {restaurants.length > 0 ? `${restaurants.length} results` : ''}
        </span>
      </div>

      <div className={styles.content}>
        {viewMode === 'map' ? (
          <div className={styles.mapContainer}>
            <MapView
              restaurants={restaurants}
              selectedId={selectedRestaurant?.place_id || null}
              onSelectRestaurant={setSelectedRestaurant}
              center={center}
              zoom={DEFAULT_ZOOM}
            />
            {selectedRestaurant && (() => {
              const selectedIdx = restaurants.findIndex(r => r.place_id === selectedRestaurant.place_id);
              const handleNext = selectedIdx >= 0 && selectedIdx < restaurants.length - 1 
                ? () => setSelectedRestaurant(restaurants[selectedIdx + 1]) 
                : undefined;
              const handlePrev = selectedIdx > 0 
                ? () => setSelectedRestaurant(restaurants[selectedIdx - 1]) 
                : undefined;
              
              return (
                <div className={styles.summaryOverlay}>
                  <SummaryCard
                    restaurant={selectedRestaurant}
                    userLocation={userLocation}
                    onClose={() => setSelectedRestaurant(null)}
                    onNext={handleNext}
                    onPrev={handlePrev}
                  />
                </div>
              );
            })()}
          </div>
        ) : (
          <div className={styles.listContainer}>
            {loading ? (
              <div className={styles.skeletons}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`card-static ${styles.skeletonCard}`}>
                    <div className="skeleton" style={{ width: 120, height: 90, borderRadius: 'var(--radius-md)' }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton skeleton-title" />
                      <div className="skeleton skeleton-text" />
                      <div className="skeleton skeleton-text" style={{ width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : restaurants.length > 0 ? (
              <div className="stagger-children">
                {restaurants.map((r) => (
                  <RestaurantCard key={r.place_id} restaurant={r} userLocation={userLocation} />
                ))}
              </div>
            ) : searched ? (
              <div className={styles.empty}>
                <p style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <SearchX size={20} /> No restaurants found. Try a different search!
                </p>
              </div>
            ) : (
              <div className={styles.empty}>
                <p style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <Search size={20} /> Search for restaurants, cuisines, or dishes to get started.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Draggable nodeRef={chatDraggableRef} handle=".chat-drag-handle">
        <div ref={chatDraggableRef} className={styles.chatContainer}>
          {chatOpen && (
            <div className={`${styles.chatWindow} ${chatMinimized ? styles.chatWindowMinimized : ''}`}>
              <div className={`${styles.chatHeader} chat-drag-handle`} style={{ cursor: 'grab' }}>
                <span style={{fontWeight: 600}}>AI Concierge</span>
              <div style={{display: 'flex', gap: '4px', alignItems: 'center'}}>
                <button onClick={() => setChatMinimized(!chatMinimized)} className={styles.chatMinBtn} aria-label={chatMinimized ? 'Expand chat' : 'Minimize chat'}>
                  {chatMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                </button>
                <button onClick={() => { setChatOpen(false); setChatMinimized(false); }} className={styles.chatCloseBtn} aria-label="Close chat">×</button>
              </div>
            </div>
            <div className={styles.chatBody}>
              {chatHistory.length === 0 ? (
                <p className={styles.chatPlaceholder}>Ask me to find something! (e.g., &quot;fancy Italian&quot;)</p>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={msg.role === 'user' ? styles.chatMsgUser : styles.chatMsgAi}>
                    {msg.text}
                  </div>
                ))
              )}
            </div>
            <form className={styles.chatInputContainer} onSubmit={handleChatSubmit}>
              <input 
                type="text" 
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder="Ask for recommendations..." 
                className={styles.chatInput}
              />
              <button type="submit" className={styles.chatSubmitBtn}>Send</button>
            </form>
          </div>
        )}
        <button className={`${styles.chatFab} chat-drag-handle`} style={{ cursor: 'grab' }} onClick={() => setChatOpen(!chatOpen)}>
          <MessageSquare size={24} color="currentColor" />
        </button>
      </div>
    </Draggable>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner spinner-lg" /></div>}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
        <ExploreContent />
      </APIProvider>
    </Suspense>
  );
}
