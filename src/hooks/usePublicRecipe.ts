import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Recipe, Ingredient, MealType, RecipeNutrition, ImportMethod } from '@/types/recipe';

interface CreatorInfo {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
}

export function usePublicRecipe(recipeId: string | undefined) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipeId) {
      setIsLoading(false);
      setError('No recipe ID provided');
      return;
    }

    fetchPublicRecipe(recipeId);
  }, [recipeId]);

  const fetchPublicRecipe = async (id: string) => {
    setIsLoading(true);
    setError(null);

    // Fetch the recipe — must be public
    const { data: r, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .single();

    if (recipeError || !r) {
      setError('Recipe not found or is not publicly shared');
      setIsLoading(false);
      return;
    }

    setRecipe({
      id: r.id,
      title: r.title,
      sourceUrl: r.source_url || undefined,
      imageUrl: r.image_url || undefined,
      description: r.description || undefined,
      category: r.category || '',
      tags: r.tags || [],
      prepTime: r.prep_time || undefined,
      cookTime: r.cook_time || undefined,
      totalTime: r.total_time || undefined,
      servings: r.servings,
      ingredients: (r.ingredients as unknown as Ingredient[]) || [],
      instructions: r.instructions || [],
      isFavorite: false,
      isArchived: false,
      isPublic: true,
      cuisine: r.cuisine || undefined,
      dietary: r.dietary || [],
      mealTypes: (r.meal_types as MealType[]) || [],
      author: r.author || undefined,
      nutrition: r.nutrition as RecipeNutrition | undefined,
      importMethod: r.import_method as ImportMethod | undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });

    // Fetch creator profile
    if (r.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, username')
        .eq('user_id', r.user_id)
        .single();

      if (profileData) {
        setCreator({
          userId: profileData.user_id,
          displayName: profileData.display_name,
          avatarUrl: profileData.avatar_url,
          username: profileData.username,
        });
      }
    }

    setIsLoading(false);
  };

  return { recipe, creator, isLoading, error };
}
