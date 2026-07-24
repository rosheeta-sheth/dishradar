import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('dish_ratings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { place_id, restaurant_name, dish_name, star_rating, feedback_category, notes } = body;

    if (!place_id || !dish_name || !star_rating || !feedback_category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await serviceClient.from('dish_ratings').insert({
      user_id: user.id,
      place_id,
      restaurant_name: restaurant_name || '',
      dish_name,
      star_rating,
      feedback_category,
      notes: notes || null,
    });

    if (error) throw error;

    // After every 5 ratings, recalculate preference profile
    const { count } = await supabase
      .from('dish_ratings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count && count % 5 === 0) {
      // Fetch recent 20 ratings to update preference weights
      const { data: recentRatings } = await supabase
        .from('dish_ratings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentRatings && recentRatings.length > 0) {
        // Compute updated spice tendency from ratings
        // (simplified: if user loves spicy dishes, bump spice score)
        const positiveRatings = recentRatings.filter(r =>
          r.feedback_category === 'loved_it' || r.feedback_category === 'liked_it'
        );
        const preference_score = {
          total_ratings: count,
          positive_rate: positiveRatings.length / recentRatings.length,
          last_batch_updated: new Date().toISOString(),
        };

        await serviceClient
          .from('user_preferences')
          .update({ preference_score, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
