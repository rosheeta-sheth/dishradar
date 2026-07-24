import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: savedItems } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: recipes } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ data: { items: savedItems || [], recipes: recipes || [] } });
  } catch (err) {
    console.error('Saved items fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch saved items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_type, place_id, dish_name, sentiment } = await request.json();

    // Check if already saved
    let query = supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_type', item_type);

    if (place_id) query = query.eq('place_id', place_id);
    if (dish_name) query = query.eq('dish_name', dish_name);

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      // Toggle — remove
      await supabase.from('saved_items').delete().eq('id', existing.id);
      return NextResponse.json({ data: { saved: false } });
    }

    // Save
    const { error } = await supabase.from('saved_items').insert({
      user_id: user.id,
      item_type,
      place_id: place_id || null,
      dish_name: dish_name || null,
      sentiment: sentiment || 'like',
    });

    if (error) throw error;
    return NextResponse.json({ data: { saved: true } });
  } catch (err) {
    console.error('Save item error:', err);
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, type } = await request.json();
    if (!id || !type) return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });

    const table = type === 'recipe' ? 'saved_recipes' : 'saved_items';
    const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete item error:', err);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
