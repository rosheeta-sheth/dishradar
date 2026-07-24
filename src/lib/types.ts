/* === Types === */

export interface Restaurant {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  user_rating_count: number | null;
  price_level: number | null;
  formatted_address: string | null;
  phone_number: string | null;
  website_url: string | null;
  photo_urls: string[];
  opening_hours: OpeningHours | null;
  editorial_summary: string | null;
  distance?: number; // meters from user
}

export interface OpeningHours {
  open_now?: boolean;
  weekday_text?: string[];
  periods?: {
    open: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }[];
}

export interface DishInsight {
  id?: string;
  place_id: string;
  dish_name: string;
  sentiment_score: number; // -1 to 1
  ai_summary: string;
  mention_count: number;
  cuisine_tags: string[];
  price_estimate?: string; // Estimated or extracted price
  review_quotes?: string[]; // Actual quotes from reviews
}

export interface Recipe {
  id?: string;
  dish_name: string;
  cuisine_style: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: RecipeStep[];
  chef_notes: string;
}

export interface RecipeIngredient {
  item: string;
  quantity: string;
  unit: string;
  notes?: string;
}

export interface RecipeStep {
  step: number;
  text: string;
  tip?: string;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  adventurousness_score: number;
  preferred_cuisines: string[];
  dietary_restrictions: string[];
}

export interface UserInteraction {
  id?: string;
  user_id: string;
  interaction_type: 'search' | 'view' | 'like' | 'dislike' | 'save';
  place_id?: string;
  dish_name?: string;
  cuisine_tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SavedItem {
  id?: string;
  user_id: string;
  item_type: 'restaurant' | 'dish';
  place_id?: string;
  dish_name?: string;
  sentiment: 'like' | 'dislike';
}

export interface SearchFilters {
  query: string;
  lat?: number;
  lng?: number;
  radius?: number; // meters
  minRating?: number;
  maxPriceLevel?: number;
  openNow?: boolean;
  cuisine?: string;
  dietary?: string;
  sortBy?: 'relevance' | 'distance' | 'rating' | 'price';
}

export interface PlacesSearchResult {
  restaurants: Restaurant[];
  cached: boolean;
}

export interface UserPreferences {
  id?: string;
  user_id: string;
  spice_level: number; // 1-10
  dietary_restrictions: string[];
  texture_preferences: Record<string, number>; // { crispy: 0.8, creamy: 0.3, ... }
  flavor_profiles: Record<string, number>; // { spicy: 0.9, sweet: 0.4, ... }
  disliked_ingredients: string[];
  quiz_responses: Record<string, unknown>;
  preference_score: Record<string, number>; // computed scores
  updated_at?: string;
}

export interface DishRecommendation {
  dish_name: string;
  category: 'appetizer' | 'entree' | 'dessert' | 'drink' | 'unknown';
  match_score: number; // 0-100
  popularity_score: number; // 0-100
  final_score: number; // 0-100
  explanation: string; // Claude-generated one-sentence reason
  is_bold: boolean; // "bold recommendation" outside comfort zone
  price_estimate?: string;
  sentiment_score?: number;
}

export interface DishRating {
  id?: string;
  user_id: string;
  place_id: string;
  restaurant_name: string;
  dish_name: string;
  star_rating: number; // 1-5
  feedback_category: 'loved_it' | 'liked_it' | 'neutral' | 'didnt_like' | 'hated_it';
  notes?: string;
  created_at?: string;
}

export interface OrderHistory {
  id?: string;
  user_id: string;
  place_id: string;
  restaurant_name: string;
  restaurant_address?: string;
  dishes_ordered: string[];
  date_visited: string;
  notes?: string;
}

export interface FavoriteDish {
  id?: string;
  user_id: string;
  place_id: string;
  restaurant_name: string;
  dish_name: string;
  saved_at?: string;
}
