-- =============================================
-- DishRadar Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  adventurousness_score FLOAT DEFAULT 0.5,
  preferred_cuisines TEXT[] DEFAULT '{}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Restaurant cache
CREATE TABLE IF NOT EXISTS public.restaurant_cache (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  rating FLOAT,
  user_rating_count INTEGER,
  price_level INTEGER,
  formatted_address TEXT,
  phone_number TEXT,
  website_url TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  opening_hours JSONB,
  editorial_summary TEXT,
  cached_data JSONB,
  last_refreshed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_cache_refreshed
  ON public.restaurant_cache(last_refreshed);

-- AI-generated dish insights
CREATE TABLE IF NOT EXISTS public.dish_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL REFERENCES public.restaurant_cache(place_id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  sentiment_score FLOAT,
  ai_summary TEXT,
  mention_count INTEGER DEFAULT 1,
  cuisine_tags TEXT[] DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, dish_name)
);

CREATE INDEX IF NOT EXISTS idx_dish_insights_place
  ON public.dish_insights(place_id);

-- User interactions for personalization
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  place_id TEXT,
  dish_name TEXT,
  cuisine_tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user
  ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created
  ON public.user_interactions(created_at DESC);

-- Saved/liked items
CREATE TABLE IF NOT EXISTS public.saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  place_id TEXT,
  dish_name TEXT,
  sentiment TEXT DEFAULT 'like',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, place_id, dish_name)
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user
  ON public.saved_items(user_id);

-- Generated recipes
CREATE TABLE IF NOT EXISTS public.saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  place_id TEXT,
  cuisine_style TEXT,
  recipe_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_recipes_user
  ON public.saved_recipes(user_id);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- Restaurant cache: public read, service-role write
CREATE POLICY "Anyone can read restaurant cache" ON public.restaurant_cache
  FOR SELECT USING (true);

-- Dish insights: public read, service-role write
CREATE POLICY "Anyone can read dish insights" ON public.dish_insights
  FOR SELECT USING (true);

-- User interactions: own data only
CREATE POLICY "Users can read own interactions" ON public.user_interactions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own interactions" ON public.user_interactions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Saved items: own data only
CREATE POLICY "Users manage own saved items" ON public.saved_items
  FOR ALL USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Saved recipes: own data only
CREATE POLICY "Users manage own saved recipes" ON public.saved_recipes
  FOR ALL USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
