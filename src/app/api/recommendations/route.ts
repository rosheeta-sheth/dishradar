import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePersonalizedRecommendations } from '@/lib/claude';
import type { DishInsight, UserPreferences } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { restaurantName, categories, dishes } = body as {
      placeId: string;
      restaurantName: string;
      categories: string[];
      dishes: DishInsight[];
    };

    if (!dishes || dishes.length === 0) {
      return NextResponse.json({ error: 'No dishes provided' }, { status: 400 });
    }

    // Fetch user preferences
    const { data: userPrefs, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!userPrefs || prefError) {
      console.warn('Warning: No user preferences found or error fetching them:', prefError?.message);
    }

    // Also fetch recent ratings to weight recommendations
    const { data: recentRatings } = await supabase
      .from('dish_ratings')
      .select('dish_name, star_rating, feedback_category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    // Fetch user profile for adventurousness
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('adventurousness_score')
      .eq('id', user.id)
      .single();

    // Fetch order history
    const { data: orderHistory } = await supabase
      .from('order_history')
      .select('restaurant_name, dishes_ordered')
      .eq('user_id', user.id)
      .order('date_visited', { ascending: false })
      .limit(30);

    // Fetch saved items
    const { data: savedItems } = await supabase
      .from('saved_items')
      .select('item_type, dish_name, place_id')
      .eq('user_id', user.id)
      .eq('sentiment', 'like')
      .limit(50);

    const recommendations = await generatePersonalizedRecommendations({
      userPreferences: userPrefs as UserPreferences | null,
      adventurousnessScore: userProfile?.adventurousness_score ?? 0.5,
      orderHistory: orderHistory ?? [],
      savedItems: savedItems ?? [],
      dishes,
      categories,
      restaurantName,
      recentRatings: recentRatings ?? [],
    });

    return NextResponse.json({ data: recommendations });
  } catch (err) {
    console.error('Recommendations error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
