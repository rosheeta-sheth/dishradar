import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { CACHE_DURATION_MS } from '@/lib/constants';
import { isCacheFresh } from '@/lib/utils';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await params;
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from('restaurant_cache')
      .select('*')
      .eq('place_id', placeId)
      .single();
    if (error || !data) {
      return NextResponse.json({ data: null, cached: false });
    }
    if (!isCacheFresh(data.last_refreshed, CACHE_DURATION_MS)) {
      return NextResponse.json({ data, cached: false });
    }
    return NextResponse.json({ data, cached: true });
  } catch (err) {
    console.error('Place details cache error:', err);
    // Gracefully degrade — let the client fetch from Places API directly
    return NextResponse.json({ data: null, cached: false });
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await params;
    const body = await request.json();
    const supabase = await createServiceClient();
    const { error } = await supabase.from('restaurant_cache').upsert(
      {
        place_id: placeId,
        name: body.name,
        lat: body.lat,
        lng: body.lng,
        rating: body.rating,
        user_rating_count: body.user_rating_count,
        price_level: body.price_level,
        formatted_address: body.formatted_address,
        phone_number: body.phone_number,
        website_url: body.website_url,
        photo_urls: body.photo_urls || [],
        opening_hours: body.opening_hours,
        editorial_summary: body.editorial_summary,
        last_refreshed: new Date().toISOString(),
      },
      { onConflict: 'place_id' }
    );
    if (error) throw error;
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('Place details upsert error:', err);
    // Caching failed but that's ok — app still works without it
    return NextResponse.json({ data: { success: false } });
  }
}

