import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";

/**
 * Spoonacular Recipe Details Edge Function
 * 
 * SECURITY: The SPOONACULAR_API_KEY is stored as a secret in the backend.
 * It is accessed via Deno.env.get() and NEVER exposed to the client.
 * 
 * To set the API key locally for development:
 *   - Use `supabase secrets set SPOONACULAR_API_KEY=your_key_here`
 * 
 * The key uses the apiKey query parameter as per Spoonacular docs.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache with 10-minute TTL
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
  // Limit cache size to prevent memory issues
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

interface SpoonacularIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  original: string;
}

interface SpoonacularRecipeDetails {
  id: number;
  title: string;
  image: string;
  summary: string;
  instructions: string;
  analyzedInstructions: Array<{
    steps: Array<{
      number: number;
      step: string;
    }>;
  }>;
  extendedIngredients: SpoonacularIngredient[];
  readyInMinutes: number;
  servings: number;
  sourceUrl?: string;
  sourceName?: string;
  cuisines?: string[];
  diets?: string[];
  dishTypes?: string[];
  preparationMinutes?: number;
  cookingMinutes?: number;
  nutrition?: {
    nutrients: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
  };
}

interface NormalizedIngredient {
  name: string;
  amount: number;
  unit: string;
  original: string;
}

interface NormalizedRecipeDetails {
  id: number;
  title: string;
  image: string;
  summary: string;
  instructions: string[];
  extendedIngredients: NormalizedIngredient[];
  readyInMinutes: number;
  servings: number;
  sourceUrl: string | null;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  prepTime: number | null;
  cookTime: number | null;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    saturatedFat?: number;
    cholesterol?: number;
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function normalizeRecipeDetails(recipe: SpoonacularRecipeDetails): NormalizedRecipeDetails {
  // Parse instructions from analyzedInstructions or raw instructions string
  let instructionSteps: string[] = [];
  
  if (recipe.analyzedInstructions?.length > 0) {
    instructionSteps = recipe.analyzedInstructions[0].steps.map(s => s.step);
  } else if (recipe.instructions) {
    // Split by numbered steps or line breaks
    const cleaned = stripHtml(recipe.instructions);
    instructionSteps = cleaned
      .split(/(?:\d+\.\s*|\n)+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  return {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    summary: stripHtml(recipe.summary || ''),
    instructions: instructionSteps,
    extendedIngredients: recipe.extendedIngredients.map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      original: ing.original,
    })),
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings,
    sourceUrl: recipe.sourceUrl || null,
    cuisines: recipe.cuisines || [],
    diets: recipe.diets || [],
    dishTypes: recipe.dishTypes || [],
    prepTime: recipe.preparationMinutes || null,
    cookTime: recipe.cookingMinutes || null,
    nutrition: extractNutrition(recipe),
  };
}

function extractNutrition(recipe: SpoonacularRecipeDetails): NormalizedRecipeDetails['nutrition'] {
  if (!recipe.nutrition?.nutrients?.length) return undefined;

  const find = (name: string) =>
    recipe.nutrition!.nutrients.find(n => n.name.toLowerCase() === name.toLowerCase())?.amount;

  const calories = find('Calories');
  const protein = find('Protein');
  const carbs = find('Carbohydrates');
  const fat = find('Fat');

  if (calories === undefined && protein === undefined) return undefined;

  return {
    calories: Math.round(calories || 0),
    protein: Math.round(protein || 0),
    carbs: Math.round(carbs || 0),
    fat: Math.round(fat || 0),
    fiber: find('Fiber') !== undefined ? Math.round(find('Fiber')!) : undefined,
    sugar: find('Sugar') !== undefined ? Math.round(find('Sugar')!) : undefined,
    sodium: find('Sodium') !== undefined ? Math.round(find('Sodium')!) : undefined,
    saturatedFat: find('Saturated Fat') !== undefined ? Math.round(find('Saturated Fat')!) : undefined,
    cholesterol: find('Cholesterol') !== undefined ? Math.round(find('Cholesterol')!) : undefined,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting - search functions get higher limits
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.SEARCH_FUNCTION);
  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const apiKey = Deno.env.get("SPOONACULAR_API_KEY");
    if (!apiKey) {
      console.error("SPOONACULAR_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Spoonacular API is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const recipeId = url.searchParams.get("id");
    
    if (!recipeId) {
      return new Response(
        JSON.stringify({ error: "Recipe ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate recipe ID is a number
    const id = parseInt(recipeId, 10);
    if (isNaN(id) || id <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid recipe ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache first
    const cacheKey = `recipe-${id}`;
    const cachedData = getFromCache<NormalizedRecipeDetails>(cacheKey);
    if (cachedData) {
      console.log("Cache hit for recipe:", id);
      return new Response(
        JSON.stringify(cachedData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Spoonacular API URL
    const spoonacularUrl = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${apiKey}&includeNutrition=true`;

    console.log("Fetching recipe details from Spoonacular:", id);

    const response = await fetch(spoonacularUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Spoonacular API error:", response.status, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid Spoonacular API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Spoonacular API quota exceeded" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ error: "Recipe not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Spoonacular rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Spoonacular API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: SpoonacularRecipeDetails = await response.json();
    const result = normalizeRecipeDetails(data);

    // Cache the result
    setCache(cacheKey, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recipe details error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
