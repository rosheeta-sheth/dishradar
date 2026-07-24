import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computePreferredCuisines, computeAdventurousness } from '@/lib/personalization';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { interaction_type, place_id, dish_name, cuisine_tags, metadata } = body;

    if (!interaction_type) {
      return NextResponse.json({ error: 'Missing interaction_type' }, { status: 400 });
    }

    // Log interaction
    const { error } = await supabase.from('user_interactions').insert({
      user_id: user.id,
      interaction_type,
      place_id: place_id || null,
      dish_name: dish_name || null,
      cuisine_tags: cuisine_tags || [],
      metadata: metadata || {},
    });

    if (error) throw error;

    // Recompute preferences if enough interactions
    const { data: interactions, count } = await supabase
      .from('user_interactions')
      .select('cuisine_tags, interaction_type, place_id', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (count && count > 10 && interactions) {
      const preferred = computePreferredCuisines(interactions);
      const adventurousness = computeAdventurousness(interactions);

      await supabase
        .from('profiles')
        .update({
          preferred_cuisines: preferred,
          adventurousness_score: adventurousness,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    return NextResponse.json({ data: { logged: true } });
  } catch (err) {
    console.error('Interaction logging error:', err);
    return NextResponse.json({ error: 'Failed to log interaction' }, { status: 500 });
  }
}
