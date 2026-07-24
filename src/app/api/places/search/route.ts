import { NextResponse } from 'next/server';
import type { Restaurant } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { restaurants } = (await request.json()) as { restaurants: Restaurant[] };
    if (!restaurants?.length) {
      return NextResponse.json({ error: 'No restaurants provided' }, { status: 400 });
    }

    // Try to cache — but never fail the whole request if Supabase has RLS or config issues
    try {
      const { createServiceClient } = await import('@/lib/supabase/server');
      const supabase = await createServiceClient();

      const rows = restaurants.map((r) => ({
        place_id: r.place_id,
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        rating: r.rating,
        user_rating_count: r.user_rating_count,
        price_level: r.price_level,
        formatted_address: r.formatted_address,
        phone_number: r.phone_number,
        website_url: r.website_url,
        photo_urls: r.photo_urls || [],
        opening_hours: r.opening_hours,
        editorial_summary: r.editorial_summary,
        last_refreshed: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('restaurant_cache')
        .upsert(rows, { onConflict: 'place_id' });

      if (error) {
        console.error('Places search cache error:', error);
        // Don't throw — caching is optional
      }

      return NextResponse.json({ data: { cached: error ? 0 : rows.length } });
    } catch (err) {
      console.error('Places search cache error:', err);
      // Return success anyway — the search itself worked, caching is optional
      return NextResponse.json({ data: { cached: 0 } });
    }
  } catch (err) {
    console.error('Places search error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
