'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import DishInsightCard from '@/components/restaurant/DishInsightCard';
import QuickActions from '@/components/restaurant/QuickActions';
import PhotoGallery from '@/components/restaurant/PhotoGallery';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import RecipeModal from '@/components/recipe/RecipeModal';
import RecommendationCard, { RatingModal } from '@/components/recommendation/RecommendationCard';
import { formatPriceLevel, getOpenStatus } from '@/lib/utils';
import type { Restaurant, DishInsight, DishRecommendation } from '@/lib/types';
import { Utensils, MapPin, Clock, Phone, ChefHat, Camera, Map, Sparkles } from 'lucide-react';
import styles from './restaurant.module.css';
function priceLevelToNumber(pl: unknown): number | null {
  const map: Record<string, number> = {
    FREE: 0, INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4,
  };
  if (typeof pl === 'number') return pl;
  if (typeof pl === 'string') return map[pl] ?? null;
  return null;
}
function RestaurantContent({ placeId }: { placeId: string }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [insights, setInsights] = useState<DishInsight[]>([]);
  const [reviews, setReviews] = useState<{ text: string; rating: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<DishRecommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['entree']);
  const [ratingModal, setRatingModal] = useState<string | null>(null); // dish name
  const [favoriteDishes, setFavoriteDishes] = useState<string[]>([]);
  const [recipeModal, setRecipeModal] = useState<{
    dishName: string;
    cuisineStyle: string;
    reviewSnippets?: string[];
  } | null>(null);
  const [manualDish, setManualDish] = useState('');
  const [similarRestaurants, setSimilarRestaurants] = useState<Restaurant[]>([]);
  const placesLib = useMapsLibrary('places');
  const fetchInsights = useCallback(async (name: string, reviews: { text: string; rating: number }[]) => {
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, restaurantName: name, reviews }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setInsights(data || []);
      } else {
        console.error('[DishRadar] Insights API error:', res.status);
      }
    } catch (err) {
      console.error('[DishRadar] Insights fetch error:', err);
    } finally {
      setInsightsLoading(false);
    }
  }, [placeId]);
  
  const fetchFromPlacesAPI = useCallback(async () => {
    const lib = placesLib;
    if (!lib) return null;
    try {
      const place = new lib.Place({ id: placeId });
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount',
                 'priceLevel', 'regularOpeningHours', 'nationalPhoneNumber', 'websiteURI',
                 'photos', 'reviews', 'editorialSummary'],
      });
      const photoUrls = place.photos?.slice(0, 6).map((p) =>
        p.getURI({ maxHeight: 600, maxWidth: 800 })
      ) || [];
      const r: Restaurant = {
        place_id: placeId,
        name: place.displayName || '',
        lat: place.location?.lat() || 0,
        lng: place.location?.lng() || 0,
        rating: place.rating ?? null,
        user_rating_count: place.userRatingCount ?? null,
        price_level: priceLevelToNumber(place.priceLevel),
        formatted_address: place.formattedAddress || null,
        phone_number: place.nationalPhoneNumber || null,
        website_url: place.websiteURI || null,
        photo_urls: photoUrls,
        opening_hours: place.regularOpeningHours ? {
          open_now: place.regularOpeningHours.periods ? true : undefined,
          weekday_text: place.regularOpeningHours.weekdayDescriptions || undefined,
        } : null,
        editorial_summary: place.editorialSummary || null,
      };
      // Cache to API
      fetch(`/api/places/${placeId}/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      }).catch(() => {});
      // Generate insights from reviews — always call even if empty (falls back to demo data)
      const fetchedReviews = (place.reviews || []).map((rv) => ({
        text: rv.text || '',
        rating: rv.rating || 0,
      })).filter((rv) => rv.text.length > 5);
      setReviews(fetchedReviews);
      fetchInsights(r.name, fetchedReviews);
      return r;
    } catch (err) {
      console.error('Places API fetch error:', err);
      return null;
    }
  }, [placesLib, placeId, fetchInsights]);
  // Fetch reviews from Places API for insight generation
  const fetchReviews = useCallback(async (restaurantName: string) => {
    const lib = placesLib;
    if (!lib) return;
    try {
      const place = new lib.Place({ id: placeId });
      await place.fetchFields({ fields: ['reviews'] });
      // Always call fetchInsights — handles empty reviews with demo data
      const fetchedReviews = (place.reviews || []).map((rv) => ({
        text: rv.text || '',
        rating: rv.rating || 0,
      })).filter((rv) => rv.text.length > 5);
      setReviews(fetchedReviews);
      fetchInsights(restaurantName, fetchedReviews);
    } catch (err) {
      console.error('[DishRadar] Failed to fetch reviews:', err);
      // Still show demo insights even if reviews fetch fails
      fetchInsights(restaurantName, []);
    }
  }, [placesLib, placeId, fetchInsights]);
  useEffect(() => {
    if (!placesLib) return; // Wait until Maps API is loaded

    async function load() {
      setLoading(true);

      // Try Supabase cache first
      let cachedRestaurant: Restaurant | null = null;
      try {
        const res = await fetch(`/api/places/${placeId}/details`);
        const { data, cached } = await res.json();
        if (cached && data) cachedRestaurant = data;
      } catch { /* fallthrough */ }

      if (cachedRestaurant) {
        setRestaurant(cachedRestaurant);
        setLoading(false);
        // Fetch fresh reviews for insight generation (reviews aren't cached)
        fetchReviews(cachedRestaurant.name);
        return;
      }

      // No cache — fetch everything from Places API (which also calls fetchInsights)
      const r = await fetchFromPlacesAPI();
      if (r) {
        setRestaurant(r);
        fetchSimilarRestaurants(r);
      }
      setLoading(false);
    }

    async function fetchSimilarRestaurants(r: Restaurant) {
      if (!placesLib) return;
      try {
        const { Place } = placesLib;
        const request: google.maps.places.SearchByTextRequest = {
          textQuery: 'restaurant',
          includedType: 'restaurant',
          locationBias: new google.maps.Circle({
            center: { lat: r.lat, lng: r.lng },
            radius: 2000,
          }),
          maxResultCount: 5,
          fields: ['displayName', 'location', 'rating', 'priceLevel', 'photos', 'id', 'formattedAddress', 'regularOpeningHours'],
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
          photo_urls: p.photos?.slice(0, 1).map((photo) => photo.getURI({ maxHeight: 300, maxWidth: 400 })) || [],
          opening_hours: p.regularOpeningHours ? { open_now: p.regularOpeningHours.periods ? true : undefined } : null,
          editorial_summary: null,
        })).filter(sim => sim.place_id !== placeId);
        setSimilarRestaurants(results);
      } catch (err) {
        console.error('Similar fetch error:', err);
      }
    }

    load();
  }, [placeId, fetchFromPlacesAPI, fetchReviews, fetchInsights, placesLib]);

  async function fetchRecommendations() {
    if (insights.length === 0) return;
    setRecsLoading(true);
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          restaurantName: restaurant?.name || '',
          categories: selectedCategories,
          dishes: insights,
        }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setRecommendations(data || []);
      }
    } catch (err) {
      console.error('Recommendations fetch error:', err);
    } finally {
      setRecsLoading(false);
    }
  }

  async function toggleFavoriteDish(dishName: string) {
    try {
      const res = await fetch('/api/favorites/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          restaurant_name: restaurant?.name || '',
          dish_name: dishName,
        }),
      });
      if (res.ok) {
        const { action } = await res.json();
        setFavoriteDishes(prev =>
          action === 'added' ? [...prev, dishName] : prev.filter(d => d !== dishName)
        );
      }
    } catch { /* ignore */ }
  }

  async function logVisit(dishNames: string[]) {
    try {
      await fetch('/api/order-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          restaurant_name: restaurant?.name || '',
          restaurant_address: restaurant?.formatted_address,
          dishes_ordered: dishNames,
        }),
      });
    } catch { /* ignore */ }
  }
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.heroSkeleton}>
          <div className="skeleton" style={{ width: '100%', height: '100%' }} />
        </div>
        <div className={styles.content}>
          <div className="skeleton skeleton-title" style={{ width: 300 }} />
          <div className="skeleton skeleton-text" style={{ width: 200 }} />
          <div className="skeleton skeleton-text" />
        </div>
      </div>
    );
  }
  if (!restaurant) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <h2>Restaurant not found</h2>
          <p>We couldn&apos;t load this restaurant. Please try again.</p>
          <a href="/explore" className="btn btn-primary">Back to Explore</a>
        </div>
      </div>
    );
  }
  const openStatus = getOpenStatus(restaurant.opening_hours?.open_now);
  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        {restaurant.photo_urls?.[0] ? (
          <img src={restaurant.photo_urls[0]} alt={restaurant.name} className={styles.heroImg} />
        ) : (
          <div className={styles.heroPlaceholder}><Utensils size={48} color="var(--color-text-tertiary)" /></div>
        )}
        <div className={styles.heroOverlay}>
          <h1 className={styles.heroTitle}>{restaurant.name}</h1>
          <div className={styles.heroMeta}>
            {restaurant.rating && <span className={styles.heroRating}>★ {restaurant.rating.toFixed(1)}</span>}
            {restaurant.user_rating_count && <span className={styles.heroReviews}>({restaurant.user_rating_count} reviews)</span>}
            {restaurant.price_level && <span className={styles.heroPrice}>{formatPriceLevel(restaurant.price_level)}</span>}
          </div>
        </div>
      </div>
      <div className={styles.content}>
        {/* Quick Actions */}
        <QuickActions restaurant={restaurant} placeId={placeId} />
        {/* Info */}
        <section className={`card-static ${styles.infoSection}`}>
          <div className={styles.infoGrid}>
            {restaurant.formatted_address && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><MapPin size={20} color="var(--color-text-secondary)" /></span>
                <div>
                  <div className={styles.infoLabel}>Address</div>
                  <div>{restaurant.formatted_address}</div>
                </div>
              </div>
            )}
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}><Clock size={20} color="var(--color-text-secondary)" /></span>
              <div>
                <div className={styles.infoLabel}>Status</div>
                <span className={`badge ${openStatus.isOpen ? 'badge-success' : 'badge-primary'}`}>
                  {openStatus.text}
                </span>
              </div>
            </div>
            {restaurant.phone_number && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><Phone size={20} color="var(--color-text-secondary)" /></span>
                <div>
                  <div className={styles.infoLabel}>Phone</div>
                  <a href={`tel:${restaurant.phone_number}`}>{restaurant.phone_number}</a>
                </div>
              </div>
            )}
          </div>
          {restaurant.opening_hours?.weekday_text && (
            <div className={styles.hours}>
              <div className={styles.infoLabel} style={{ marginBottom: '0.5rem' }}>Hours</div>
              {restaurant.opening_hours.weekday_text.map((line, i) => (
                <div key={i} className={styles.hourLine}>{line}</div>
              ))}
            </div>
          )}
        </section>
        {/* Dish Insights */}
        <section className={styles.dishSection}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ChefHat size={24} /> Top Dishes People Love Here</h2>
          <p className={styles.sectionNote}>AI-generated insights based on available reviews</p>
          {insightsLoading ? (
            <div className={styles.insightsSkeleton}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-static" style={{ padding: 'var(--space-5)' }}>
                  <div className="skeleton skeleton-title" />
                  <div className="skeleton" style={{ height: 4, marginBottom: '1rem' }} />
                  <div className="skeleton skeleton-text" />
                  <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                </div>
              ))}
            </div>
          ) : insights.length > 0 ? (
            <div className={`${styles.insightsGrid} stagger-children`}>
              {insights.slice(0, 5).map((insight, i) => (
                <DishInsightCard
                  key={i}
                  insight={insight}
                  onRate={(dishName) => setRatingModal(dishName)}
                  onGetRecipe={(dishName, tags) => {
                    // Grab review snippets that mention this dish
                    const dishSnippets = reviews
                      .filter(r => r.text.toLowerCase().includes(dishName.toLowerCase().split(' ')[0]))
                      .map(r => r.text)
                      .slice(0, 3);
                    setRecipeModal({
                      dishName,
                      cuisineStyle: tags[0] || 'International',
                      reviewSnippets: dishSnippets,
                    });
                  }}
                />
              ))}
            </div>
          ) : (
            <div className={`card-static ${styles.noInsights}`}>
              <p>No AI dish insights available for this location yet.</p>
            </div>
          )}

          {/* Manual Recipe Generator */}
          <div className="card-static" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--color-bg-secondary)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Want a recipe for a specific dish?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Type any dish from {restaurant.name}&apos;s menu below.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="e.g. Spicy Miso Ramen"
                value={manualDish}
                onChange={(e) => setManualDish(e.target.value)}
                style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualDish.trim()) {
                    setRecipeModal({ dishName: manualDish.trim(), cuisineStyle: 'International' });
                  }
                }}
              />
              <button
                className="btn btn-primary"
                disabled={!manualDish.trim()}
                onClick={() => {
                  if (manualDish.trim()) {
                    setRecipeModal({
                      dishName: manualDish.trim(),
                      cuisineStyle: 'International',
                      reviewSnippets: [],
                    });
                  }
                }}
              >
                Generate Recipe
              </button>
            </div>
          </div>
        </section>

        {/* Personalized Recommendations */}
        {insights.length > 0 && (
          <section className={styles.recsSection}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
              <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Sparkles size={24} /> Personalized For You
              </h2>
            </div>
            <p className={styles.sectionNote}>Based on your taste profile — select what you want to order and we&apos;ll rank the best picks.</p>

            {/* Category chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', margin: 'var(--space-4) 0' }}>
              {['appetizer', 'entree', 'dessert', 'drink'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategories(prev =>
                    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                  )}
                  className={`badge ${selectedCategories.includes(cat) ? 'badge-primary' : ''}`}
                  style={{
                    cursor: 'pointer',
                    border: '1.5px solid var(--color-border)',
                    background: selectedCategories.includes(cat) ? 'var(--color-primary)' : 'transparent',
                    color: selectedCategories.includes(cat) ? 'white' : 'var(--color-text-secondary)',
                    textTransform: 'capitalize',
                    fontWeight: 600,
                    padding: 'var(--space-2) var(--space-4)',
                    borderRadius: '999px',
                  }}
                >
                  {cat}s
                </button>
              ))}
              <button
                className="btn btn-primary btn-sm"
                onClick={fetchRecommendations}
                disabled={recsLoading || selectedCategories.length === 0}
                style={{ marginLeft: 'auto' }}
              >
                {recsLoading ? 'Thinking...' : 'Get My Recs'}
              </button>
            </div>

            {recommendations.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
                {recommendations.map((rec, i) => (
                  <RecommendationCard
                    key={i}
                    recommendation={rec}
                    placeId={placeId}
                    restaurantName={restaurant?.name || ''}
                    onRate={(dishName) => setRatingModal(dishName)}
                    isFavorited={favoriteDishes.includes(rec.dish_name)}
                    onToggleFavorite={toggleFavoriteDish}
                  />
                ))}
              </div>
            ) : recsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="card-static" style={{ padding: 'var(--space-5)' }}>
                    <div className="skeleton skeleton-title" />
                    <div className="skeleton" style={{ height: 4, margin: '0.75rem 0' }} />
                    <div className="skeleton skeleton-text" />
                  </div>
                ))}
              </div>
            ) : (
              <div className={`card-static ${styles.noInsights}`}>
                <p>Select categories above and click &quot;Get My Recs&quot; to see personalized dish recommendations.</p>
              </div>
            )}

            {/* Log visit button */}
            {recommendations.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setRatingModal("")}
                >
                  Log This Visit
                </button>
              </div>
            )}
          </section>
        )}

        {/* Photos */}
        {restaurant.photo_urls?.length > 1 && (
          <section className={styles.photosSection}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Camera size={24} /> Photos</h2>
            <PhotoGallery photos={restaurant.photo_urls.slice(1)} />
          </section>
        )}
        {/* Similar Restaurants */}
        {similarRestaurants.length > 0 && (
          <section className={styles.similarSection}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Map size={24} /> Similar Restaurants Nearby</h2>
            <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              {similarRestaurants.map((sim) => (
                <RestaurantCard key={sim.place_id} restaurant={sim} />
              ))}
            </div>
          </section>
        )}
        {/* Attribution */}
        <p className={styles.attribution}>
          Restaurant data provided by Google Maps Platform
        </p>
      </div>
      {/* Recipe Modal */}
      {recipeModal && (
        <RecipeModal
          isOpen={true}
          onClose={() => setRecipeModal(null)}
          dishName={recipeModal.dishName}
          cuisineStyle={recipeModal.cuisineStyle}
          placeId={placeId}
          restaurantName={restaurant?.name}
          restaurantAddress={restaurant?.formatted_address || undefined}
          reviewSnippets={recipeModal.reviewSnippets}
        />
      )}
      {/* Rating Modal */}
      {ratingModal !== null && restaurant && (
        <RatingModal
          initialDishName={ratingModal}
          restaurantName={restaurant.name}
          placeId={placeId}
          onClose={() => setRatingModal(null)}
          onSubmitted={() => setRatingModal(null)}
        />
      )}
    </div>
  );
}
export default function RestaurantPage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = React.use(params);
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <RestaurantContent placeId={placeId} />
    </APIProvider>
  );
}