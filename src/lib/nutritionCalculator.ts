// Nutrition calculator that uses USDA FoodData Central data
// to compute per-serving nutrition from a recipe's ingredients

import { supabase } from '@/integrations/supabase/client';
import type { Ingredient, RecipeNutrition, NutritionInfo } from '@/types/recipe';
import { normalizeUnit, formatQuantityString } from '@/lib/ingredientNormalizer';
import { UNIT_CONVERSIONS } from '@/lib/ingredientNormalizer/unitConversion';

// Common ingredient weights in grams (for converting "1 onion" → grams)
const AVERAGE_WEIGHTS: Record<string, number> = {
  'onion': 150,
  'red onion': 150,
  'garlic': 5,        // per clove
  'egg': 50,
  'banana': 120,
  'apple': 180,
  'lemon': 60,
  'lime': 45,
  'orange': 130,
  'potato': 170,
  'sweet potato': 130,
  'tomato': 125,
  'avocado': 150,
  'carrot': 70,
  'celery': 40,       // per stalk
  'cucumber': 200,
  'bell pepper': 150,
  'chicken breast': 175,
  'chicken thigh': 120,
  'bacon': 30,        // per slice/strip
  'sausage': 100,     // per link
  'tortilla': 50,
  'bread': 30,        // per slice
};

// Volume to weight approximations (ml → g) for generic ingredients
// (used when VOLUME_TO_WEIGHT in unitConversion.ts doesn't have the item)
const GENERIC_DENSITY = 1.0; // Default: water density (1ml ≈ 1g)

interface NutrientLookupResult {
  item: string;
  matchedFood: string;
  confidence: number;
  nutrientsPer100g: NutritionInfo & { sugar: number; sodium: number; saturatedFat: number; cholesterol: number };
}

interface IngredientNutritionBreakdown {
  ingredient: Ingredient;
  matchedFood: string | null;
  confidence: number;
  gramsUsed: number;
  nutrients: NutritionInfo;
}

/**
 * Convert an ingredient's quantity + unit to grams
 */
function ingredientToGrams(ingredient: Ingredient): number {
  const { quantity, unit, item } = ingredient;

  if (quantity === null || quantity === 0) {
    // No quantity — try average weight
    const avgWeight = getAverageWeight(item);
    return avgWeight || 0; // Skip if we can't determine weight
  }

  const normalizedUnit = normalizeUnit(unit);
  const unitInfo = UNIT_CONVERSIONS[normalizedUnit];

  if (!unitInfo) {
    // Unknown unit, assume 1 item = average weight
    const avgWeight = getAverageWeight(item);
    return avgWeight ? quantity * avgWeight : 0;
  }

  if (unitInfo.type === 'weight') {
    // Already weight — convert to grams
    return quantity * unitInfo.toBase;
  }

  if (unitInfo.type === 'volume') {
    // Volume — convert to ml, then approximate to grams
    const ml = quantity * unitInfo.toBase;
    return ml * GENERIC_DENSITY; // Rough approximation
  }

  if (unitInfo.type === 'count' || unitInfo.type === 'container') {
    // Count/container — use average weight
    const avgWeight = getAverageWeight(item);
    return avgWeight ? quantity * avgWeight : 0;
  }

  return 0;
}

function getAverageWeight(item: string): number | null {
  const lower = item.toLowerCase().trim();

  // Exact match
  if (AVERAGE_WEIGHTS[lower]) return AVERAGE_WEIGHTS[lower];

  // Partial match
  for (const [key, weight] of Object.entries(AVERAGE_WEIGHTS)) {
    if (lower.includes(key)) return weight;
  }

  return null;
}

/**
 * Calculate nutrition for a list of ingredients using USDA data.
 * Calls the nutrition-lookup edge function for USDA matches.
 */
