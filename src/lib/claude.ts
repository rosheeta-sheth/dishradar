import Anthropic from '@anthropic-ai/sdk';
import type { DishInsight, Recipe, UserPreferences, DishRecommendation } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY?.trim() || 'dummy_key',
});

// Model fallback chain — tries fast model first, falls back to powerful one
const FAST_MODEL = 'claude-haiku-4-5';
const POWERFUL_MODEL = 'claude-opus-4-5';

async function callClaude(params: Parameters<typeof anthropic.messages.create>[0]) {
  // Try fast model first
  try {
    return await anthropic.messages.create({ ...params, model: FAST_MODEL });
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err?.status === 404) {
      // Fast model not available, try powerful model
      return await anthropic.messages.create({ ...params, model: POWERFUL_MODEL });
    }
    throw e;
  }
}

// ─────────────────────────────────────────────
// Demo fallbacks (used when API key missing or invalid)
// ─────────────────────────────────────────────

function getDemoInsights(): DishInsight[] {
  return [
    {
      dish_name: 'Tonkotsu Ramen',
      sentiment_score: 0.97,
      ai_summary: 'Consistently rated as the star of the menu — customers rave about the rich, milky pork broth that has been simmered for hours. The perfectly springy noodles and melt-in-your-mouth chashu pork make this a must-order.',
      mention_count: 18,
      cuisine_tags: ['Japanese', 'Ramen'],
      price_estimate: '$15.00',
      review_quotes: [
        '"The tonkotsu broth is incredibly rich and creamy, clearly simmered for hours."',
        '"Best ramen in Atlanta - the chashu pork melts in your mouth and the noodles are perfectly springy."'
      ],
      place_id: '',
    },
    {
      dish_name: 'Spicy Miso Ramen',
      sentiment_score: 0.93,
      ai_summary: 'A bold, fiery option that reviewers say packs serious heat without overwhelming the deeply savoury miso base. The corn and butter toppings add a welcome sweetness that balances everything out.',
      mention_count: 11,
      cuisine_tags: ['Japanese', 'Spicy'],
      price_estimate: '$16.50',
      review_quotes: [
        '"Amazing spicy miso ramen, best in Atlanta"',
        '"The spice level is perfect and the corn adds a nice touch."'
      ],
      place_id: '',
    },
    {
      dish_name: 'Gyoza',
      sentiment_score: 0.89,
      ai_summary: 'Crispy-bottomed dumplings that customers almost universally order as a starter. The thin wrappers and juicy filling get particular praise, and several reviewers say they are the best gyoza they have had.',
      mention_count: 7,
      cuisine_tags: ['Japanese', 'Appetizer'],
      price_estimate: '$7.00',
      review_quotes: [
        '"We always get the gyoza to start, perfectly crispy on the bottom."',
        '"These dumplings are juicy and delicious."'
      ],
      place_id: '',
    },
  ];
}

function getDemoRecipe(dishName: string, cuisineStyle: string, restaurantName?: string): Recipe {
  const restaurantNote = restaurantName
    ? `This is a home-cook recreation inspired by ${restaurantName}'s version of ${dishName}. `
    : '';
  return {
    dish_name: dishName,
    cuisine_style: cuisineStyle,
    difficulty: 'medium',
    prep_time_minutes: 25,
    cook_time_minutes: 40,
    servings: 4,
    ingredients: [
      { item: 'Main protein (chicken, pork, or tofu)', quantity: '500', unit: 'g', notes: `Primary protein for ${dishName}` },
      { item: 'Garlic cloves, minced', quantity: '4', unit: 'cloves' },
      { item: 'Fresh ginger, grated', quantity: '1', unit: 'tbsp' },
      { item: 'Soy sauce', quantity: '3', unit: 'tbsp' },
      { item: 'Sesame oil', quantity: '1', unit: 'tbsp' },
      { item: 'Cooking oil (neutral)', quantity: '2', unit: 'tbsp' },
      { item: 'Green onions, sliced', quantity: '3', unit: 'stalks', notes: 'For garnish and flavour' },
      { item: 'Salt and white pepper', quantity: '', unit: 'to taste' },
    ],
    instructions: [
      { step: 1, text: `Prepare your ingredients: mince the garlic, grate the ginger, and slice the green onions. Having everything ready before you heat the pan is essential for ${dishName}.`, tip: 'Mise en place ensures nothing burns while you are still prepping.' },
      { step: 2, text: 'Heat a wok or heavy skillet over high heat until smoking. Add the cooking oil and swirl to coat.', tip: 'High heat is the secret to restaurant-quality results.' },
      { step: 3, text: 'Add garlic and ginger, stir-fry for 30 seconds until intensely fragrant. Do not let them brown.' },
      { step: 4, text: 'Add your protein and cook, stirring, until cooked through and slightly caramelised on the edges.' },
      { step: 5, text: 'Add soy sauce and sesame oil. Toss everything together over high heat for 1 minute.' },
      { step: 6, text: 'Taste and adjust seasoning with salt and white pepper. Garnish with green onions and serve immediately.', tip: 'Always taste before plating — this is where you make it yours.' },
    ],
    chef_notes: `${restaurantNote}For best results, use the highest heat your stove allows and cook in small batches so the pan stays hot. Add your ANTHROPIC_API_KEY to get a fully restaurant-specific, AI-generated recipe for exactly how ${restaurantName || 'this restaurant'} makes this dish.`,
  };
}

