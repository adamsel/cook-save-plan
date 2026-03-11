import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Nutrition Lookup Edge Function
 *
 * Uses USDA FoodData Central API to look up nutrition data for ingredients.
 * API key is stored as a Supabase secret (USDA_API_KEY).
 * Free tier: 3,600 requests/hour. Register at https://api.data.gov
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache (10-minute TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  if (cache.size > 200) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

interface IngredientInput {
  item: string;
  quantity: number | null;
  unit: string;
}

interface NutrientData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturatedFat: number;
  cholesterol: number;
}

interface IngredientNutrition {
  item: string;
  matchedFood: string;
  confidence: number; // 0-1, how well the USDA match is
  nutrientsPer100g: NutrientData;
}

// Map USDA nutrient IDs to our fields
const NUTRIENT_MAP: Record<number, keyof NutrientData> = {
  1008: "calories", // Energy (kcal)
  1003: "protein", // Protein
  1005: "carbs", // Carbohydrate
  1004: "fat", // Total lipid (fat)
  1079: "fiber", // Fiber, total dietary
  2000: "sugar", // Sugars, total
  1093: "sodium", // Sodium (mg)
  1258: "saturatedFat", // Fatty acids, total saturated
  1253: "cholesterol", // Cholesterol (mg)
};

async function lookupIngredient(
  item: string,
  apiKey: string,
): Promise<IngredientNutrition | null> {
  // Check cache
  const cacheKey = item.toLowerCase().trim();
  const cached = getFromCache<IngredientNutrition>(cacheKey);
  if (cached) return cached;

  // Search USDA FoodData Central
  const searchUrl = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  searchUrl.searchParams.set("api_key", apiKey);
  searchUrl.searchParams.set("query", item);
  searchUrl.searchParams.set("pageSize", "3");
  // Prefer Foundation and SR Legacy data types (most accurate for whole foods)
  searchUrl.searchParams.set("dataType", "Foundation,SR Legacy");

  const response = await fetch(searchUrl.toString());
  if (!response.ok) {
    console.error(`USDA API error for "${item}":`, response.status);
    return null;
  }

  const data = await response.json();

  if (!data.foods || data.foods.length === 0) {
    // Retry with broader data types
    searchUrl.searchParams.set("dataType", "Foundation,SR Legacy,Survey (FNDDS)");
    const retryResponse = await fetch(searchUrl.toString());
    if (!retryResponse.ok) return null;
    const retryData = await retryResponse.json();
    if (!retryData.foods || retryData.foods.length === 0) return null;
    data.foods = retryData.foods;
  }

  const bestMatch = data.foods[0];

  // Extract nutrients per 100g
  const nutrients: NutrientData = {
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

  if (bestMatch.foodNutrients) {
    for (const nutrient of bestMatch.foodNutrients) {
      const field = NUTRIENT_MAP[nutrient.nutrientId];
      if (field && typeof nutrient.value === "number") {
        nutrients[field] = nutrient.value;
      }
    }
  }

  // Calculate confidence based on USDA's score
  const confidence = bestMatch.score
    ? Math.min(1, bestMatch.score / 500)
    : 0.5;

  const result: IngredientNutrition = {
    item,
    matchedFood: bestMatch.description || item,
    confidence,
    nutrientsPer100g: nutrients,
  };

  setCache(cacheKey, result);
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("USDA_API_KEY");
    if (!apiKey) {
      // Fall back to demo key (limited)
      console.warn("USDA_API_KEY not configured, using DEMO_KEY");
    }
    const key = apiKey || "DEMO_KEY";

    const { ingredients } = (await req.json()) as {
      ingredients: IngredientInput[];
    };

    if (!ingredients || !Array.isArray(ingredients)) {
      return new Response(
        JSON.stringify({ error: "ingredients array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Look up each ingredient (batch, max 20)
    const lookupItems = ingredients.slice(0, 20);
    const results = await Promise.all(
      lookupItems.map((ing) => lookupIngredient(ing.item, key)),
    );

    // Filter out failed lookups
    const nutritionData = results.map((result, i) => ({
      input: lookupItems[i],
      nutrition: result,
    }));

    return new Response(JSON.stringify({ data: nutritionData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Nutrition lookup error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