export async function calculateNutrition(
  ingredients: Ingredient[],
  servings: number,
): Promise<{
  nutrition: RecipeNutrition;
  breakdown: IngredientNutritionBreakdown[];
}> {
  // Filter out empty ingredients
  const validIngredients = ingredients.filter(
    (ing) => ing.item && ing.item.trim(),
  );

  if (validIngredients.length === 0) {
    throw new Error('No valid ingredients to calculate nutrition for');
  }

  // Call the edge function to look up USDA data
  const { data, error } = await supabase.functions.invoke('nutrition-lookup', {
    body: {
      ingredients: validIngredients.map((ing) => ({
        item: ing.item,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    },
  });

  if (error) {
    throw new Error(`Nutrition lookup failed: ${error.message}`);
  }

  const lookupResults: Array<{
    input: { item: string; quantity: number | null; unit: string };
    nutrition: NutrientLookupResult | null;
  }> = data?.data || [];

  // Calculate per-ingredient and total nutrition
  const totals: NutritionInfo = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    saturatedFat: 0,
    cholesterol: 0,
  };

  let totalConfidence = 0;
  let matchedCount = 0;

  const breakdown: IngredientNutritionBreakdown[] = validIngredients.map(
    (ingredient, i) => {
      const lookup = lookupResults[i];
      const gramsUsed = ingredientToGrams(ingredient);
      const nutrients: NutritionInfo = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        saturatedFat: 0,
        cholesterol: 0,
      };

      if (lookup?.nutrition && gramsUsed > 0) {
        const per100g = lookup.nutrition.nutrientsPer100g;
        const factor = gramsUsed / 100;

        nutrients.calories = Math.round(per100g.calories * factor);
        nutrients.protein = Math.round(per100g.protein * factor * 10) / 10;
        nutrients.carbs = Math.round(per100g.carbs * factor * 10) / 10;
        nutrients.fat = Math.round(per100g.fat * factor * 10) / 10;
        nutrients.fiber = Math.round((per100g.fiber || 0) * factor * 10) / 10;
        nutrients.sugar = Math.round((per100g.sugar || 0) * factor * 10) / 10;
        nutrients.sodium = Math.round((per100g.sodium || 0) * factor);
        nutrients.saturatedFat =
          Math.round((per100g.saturatedFat || 0) * factor * 10) / 10;
        nutrients.cholesterol = Math.round(
          (per100g.cholesterol || 0) * factor,
        );

        // Add to totals
        for (const key of Object.keys(nutrients) as (keyof NutritionInfo)[]) {
          (totals[key] as number) += nutrients[key] || 0;
        }

        totalConfidence += lookup.nutrition.confidence;
        matchedCount++;
      }

      return {
        ingredient,
        matchedFood: lookup?.nutrition?.matchedFood || null,
        confidence: lookup?.nutrition?.confidence || 0,
        gramsUsed,
        nutrients,
      };
    },
  );

  // Calculate per-serving values
  const perServing: NutritionInfo = {
    calories: Math.round(totals.calories / servings),
    protein: Math.round((totals.protein / servings) * 10) / 10,
    carbs: Math.round((totals.carbs / servings) * 10) / 10,
    fat: Math.round((totals.fat / servings) * 10) / 10,
    fiber: Math.round((totals.fiber! / servings) * 10) / 10,
    sugar: Math.round((totals.sugar! / servings) * 10) / 10,
    sodium: Math.round(totals.sodium! / servings),
    saturatedFat: Math.round((totals.saturatedFat! / servings) * 10) / 10,
    cholesterol: Math.round(totals.cholesterol! / servings),
  };

  // Average confidence across matched ingredients
  const avgConfidence = matchedCount > 0 ? totalConfidence / matchedCount : 0;
  const matchRatio = matchedCount / validIngredients.length;

  // Determine overall confidence level
  let confidence: 'High' | 'Medium' | 'Low';
  if (avgConfidence > 0.7 && matchRatio > 0.8) {
    confidence = 'High';
  } else if (avgConfidence > 0.4 && matchRatio > 0.5) {
    confidence = 'Medium';
  } else {
    confidence = 'Low';
  }

  const nutrition: RecipeNutrition = {
    perServing,
    source: 'calculated',
    confidence,
    verified: perServing.calories <= 1500,
    notes: `Calculated from ${matchedCount}/${validIngredients.length} ingredients using USDA data`,
  };

  return { nutrition, breakdown };
}