// ─────────────────────────────────────────────
// Dish Insights — parse reviews with Claude
// ─────────────────────────────────────────────

/**
 * Extract dish-level insights from restaurant reviews using Claude.
 */
export async function extractDishInsights(
  restaurantName: string,
  reviews: { text: string; rating: number }[]
): Promise<DishInsight[]> {
  const hasNoReviews = !reviews || reviews.length === 0;
  const hasNoKey = !process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY.trim() === 'dummy_key';

  if (hasNoKey) {
    console.warn('[DishRadar] No ANTHROPIC_API_KEY — returning demo dish insights.');
    return getDemoInsights();
  }

  if (hasNoReviews) {
    console.warn('[DishRadar] No reviews available — returning demo dish insights.');
    return getDemoInsights();
  }

  const reviewText = reviews
    .map((r, i) => `Review ${i + 1} (${r.rating}★): ${r.text}`)
    .join('\n\n');

  try {
    const response = await callClaude({
      model: FAST_MODEL, // overridden inside callClaude
      max_tokens: 2048,
      system: `You are a culinary data analyst. Extract dish-level insights from restaurant reviews. 
Always respond with valid JSON only — no markdown, no code fences, no explanation.
Paraphrase what reviewers say for the summary, but also extract exact, brief quotes.`,
      messages: [
        {
          role: 'user',
          content: `Analyze these reviews for "${restaurantName}" and extract all specific dishes mentioned.

${reviewText}

Return a JSON array with this exact structure:
[
  {
    "dish_name": "Name of the dish",
    "sentiment_score": 0.8,
    "ai_summary": "A 2-3 sentence paraphrased summary of what people say about this dish",
    "mention_count": 2,
    "cuisine_tags": ["Entree", "Japanese", "Ramen"],
    "review_quotes": ["Exact quote snippet 1", "Exact quote snippet 2"]
  }
]

Rules:
- sentiment_score: -1 (terrible) to 1 (amazing)
- Only include dishes with clear mentions and sentiment
- Sort by sentiment_score descending
- ai_summary must paraphrase, while review_quotes must be exact 1-sentence snippets from the reviews
- cuisine_tags MUST include the course category (e.g. "Appetizer", "Entree", "Dessert", or "Drink") as the first item
- dish_name MUST be the specific, full menu name (e.g., "Spicy Tonkotsu Ramen" instead of just "ramen", or "Margherita Pizza" instead of just "pizza"). Use context clues to deduce the full true name.
- If no specific dishes are mentioned, return []`,
        },
      ],
    });

    const msg = response as Anthropic.Messages.Message;
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[DishRadar] No JSON from Claude insights, using demo data');
      return getDemoInsights();
    }
    const dishes = JSON.parse(jsonMatch[0]) as DishInsight[];
    if (!dishes.length) {
      return getDemoInsights();
    }
    return dishes.map((d) => ({ ...d, place_id: '', price_estimate: 'Market Price' }));
  } catch (err) {
    console.error('[DishRadar] Claude dish insights error:', err);
    return getDemoInsights();
  }
}

