import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('order_history')
      .select('*')
      .eq('user_id', user.id)
      .order('date_visited', { ascending: false })
      .limit(50);

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
    const { place_id, restaurant_name, restaurant_address, dishes_ordered, notes } = body;

    if (!place_id || !restaurant_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await serviceClient.from('order_history').insert({
      user_id: user.id,
      place_id,
      restaurant_name,
      restaurant_address: restaurant_address || null,
      dishes_ordered: dishes_ordered ?? [],
      date_visited: new Date().toISOString(),
      notes: notes || null,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
