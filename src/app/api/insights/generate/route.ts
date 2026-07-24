import { NextResponse } from 'next/server';
import { extractDishInsights } from '@/lib/claude';

export async function POST(request: Request) {
  try {
    const { placeId, restaurantName, reviews } = await request.json();

    if (!placeId || !restaurantName) {
      return NextResponse.json({ error: 'Missing placeId or restaurantName' }, { status: 400 });
    }

    // Try to check Supabase cache (but don't fail if Supabase isn't configured)
    try {
      const { createServiceClient } = await import('@/lib/supabase/server');
      const { isCacheFresh } = await import('@/lib/utils');
      const { CACHE_DURATION_MS } = await import('@/lib/constants');
      const supabase = await createServiceClient();

      const { data: cached } = await supabase
        .from('dish_insights')
        .select('*')
        .eq('place_id', placeId)
        .order('sentiment_score', { ascending: false });

      if (cached?.length && cached[0].last_updated) {
        if (isCacheFresh(cached[0].last_updated, CACHE_DURATION_MS)) {
          return NextResponse.json({ data: cached, cached: true });
        }
      }
    } catch {
      // Supabase not configured — skip caching, proceed to generate
    }

    // Always call extractDishInsights — it handles empty reviews and missing API key gracefully
    const insights = await extractDishInsights(restaurantName, reviews || []);

    // Try to cache results (but don't fail if Supabase isn't configured)
    try {
      const { createServiceClient } = await import('@/lib/supabase/server');
      const supabase = await createServiceClient();

      if (insights.length) {
        await supabase.from('dish_insights').delete().eq('place_id', placeId);

        const rows = insights.map((d) => ({
          place_id: placeId,
          dish_name: d.dish_name,
          sentiment_score: d.sentiment_score,
          ai_summary: d.ai_summary,
          mention_count: d.mention_count,
          cuisine_tags: d.cuisine_tags || [],
          last_updated: new Date().toISOString(),
        }));
        await supabase.from('dish_insights').insert(rows);
      }
    } catch {
      // Caching failed — that's ok, we still have the insights to return
    }

    return NextResponse.json({ data: insights.map((d) => ({ ...d, place_id: placeId })), cached: false });
  } catch (err) {
    console.error('Insights generation error:', err);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