// ─────────────────────────────────────────────
// Restaurant-Specific Recipe Generation
// ─────────────────────────────────────────────

/**
 * Generate a detailed, restaurant-specific copycat recipe using Claude.
 * Uses knowledge of the restaurant + any review snippets to recreate
 * exactly how THAT restaurant makes the dish.
 */
export async function generateRecipe(
  dishName: string,
  cuisineStyle: string,
  dietaryRestrictions?: string[],
  restaurantContext?: {
    restaurantName: string;
    restaurantAddress?: string;
    reviewSnippets?: string[];
  }
): Promise<Recipe | null> {
  const hasNoKey = !process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY.trim() === 'dummy_key';
  if (hasNoKey) {
    console.warn('[DishRadar] No ANTHROPIC_API_KEY — returning demo recipe.');
    return getDemoRecipe(dishName, cuisineStyle, restaurantContext?.restaurantName);
  }

  const dietaryNote = dietaryRestrictions?.length
    ? `\nAccommodate these dietary restrictions: ${dietaryRestrictions.join(', ')}`
    : '';

  const restaurantName = restaurantContext?.restaurantName || 'this restaurant';
  const addressNote = restaurantContext?.restaurantAddress
    ? ` located at ${restaurantContext.restaurantAddress}`
    : '';

  const reviewContext = restaurantContext?.reviewSnippets?.length
    ? `\n\nCustomer reviews that mention this dish:\n${restaurantContext.reviewSnippets.map((r) => `- "${r}"`).join('\n')}`
    : '';

  const prompt = `You are recreating a specific restaurant dish for home cooks.

Restaurant: ${restaurantName}${addressNote}
Dish: ${dishName}
Cuisine style: ${cuisineStyle}${dietaryNote}${reviewContext}

Your goal: Create the most accurate copycat recipe possible for HOW "${restaurantName}" specifically makes "${dishName}". 

Use everything you know about:
1. This specific restaurant's culinary style, reputation, and signature techniques
2. The cuisine tradition (${cuisineStyle}) and authentic preparation methods
3. Any clues from the customer reviews above about specific ingredients, flavours, or techniques
4. What makes THIS restaurant's version distinctive — not a generic version of the dish

Return ONLY a JSON object with this exact structure (no markdown, no code fences):
{
  "dish_name": "${dishName} (${restaurantName}-style)",
  "cuisine_style": "${cuisineStyle}",
  "difficulty": "easy|medium|hard",
  "prep_time_minutes": 30,
  "cook_time_minutes": 45,
  "servings": 2,
  "restaurant_note": "One sentence describing what makes ${restaurantName}'s version of this dish special or distinctive",
  "ingredients": [
    { "item": "ingredient name", "quantity": "amount", "unit": "unit", "notes": "optional prep note or substitution" }
  ],
  "instructions": [
    { "step": 1, "text": "Detailed instruction step", "tip": "optional pro tip" }
  ],
  "chef_notes": "2-3 sentences of chef tips specifically for recreating this restaurant's version at home"
}

Make it genuinely detailed and specific — 10-15 ingredients, 6-10 steps. Include exact quantities and temperatures.`;

  try {
    const response = await callClaude({
      model: FAST_MODEL,
      max_tokens: 3000,
      system: `You are a professional chef and food writer who specialises in recreating famous restaurant dishes at home. 
You have deep knowledge of restaurant techniques and ingredients across all cuisines.
Always respond with valid JSON only — no markdown, no code fences, no explanation.`,
      messages: [{ role: 'user', content: prompt }],
    });

    const msg = response as Anthropic.Messages.Message;
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    console.log('[DishRadar] Claude recipe response snippet:', text.substring(0, 150));
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getDemoRecipe(dishName, cuisineStyle, restaurantContext?.restaurantName);
    }
    try {
      return JSON.parse(jsonMatch[0]) as Recipe;
    } catch {
      return getDemoRecipe(dishName, cuisineStyle, restaurantContext?.restaurantName);
    }
  } catch (err) {
    console.error('[DishRadar] Claude recipe error:', err);
    return getDemoRecipe(dishName, cuisineStyle, restaurantContext?.restaurantName);
  }
}

