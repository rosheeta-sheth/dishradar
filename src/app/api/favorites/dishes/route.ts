import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('favorite_dishes')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });

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
    const { place_id, restaurant_name, dish_name } = body;

    if (!place_id || !dish_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if already favorited (toggle)
    const { data: existing } = await supabase
      .from('favorite_dishes')
      .select('id')
      .eq('user_id', user.id)
      .eq('place_id', place_id)
      .eq('dish_name', dish_name)
      .single();

    if (existing) {
      // Remove
      await serviceClient.from('favorite_dishes').delete().eq('id', existing.id);
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // Add
      await serviceClient.from('favorite_dishes').insert({
        user_id: user.id,
        place_id,
        restaurant_name: restaurant_name || '',
        dish_name,
      });
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { error } = await serviceClient
      .from('favorite_dishes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
