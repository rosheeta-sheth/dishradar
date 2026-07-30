'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, SavedItem, DishRating, OrderHistory, FavoriteDish } from '@/lib/types';
import { CUISINE_TAGS } from '@/lib/constants';
import {
  Compass, Utensils, Leaf, Heart, Store, ThumbsUp, ThumbsDown,
  Star, History, Trash2, ChefHat, Clock, Calendar, Flame, MapPin
} from 'lucide-react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import styles from './profile.module.css';

function HeatmapLayer({ data }: { data: { lat: number; lng: number }[] }) {
  const map = useMap();
  const visualization = useMapsLibrary('visualization');


  useEffect(() => {
    if (!map || !visualization) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newHeatmap = new (visualization.HeatmapLayer as any)({
      data: data.map(pt => new google.maps.LatLng(pt.lat, pt.lng)),
      map,
    });

    return () => newHeatmap.setMap(null);
  }, [map, visualization, data]);

  return null;
}

type Tab = 'preferences' | 'history' | 'favorites' | 'ratings';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPreferences, setUserPreferences] = useState<unknown>(null);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [ratings, setRatings] = useState<DishRating[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [favoriteDishes, setFavoriteDishes] = useState<FavoriteDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCuisines, setEditingCuisines] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [dietaryInput, setDietaryInput] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('preferences');

  const supabase = createClient();

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [prefRes, savedRes, ratingsRes, historyRes, favRes] = await Promise.all([
        fetch('/api/user/preferences'),
        fetch('/api/user/saved'),
        fetch('/api/ratings'),
        fetch('/api/order-history'),
        fetch('/api/favorites/dishes'),
        fetch('/api/preferences/quiz'),
      ]);

      if (prefRes.ok) {
        const data = await prefRes.json();
        setProfile(data.data);
        setSelectedCuisines(data.data?.preferred_cuisines || []);
      }
      if (savedRes.ok) {
        const data = await savedRes.json();
        setSavedItems(data.data || []);
      }
      if (ratingsRes.ok) {
        const data = await ratingsRes.json();
        setRatings(data.data || []);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setOrderHistory(data.data || []);
      }
      
      const quizRes = await fetch('/api/preferences/quiz');
      if (quizRes.ok) {
        const data = await quizRes.json();
        setUserPreferences(data.data || null);
      }
      if (favRes.ok) {
        const data = await favRes.json();
        setFavoriteDishes(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    setSaving(true);
    try {
      const dietary = dietaryInput.split(',').map(s => s.trim()).filter(Boolean);
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_cuisines: selectedCuisines,
          dietary_restrictions: dietary.length ? dietary : profile?.dietary_restrictions,
        }),
      });
      setEditingCuisines(false);
      loadAll();
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  async function removeFavoriteDish(id: string) {
    await fetch('/api/favorites/dishes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setFavoriteDishes(prev => prev.filter(d => d.id !== id));
  }

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines(prev =>
      prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
    );
  }

  function getFeedbackColor(cat: string) {
    if (cat === 'loved_it') return '#22c55e';
    if (cat === 'liked_it') return '#86efac';
    if (cat === 'neutral') return '#94a3b8';
    if (cat === 'didnt_like') return '#f87171';
    return '#ef4444';
  }

  function renderStars(n: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        fill={i < n ? '#f59e0b' : 'none'}
        color={i < n ? '#f59e0b' : 'var(--color-border)'}
      />
    ));
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonProfile}>
          <div className="skeleton skeleton-avatar" style={{ width: 80, height: 80 }} />
          <div className="skeleton skeleton-title" style={{ width: 200 }} />
          <div className="skeleton skeleton-text" style={{ width: 150 }} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Sign in to view your profile</h2>
          <p>Create an account to save restaurants, track preferences, and get personalized recommendations.</p>
          <a href="/login" className="btn btn-primary btn-lg">Sign In</a>
        </div>
      </div>
    );
  }

  const adventurenessLabel = profile.adventurousness_score >= 0.7
    ? 'Adventurous Explorer'
    : profile.adventurousness_score >= 0.4
    ? 'Balanced Palate'
    : 'Comfort Food Lover';

  const adventurenessPercent = Math.round(profile.adventurousness_score * 100);

  const badges = [];
  if (ratings.length >= 3) {
    badges.push({ name: 'Spicy Explorer', icon: <Flame size={16} /> });
  }
  if (ratings.some(r => r.dish_name.toLowerCase().includes('ramen'))) {
    badges.push({ name: 'Ramen Connoisseur', icon: <Utensils size={16} /> });
  }
  if (profile.adventurousness_score > 0.7) {
    badges.push({ name: 'Adventurous Eater', icon: <Compass size={16} /> });
  }
  if (ratings.length > 5) {
    badges.push({ name: 'Top Critic', icon: <Star size={16} /> });
  }

  const getMockCoords = (placeId: string) => {
    let hash = 0;
    for (let i = 0; i < placeId.length; i++) hash = placeId.charCodeAt(i) + ((hash << 5) - hash);
    const latOff = (hash % 100) / 1000;
    const lngOff = ((hash >> 4) % 100) / 1000;
    return { lat: 37.7749 + latOff, lng: -122.4194 + lngOff };
  };
  const heatmapPoints = [
    ...orderHistory.map(h => getMockCoords(h.place_id)),
    ...ratings.map(r => getMockCoords(r.place_id))
  ];

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'preferences', label: 'Preferences', icon: <Compass size={16} /> },
    { key: 'history', label: `History (${orderHistory.length})`, icon: <History size={16} /> },
    { key: 'favorites', label: `Favorites (${favoriteDishes.length})`, icon: <Heart size={16} /> },
    { key: 'ratings', label: `Ratings (${ratings.length})`, icon: <Star size={16} /> },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.avatar}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name || 'Profile'} />
          ) : (
            <span className={styles.avatarFallback}>
              {(profile.display_name || 'U')[0].toUpperCase()}
            </span>
          )}
        </div>
        <h1 className={styles.name}>{profile.display_name || 'Food Enthusiast'}</h1>
        <div className={styles.statsRow}>
          <span className={styles.stat}><ChefHat size={14} /> {ratings.length} ratings</span>
          <span className={styles.stat}><History size={14} /> {orderHistory.length} visits</span>
          <span className={styles.stat}><Heart size={14} /> {favoriteDishes.length} favorites</span>
        </div>
        <button onClick={handleSignOut} className="btn btn-ghost btn-sm">
          Sign Out
        </button>
      </div>

      {/* Tab navigation */}
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Preferences */}
      {activeTab === 'preferences' && (
        <>
          {/* Foodie Badges */}
          {badges.length > 0 && (
            <section className={`card-static ${styles.section}`}>
              <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={24} /> Foodie Badges
              </h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {badges.map(b => (
                  <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ color: 'var(--color-primary)' }}>{b.icon}</span>
                    <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{b.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Adventurousness Gauge */}
          <section className={`card-static ${styles.section}`}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={24} /> Your Food Personality
            </h2>
            {userPreferences?.preference_score?.personality_blurb && (
              <p style={{ fontStyle: 'italic', color: 'var(--color-primary)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                &quot;{userPreferences.preference_score.personality_blurb}&quot;
              </p>
            )}
            <div className={styles.gauge}>
              <div className={styles.gaugeLabel}>{adventurenessLabel}</div>
              <div className={styles.gaugeBar}>
                <div
                  className={styles.gaugeFill}
                  style={{ width: `${adventurenessPercent}%` }}
                />
              </div>
              <div className={styles.gaugeScale}>
                <span>Comfort</span>
                <span>Adventurous</span>
              </div>
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={() => window.location.href = '/onboarding'}
              style={{ marginTop: '1.5rem', width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              Retake Taste Profile Quiz
            </button>
          </section>

          {/* Cuisine Preferences */}
          <section className={`card-static ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Utensils size={24} /> Cuisine Preferences
              </h2>
              {!editingCuisines && (
                <button onClick={() => setEditingCuisines(true)} className="btn btn-ghost btn-sm">
                  Edit
                </button>
              )}
            </div>

            {editingCuisines ? (
              <div className={styles.cuisineEditor}>
                <div className={styles.cuisineGrid}>
                  {CUISINE_TAGS.map(cuisine => (
                    <button
                      key={cuisine}
                      className={`${styles.cuisineChip} ${selectedCuisines.includes(cuisine) ? styles.cuisineChipActive : ''}`}
                      onClick={() => toggleCuisine(cuisine)}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
                <div className={styles.editorActions}>
                  <button onClick={() => setEditingCuisines(false)} className="btn btn-ghost btn-sm">Cancel</button>
                  <button onClick={savePreferences} className="btn btn-primary btn-sm" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.cuisineList}>
                {profile.preferred_cuisines.length > 0 ? (
                  profile.preferred_cuisines.map(c => (
                    <span key={c} className="badge badge-primary">{c}</span>
                  ))
                ) : (
                  <p className={styles.emptyText}>
                    No preferences set yet. They&apos;ll be learned from your activity!
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Dietary Restrictions */}
          <section className={`card-static ${styles.section}`}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Leaf size={24} /> Dietary Restrictions
            </h2>
            {profile.dietary_restrictions.length > 0 ? (
              <div className={styles.cuisineList}>
                {profile.dietary_restrictions.map(d => (
                  <span key={d} className="badge badge-warning">{d}</span>
                ))}
              </div>
            ) : (
              <div>
                <p className={styles.emptyText}>None set</p>
                <div className="input-wrapper" style={{ marginTop: '0.75rem', maxWidth: 400 }}>
                  <input
                    type="text"
                    placeholder="e.g. vegetarian, gluten-free, nut allergy"
                    value={dietaryInput}
                    onChange={e => setDietaryInput(e.target.value)}
                  />
                </div>
                {dietaryInput && (
                  <button onClick={savePreferences} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} disabled={saving}>
                    Save
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Saved Restaurants */}
          <section className={`card-static ${styles.section}`}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={24} /> Saved Restaurants
            </h2>
            {savedItems.length > 0 ? (
              <div className={styles.savedList}>
                {savedItems.map(item => (
                  <div key={item.id} className={styles.savedItem}>
                    <span className={styles.savedIcon} style={{ display: 'flex' }}>
                      {item.item_type === 'restaurant' ? <Store size={18} /> : <Utensils size={18} />}
                    </span>
                    <div>
                      <div className={styles.savedName}>{item.dish_name || item.place_id}</div>
                      <div className={styles.savedType}>
                        {item.item_type} · {item.sentiment === 'like'
                          ? <ThumbsUp size={14} style={{ display: 'inline', marginLeft: 4 }} />
                          : <ThumbsDown size={14} style={{ display: 'inline', marginLeft: 4 }} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>No saved restaurants yet.</p>
            )}
          </section>
        </>
      )}

      {/* Tab: Order History */}
      {activeTab === 'history' && (
        <>
          <section className={`card-static ${styles.section}`}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={24} /> Dish Heatmap
            </h2>
            <div style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} libraries={['visualization']}>
                <Map
                  defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
                  defaultZoom={12}
                  mapId="DEMO_MAP_ID"
                  disableDefaultUI={true}
                >
                  <HeatmapLayer data={heatmapPoints} />
                </Map>
              </APIProvider>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-tertiary)' }}>
              A heatmap of restaurants you&apos;ve ordered from and rated.
            </p>
          </section>

          <section className={`card-static ${styles.section}`}>
            <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={24} /> Order History
            </h2>
          {orderHistory.length > 0 ? (
            <div className={styles.historyList}>
              {orderHistory.map(entry => (
                <div key={entry.id} className={styles.historyEntry}>
                  <div className={styles.historyHeader}>
                    <div>
                      <div className={styles.historyRestaurant}>{entry.restaurant_name}</div>
                      {entry.restaurant_address && (
                        <div className={styles.historyAddress}>{entry.restaurant_address}</div>
                      )}
                    </div>
                    <div className={styles.historyDate}>
                      <Calendar size={13} />
                      {new Date(entry.date_visited).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </div>
                  </div>
                  {entry.dishes_ordered.length > 0 && (
                    <div className={styles.historyDishes}>
                      {entry.dishes_ordered.map(dish => (
                        <span key={dish} className="badge">{dish}</span>
                      ))}
                    </div>
                  )}
                  {entry.notes && <p className={styles.historyNotes}>{entry.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState} style={{ padding: 'var(--space-6)' }}>
              <Clock size={40} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto var(--space-3)' }} />
              <p className={styles.emptyText}>No visits logged yet.</p>
              <a href="/explore" className="btn btn-primary btn-sm" style={{ marginTop: '1rem', display: 'inline-flex' }}>Find a Restaurant to Rate</a>
            </div>
          )}
        </section>
        </>
      )}

      {/* Tab: Favorite Dishes */}
      {activeTab === 'favorites' && (
        <section className={`card-static ${styles.section}`}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={24} /> Favorite Dishes
          </h2>
          {favoriteDishes.length > 0 ? (
            <div className={styles.favGrid}>
              {favoriteDishes.map(fav => (
                <div key={fav.id} className={styles.favCard}>
                  <div>
                    <div className={styles.favDishName}>{fav.dish_name}</div>
                    <div className={styles.favRestaurant}>
                      <a href={`/restaurant/${fav.place_id}`} className={styles.favLink}>
                        {fav.restaurant_name}
                      </a>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => removeFavoriteDish(fav.id!)}
                    aria-label="Remove favorite"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState} style={{ padding: 'var(--space-6)' }}>
              <Heart size={40} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto var(--space-3)' }} />
              <p className={styles.emptyText}>No favorite dishes yet. Heart dishes from restaurant recommendation cards to save them here.</p>
            </div>
          )}
        </section>
      )}

      {/* Tab: Ratings */}
      {activeTab === 'ratings' && (
        <section className={`card-static ${styles.section}`}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={24} /> My Ratings
          </h2>
          {ratings.length > 0 ? (
            <div className={styles.ratingsList}>
              {ratings.map(rating => (
                <div key={rating.id} className={styles.ratingEntry}>
                  <div className={styles.ratingInfo}>
                    <div className={styles.ratingDish}>{rating.dish_name}</div>
                    <div className={styles.ratingRestaurant}>
                      <a href={`/restaurant/${rating.place_id}`} className={styles.favLink}>
                        {rating.restaurant_name}
                      </a>
                    </div>
                  </div>
                  <div className={styles.ratingRight}>
                    <div className={styles.ratingStars}>{renderStars(rating.star_rating)}</div>
                    <span
                      className={styles.feedbackBadge}
                      style={{ color: getFeedbackColor(rating.feedback_category) }}
                    >
                      {rating.feedback_category.replace(/_/g, ' ')}
                    </span>
                    {rating.notes && <p className={styles.ratingNotes}>{rating.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState} style={{ padding: 'var(--space-6)' }}>
              <Star size={40} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto var(--space-3)' }} />
              <p className={styles.emptyText}>No ratings yet.</p>
              <a href="/explore" className="btn btn-primary btn-sm" style={{ marginTop: '1rem', display: 'inline-flex' }}>Find a Restaurant to Rate</a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