// ─────────────────────────────────────────────
// Personalised dish note
// ─────────────────────────────────────────────

export async function getPersonalizedNote(
  dishName: string,
  cuisineTags: string[],
  userPreferredCuisines: string[],
  adventurenessScore: number
): Promise<string | null> {
  const isOutsideComfortZone = !cuisineTags.some((t) => userPreferredCuisines.includes(t));
  if (!isOutsideComfortZone && adventurenessScore > 0.3) return null;
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return null;

  try {
    const response = await callClaude({
      model: FAST_MODEL,
      max_tokens: 100,
      system: 'You write brief, friendly food recommendation notes. One sentence max.',
      messages: [
        {
          role: 'user',
          content: `The user usually enjoys ${userPreferredCuisines.join(', ')} cuisine. Adventurousness score: ${adventurenessScore} (0=conservative, 1=adventurous).
Dish "${dishName}" is ${cuisineTags.join('/')} cuisine. ${isOutsideComfortZone ? "It's outside their usual preferences." : 'It matches their taste.'}
Write one warm, encouraging sentence about this dish. No quotes.`,
        },
      ],
    });
    const msg = response as Anthropic.Messages.Message;
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    return text.trim() || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Personalized Dish Recommendation Engine
// ─────────────────────────────────────────────

function scoreDishAgainstPreferences(
  dish: DishInsight,
  prefs: UserPreferences | null,
  recentRatings: { dish_name: string; star_rating: number; feedback_category: string }[],
  adventurousnessScore: number,
  orderHistory: { restaurant_name: string; dishes_ordered: string[] }[],
  savedItems: { item_type: string; dish_name?: string; place_id?: string }[],
  restaurantName: string
): { matchScore: number; popularityScore: number; isBold: boolean; orderedBefore: boolean } {
  // Base popularity from sentiment
  const popularityScore = Math.round(((dish.sentiment_score + 1) / 2) * 100);

  const dishNameLower = dish.dish_name.toLowerCase();
  
  // Order history check
  const pastOrdersHere = orderHistory.find(o => o.restaurant_name === restaurantName);
  let orderedBefore = false;
  if (pastOrdersHere && pastOrdersHere.dishes_ordered) {
    orderedBefore = pastOrdersHere.dishes_ordered.some(d => dishNameLower.includes(d.toLowerCase()));
  }

  if (!prefs) {
    // No preferences — fall back to pure popularity
    return { matchScore: orderedBefore ? 85 : 70, popularityScore, isBold: false, orderedBefore };
  }

  let matchScore = 70; // default neutral

  // Spice-level matching via cuisine_tags
  const isSpicy = dish.cuisine_tags.some(t =>
    ['spicy', 'hot', 'szechuan', 'thai', 'korean', 'buffalo'].includes(t.toLowerCase())
  );
  if (isSpicy) {
    const spiceAffinity = prefs.spice_level / 10;
    matchScore += (spiceAffinity - 0.5) * 40; // -20 to +20
  }

  // Flavor profile matching
  const flavors = prefs.flavor_profiles as Record<string, number>;
  for (const tag of dish.cuisine_tags) {
    const tagLow = tag.toLowerCase();
    if (flavors[tagLow] !== undefined) {
      matchScore += (flavors[tagLow] - 0.5) * 20;
    }
  }

  // Texture preference matching
  const textures = prefs.texture_preferences as Record<string, number>;
  for (const tag of dish.cuisine_tags) {
    const tagLow = tag.toLowerCase();
    if (textures[tagLow] !== undefined) {
      matchScore += (textures[tagLow] - 0.5) * 15;
    }
  }

  // Disliked ingredients penalty
  for (const ingredient of prefs.disliked_ingredients) {
    if (dishNameLower.includes(ingredient.toLowerCase())) {
      matchScore -= 30;
    }
  }

  // Dietary Restrictions
  const checkDietary = (keywords: string[]) => {
    return keywords.some(k => 
      dishNameLower.includes(k) || 
      (dish.ai_summary && dish.ai_summary.toLowerCase().includes(k)) || 
      (dish.cuisine_tags && dish.cuisine_tags.some(t => t.toLowerCase().includes(k)))
    );
  };

  if (prefs.dietary_restrictions.includes('Vegetarian')) {
    if (checkDietary(['chicken', 'beef', 'pork', 'meat', 'bacon', 'steak', 'fish', 'shrimp', 'seafood', 'lamb', 'prosciutto', 'duck', 'tonkotsu', 'bone broth', 'pepperoni', 'sausage'])) {
      matchScore -= 60; // Massive penalty for meat
    }
  }
  
  if (prefs.dietary_restrictions.includes('Vegan')) {
    if (checkDietary(['chicken', 'beef', 'pork', 'meat', 'bacon', 'steak', 'fish', 'shrimp', 'seafood', 'lamb', 'prosciutto', 'duck', 'tonkotsu', 'bone broth', 'pepperoni', 'sausage', 'cheese', 'milk', 'dairy', 'egg', 'honey', 'cream', 'butter', 'whey'])) {
      matchScore -= 60;
    }
  }
  
  if (prefs.dietary_restrictions.includes('Gluten-Free')) {
    if (checkDietary(['bread', 'bun', 'flour', 'pasta', 'noodle', 'wheat', 'crust', 'pita', 'tempura'])) {
      matchScore -= 40;
    }
  }

  if (prefs.dietary_restrictions.includes('Dairy-Free')) {
    if (checkDietary(['cheese', 'milk', 'dairy', 'cream', 'butter', 'whey'])) {
      matchScore -= 40;
    }
  }

  if (prefs.dietary_restrictions.includes('Nut-Free')) {
    if (checkDietary(['nut', 'peanut', 'almond', 'cashew', 'pecan', 'walnut', 'macadamia'])) {
      matchScore -= 40;
    }
  }

  if (prefs.dietary_restrictions.includes('Egg-Free')) {
    if (checkDietary(['egg', 'mayo', 'meringue', 'custard'])) {
      matchScore -= 40;
    }
  }

  // Boost from prior positive ratings of similar dishes
  const positiveRated = recentRatings.filter(r =>
    (r.feedback_category === 'loved_it' || r.feedback_category === 'liked_it') &&
    r.dish_name.toLowerCase().split(' ').some(w =>
      w.length > 3 && dishNameLower.includes(w)
    )
  );
  matchScore += Math.min(positiveRated.length * 10, 20);

  // Penalty from prior negative ratings
  const negativeRated = recentRatings.filter(r =>
    (r.feedback_category === 'didnt_like' || r.feedback_category === 'hated_it') &&
    r.dish_name.toLowerCase().split(' ').some(w =>
      w.length > 3 && dishNameLower.includes(w)
    )
  );
  matchScore -= Math.min(negativeRated.length * 15, 30);

  // Boost from Order History
  if (orderedBefore) {
    matchScore += 25;
  }

  // Boost from Saved Items
  const savedDishes = savedItems.filter(s => s.item_type === 'dish' && s.dish_name);
  if (savedDishes.some(s => dishNameLower.includes(s.dish_name!.toLowerCase()))) {
    matchScore += 15;
  }

  matchScore = Math.max(0, Math.min(100, matchScore));

  // "Bold" = very popular but low match score AND not ordered before
  const isBold = popularityScore >= 80 && matchScore < 60 && !orderedBefore;

  return { matchScore, popularityScore, isBold, orderedBefore };
}

export async function generatePersonalizedRecommendations(params: {
  userPreferences: UserPreferences | null;
  adventurousnessScore: number;
  orderHistory: { restaurant_name: string; dishes_ordered: string[] }[];
  savedItems: { item_type: string; dish_name?: string; place_id?: string }[];
  dishes: DishInsight[];
  categories: string[];
  restaurantName: string;
  recentRatings: { dish_name: string; star_rating: number; feedback_category: string }[];
}): Promise<DishRecommendation[]> {
  const { userPreferences, adventurousnessScore, orderHistory, savedItems, dishes, categories, restaurantName, recentRatings } = params;

  // Filter by requested categories if any are provided
  let filteredDishes = dishes;
  if (categories && categories.length > 0) {
    const requestedLower = categories.map(c => c.toLowerCase().replace(/s$/, '')); // handle 'Entrees' vs 'Entree'
    filteredDishes = dishes.filter(d =>
      d.cuisine_tags?.some(tag => {
        const t = tag.toLowerCase();
        return requestedLower.some(req => t.includes(req) || req.includes(t));
      })
    );
    // fallback if filtering removed everything (e.g. AI failed to tag)
    if (filteredDishes.length === 0) {
      filteredDishes = dishes;
    }
  }

  // Score every dish
  const scored = filteredDishes.map((dish) => {
    const { matchScore, popularityScore, isBold, orderedBefore } = scoreDishAgainstPreferences(
      dish,
      userPreferences,
      recentRatings,
      adventurousnessScore,
      orderHistory,
      savedItems,
      restaurantName
    );
    
    // Dynamic weighting based on adventurousness
    // adventurousnessScore is 0-1. 
    // high adventure -> 60% popularity, 40% match
    // low adventure -> 10% popularity, 90% match
    const matchWeight = 0.9 - (adventurousnessScore * 0.5);
    const popWeight = 1.0 - matchWeight;
    
    const finalScore = Math.round(matchScore * matchWeight + popularityScore * popWeight);
    return {
      dish,
      matchScore,
      popularityScore,
      finalScore,
      isBold,
      orderedBefore,
    };
  });

  // Filter out any dishes that received massive penalties (e.g. dietary violations)
  const viableScored = scored.filter(d => d.matchScore >= 30);

  // Sort by final score descending
  viableScored.sort((a, b) => b.finalScore - a.finalScore);

  // Take top 5 non-bold + up to 1 bold
  const top = viableScored.filter(d => !d.isBold).slice(0, 5);
  const boldPick = viableScored.find(d => d.isBold);
  const toExplain = boldPick ? [...top.slice(0, 4), boldPick] : top.slice(0, 4);

  if (toExplain.length === 0) {
    return [];
  }

  // Build Claude prompt for explanations
  const prefSummary = userPreferences
    ? `Spice tolerance: ${userPreferences.spice_level}/10. Dietary: ${userPreferences.dietary_restrictions.join(', ') || 'none'}. Dislikes: ${userPreferences.disliked_ingredients.join(', ') || 'none'}.`
    : 'No preference data available.';

  const dishList = toExplain.map((d, i) =>
    `${i + 1}. "${d.dish.dish_name}" (match: ${d.matchScore}%, popularity: ${d.popularityScore}%)${d.isBold ? ' [BOLD PICK - explicitly tell them to be adventurous and try this outside their comfort zone!]' : ''}${d.orderedBefore ? ' [ORDERED BEFORE - remind them they ordered this last time here!]' : ''}`
  ).join('\n');

  const prompt = `You are writing concise dish recommendation explanations for DishRadar, a restaurant discovery app.

Restaurant: ${restaurantName}
User preferences: ${prefSummary}

For each dish below, write EXACTLY ONE sentence explaining why we recommend it. Be specific, warm, and conversational. 
If it is a [BOLD PICK], acknowledge it might be outside their comfort zone but tell them to be adventurous. 
If it is [ORDERED BEFORE], remind them they loved it last time.

Dishes:
${dishList}

Respond with a JSON array of strings, one explanation per dish, in the same order. Example:
["This dish matches your love of crispy textures and savory flavors.", "Though spicier than you usually go, regulars call it the restaurant's crown jewel."]`;

  let explanations: string[] = toExplain.map(() => 'A crowd favorite at this restaurant.');

  try {
    const response = await callClaude({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const msg = response as Anthropic.Messages.Message;
    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      explanations = JSON.parse(jsonMatch[0]) as string[];
    }
  } catch (e) {
    console.warn('Claude explanation failed, using fallback:', e);
  }

  return toExplain.map((d, i) => ({
    dish_name: d.dish.dish_name,
    category: 'unknown' as const,
    match_score: d.matchScore,
    popularity_score: d.popularityScore,
    final_score: d.finalScore,
    explanation: explanations[i] || 'A popular choice at this restaurant.',
    is_bold: d.isBold,
    price_estimate: d.dish.price_estimate,
    sentiment_score: d.dish.sentiment_score,
  }));
}