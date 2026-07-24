import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Preferences fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.preferred_cuisines) updates.preferred_cuisines = body.preferred_cuisines;
    if (body.dietary_restrictions) updates.dietary_restrictions = body.dietary_restrictions;
    if (body.adventurousness_score !== undefined) updates.adventurousness_score = body.adventurousness_score;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('Preferences update error:', err);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
