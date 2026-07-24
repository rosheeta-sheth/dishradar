import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { UserPreferences } from '@/lib/types';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function generatePersonalityBlurb(body: Partial<UserPreferences>): string {
  const textures = body.texture_preferences || {};
  const flavors = body.flavor_profiles || {};

  const lovedTextures = Object.entries(textures).filter(([_, v]) => v >= 0.7).map(([k]) => k);
  const hatedTextures = Object.entries(textures).filter(([_, v]) => v <= 0.3).map(([k]) => k);
  
  const lovedFlavors = Object.entries(flavors).filter(([_, v]) => v >= 0.7).map(([k]) => k);
  const hatedFlavors = Object.entries(flavors).filter(([_, v]) => v <= 0.3).map(([k]) => k);

  let blurb = "You have a balanced and open-minded palate!";

  if (lovedFlavors.length > 0 && lovedTextures.length > 0) {
    blurb = `You gravitate toward ${lovedFlavors[0]} flavors and love ${lovedTextures[0]} textures.`;
  } else if (lovedFlavors.length > 0) {
    blurb = `You have a strong preference for ${lovedFlavors.join(' and ')} flavors.`;
  } else if (lovedTextures.length > 0) {
    blurb = `You really enjoy dishes with ${lovedTextures.join(' and ')} textures.`;
  }

  if (hatedFlavors.length > 0) {
    blurb += ` You tend to avoid ${hatedFlavors[0]} foods.`;
  } else if (hatedTextures.length > 0) {
    blurb += ` You tend to avoid ${hatedTextures[0]} textures.`;
  }

  return blurb;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as Partial<UserPreferences>;

    const personalityBlurb = generatePersonalityBlurb(body);
    const preferenceScore = {
      ...(body.preference_score || {}),
      personality_blurb: personalityBlurb
    };

    // Upsert preferences
    const { error: prefError } = await serviceClient
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        spice_level: body.spice_level ?? 5,
        dietary_restrictions: body.dietary_restrictions ?? [],
        texture_preferences: body.texture_preferences ?? {},
        flavor_profiles: body.flavor_profiles ?? {},
        disliked_ingredients: body.disliked_ingredients ?? [],
        quiz_responses: body.quiz_responses ?? {},
        preference_score: preferenceScore,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (prefError) {
      console.error('Failed to save user_preferences:', prefError);
      // We don't throw here. We want to ensure the user can proceed to the app 
      // even if there's a schema mismatch or constraint error in user_preferences.
    }

    // Mark quiz completed on the profile
    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({ quiz_completed: true })
      .eq('id', user.id);

    if (profileError) console.warn('Could not mark quiz completed:', profileError.message);

    return NextResponse.json({ success: true, blurb: personalityBlurb });
  } catch (err: any) {
    console.error('[Quiz POST Error]:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
