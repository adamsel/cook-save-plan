import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for searching and fetching recipes from Spoonacular API
 * 
 * All API calls go through backend edge functions to keep the API key secure.
 * The SPOONACULAR_API_KEY is never exposed to the client.
 */

export interface SpoonacularRecipeSearchResult {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number | null;
  servings: number | null;
}

export interface SpoonacularIngredient {
  name: string;
  amount: number;
  unit: string;
  original: string;
}

export interface SpoonacularRecipeDetails {
  id: number;
  title: string;
  image: string;
  summary: string;
  instructions: string[];
  extendedIngredients: SpoonacularIngredient[];
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

export interface SearchParams {
  query?: string;
  includeIngredients?: string;
  excludeIngredients?: string;
  diet?: string;
  intolerances?: string;
  maxReadyTime?: number;
  number?: number;
}

export function useSpoonacularRecipes() {
  const { toast } = useToast();
  
  const [searchResults, setSearchResults] = useState<SpoonacularRecipeSearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<SpoonacularRecipeDetails | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  const searchRecipes = useCallback(async (params: SearchParams) => {
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const searchParams = new URLSearchParams();
      
      if (params.query) searchParams.set('query', params.query);
      if (params.includeIngredients) searchParams.set('includeIngredients', params.includeIngredients);
      if (params.excludeIngredients) searchParams.set('excludeIngredients', params.excludeIngredients);
      if (params.diet) searchParams.set('diet', params.diet);
      if (params.intolerances) searchParams.set('intolerances', params.intolerances);
      if (params.maxReadyTime) searchParams.set('maxReadyTime', params.maxReadyTime.toString());
      if (params.number) searchParams.set('number', params.number.toString());

      const { data, error } = await supabase.functions.invoke('spoonacular-search', {
        body: null,
        headers: {},
      });
      
      // Since we can't pass query params to invoke directly, we need to use fetch
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spoonacular-search?${searchParams.toString()}`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(errorData.error || `Search failed: ${response.status}`);
      }

      const result = await response.json();
      
      setSearchResults(result.results || []);
      setTotalResults(result.totalResults || 0);
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search recipes';
      setSearchError(message);
      toast({
        title: 'Search failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  const getRecipeDetails = useCallback(async (recipeId: number): Promise<SpoonacularRecipeDetails | null> => {
    setIsLoadingDetails(true);
    setDetailsError(null);
    
    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spoonacular-recipe?id=${recipeId}`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load recipe' }));
        throw new Error(errorData.error || `Failed to load recipe: ${response.status}`);
      }

      const result: SpoonacularRecipeDetails = await response.json();
      setSelectedRecipe(result);
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load recipe details';
      setDetailsError(message);
      toast({
        title: 'Failed to load recipe',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoadingDetails(false);
    }
  }, [toast]);

  const clearSelectedRecipe = useCallback(() => {
    setSelectedRecipe(null);
    setDetailsError(null);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setTotalResults(0);
    setSearchError(null);
  }, []);

  // Load popular/random recipes for initial display
  const loadPopularRecipes = useCallback(async () => {
    if (hasLoadedInitial) return;
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      // Search for popular cuisines/meal types to get a good variety
      const popularQueries = ['popular', 'dinner', 'healthy', 'quick', 'easy'];
      const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
      
      const searchParams = new URLSearchParams();
      searchParams.set('query', randomQuery);
      searchParams.set('number', '24');
      searchParams.set('sort', 'popularity');
      
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spoonacular-search?${searchParams.toString()}`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load recipes' }));
        throw new Error(errorData.error || `Failed to load: ${response.status}`);
      }

      const result = await response.json();
      
      setSearchResults(result.results || []);
      setTotalResults(result.totalResults || 0);
      setHasLoadedInitial(true);
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load recipes';
      setSearchError(message);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [hasLoadedInitial]);

  return {
    // Search state
    searchResults,
    totalResults,
    isSearching,
    searchError,
    hasLoadedInitial,
    
    // Details state
    selectedRecipe,
    isLoadingDetails,
    detailsError,
    
    // Actions
    searchRecipes,
    getRecipeDetails,
    clearSelectedRecipe,
    clearSearch,
    loadPopularRecipes,
  };
}
