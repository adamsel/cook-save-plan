import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Spoonacular Recipe Search Edge Function
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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache with 10-minute TTL
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(params: Record<string, string | undefined>): string {
  return JSON.stringify(params);
}

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

interface SpoonacularSearchResult {
  id: number;
  title: string;
  image: string;
  imageType: string;
  readyInMinutes?: number;
  servings?: number;
}

interface SpoonacularSearchResponse {
  results: SpoonacularSearchResult[];
  offset: number;
  number: number;
  totalResults: number;
}

interface NormalizedRecipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number | null;
  servings: number | null;
}

function normalizeSearchResults(results: SpoonacularSearchResult[]): NormalizedRecipe[] {
  return results.map((r) => ({
    id: r.id,
    title: r.title,
    image: r.image,
    readyInMinutes: r.readyInMinutes ?? null,
    servings: r.servings ?? null,
  }));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const params = {
      query: url.searchParams.get("query") || undefined,
      includeIngredients: url.searchParams.get("includeIngredients") || undefined,
      excludeIngredients: url.searchParams.get("excludeIngredients") || undefined,
      diet: url.searchParams.get("diet") || undefined,
      intolerances: url.searchParams.get("intolerances") || undefined,
      maxReadyTime: url.searchParams.get("maxReadyTime") || undefined,
      number: url.searchParams.get("number") || "12",
    };

    // Check cache first
    const cacheKey = getCacheKey(params);
    const cachedData = getFromCache<{ results: NormalizedRecipe[]; totalResults: number }>(cacheKey);
    if (cachedData) {
      console.log("Cache hit for search:", params.query);
      return new Response(
        JSON.stringify(cachedData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Spoonacular API URL
    const spoonacularUrl = new URL("https://api.spoonacular.com/recipes/complexSearch");
    spoonacularUrl.searchParams.set("apiKey", apiKey);
    spoonacularUrl.searchParams.set("addRecipeInformation", "true");
    
    if (params.query) spoonacularUrl.searchParams.set("query", params.query);
    if (params.includeIngredients) spoonacularUrl.searchParams.set("includeIngredients", params.includeIngredients);
    if (params.excludeIngredients) spoonacularUrl.searchParams.set("excludeIngredients", params.excludeIngredients);
    if (params.diet) spoonacularUrl.searchParams.set("diet", params.diet);
    if (params.intolerances) spoonacularUrl.searchParams.set("intolerances", params.intolerances);
    if (params.maxReadyTime) spoonacularUrl.searchParams.set("maxReadyTime", params.maxReadyTime);
    spoonacularUrl.searchParams.set("number", params.number);

    console.log("Fetching from Spoonacular:", spoonacularUrl.pathname + spoonacularUrl.search.replace(apiKey, "***"));

    const response = await fetch(spoonacularUrl.toString());
    
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

    const data: SpoonacularSearchResponse = await response.json();
    
    const result = {
      results: normalizeSearchResults(data.results),
      totalResults: data.totalResults,
    };

    // Cache the result
    setCache(cacheKey, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
