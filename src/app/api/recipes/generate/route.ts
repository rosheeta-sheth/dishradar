import { NextResponse } from 'next/server';
import { generateRecipe } from '@/lib/claude';

export async function POST(request: Request) {
  try {
    const {
      dishName,
      cuisineStyle,
      placeId,
      restaurantName,
      restaurantAddress,
      reviewSnippets,
    } = await request.json();

    if (!dishName || !cuisineStyle) {
      return NextResponse.json({ error: 'Missing dishName or cuisineStyle' }, { status: 400 });
    }

    let dietaryRestrictions: string[] | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any = null;

    // Try to get dietary restrictions if authenticated (optional)
    try {
      const { createClient } = await import('@/lib/supabase/server');
      supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('dietary_restrictions')
          .eq('id', user.id)
          .single();
        dietaryRestrictions = profile?.dietary_restrictions;
      }
    } catch {
      // Supabase optional — proceed without it
    }

    const recipe = await generateRecipe(
      dishName,
      cuisineStyle,
      dietaryRestrictions,
      restaurantName ? { restaurantName, restaurantAddress, reviewSnippets } : undefined,
    );

    if (!recipe) {
      return NextResponse.json({ error: 'Failed to generate recipe' }, { status: 500 });
    }

    // Save recipe if authenticated
    if (user && supabase) {
      try {
        await supabase.from('saved_recipes').insert({
          user_id: user.id,
          dish_name: dishName,
          place_id: placeId || null,
          cuisine_style: cuisineStyle,
          recipe_data: recipe,
        });
      } catch {
        // Ignore save errors
      }
    }

    return NextResponse.json({ data: recipe });
  } catch (err) {
    console.error('Recipe generation error:', err);
    return NextResponse.json({ error: 'Failed to generate recipe' }, { status: 500 });
  }
}
