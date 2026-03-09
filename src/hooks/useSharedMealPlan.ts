import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Recipe, Ingredient, MealPlanItem, MealType, RecipeNutrition, ImportMethod, LeftoverPositionEntry } from '@/types/recipe';

interface SharedMealPlan {
  id: string;
  weekStartDate: string;
  title: string | null;
  description: string | null;
  items: MealPlanItem[];
}

interface CreatorInfo {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  username: string | null;
  coverImageUrl: string | null;
  coverImagePosition: number;
}

export function useSharedMealPlan(shareSlug: string | undefined) {
  const [mealPlan, setMealPlan] = useState<SharedMealPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareSlug) {
      setIsLoading(false);
      setError('No share link provided');
      return;
    }

    fetchSharedPlan(shareSlug);
  }, [shareSlug]);

  const fetchSharedPlan = async (slug: string) => {
    setIsLoading(true);
    setError(null);

    // 1. Fetch the meal plan by share_slug
    const { data: planData, error: planError } = await supabase
      .from('meal_plans')
      .select('id, user_id, week_start_date, title, description, is_shared, share_slug')
      .eq('share_slug', slug)
      .eq('is_shared', true)
      .single();

    if (planError || !planData) {
      setError('Meal plan not found or is no longer shared');
      setIsLoading(false);
      return;
    }

    // 2. Fetch meal plan items
    const { data: itemsData, error: itemsError } = await supabase
      .from('meal_plan_items')
      .select('*')
      .eq('meal_plan_id', planData.id);

    if (itemsError) {
      setError('Failed to load meal plan items');
      setIsLoading(false);
      return;
    }

    const items: MealPlanItem[] = (itemsData || []).map(item => ({
      id: item.id,
      recipeId: item.recipe_id,
      day: item.day,
      mealSlot: item.meal_slot as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      servingsMultiplier: Number(item.servings_multiplier),
      leftoverMeals: Number(item.leftover_meals || 0),
      leftoverPositions: (item.leftover_positions as LeftoverPositionEntry[]) || [],
      notes: item.notes || undefined,
    }));

    // 3. Fetch all referenced recipes
    const recipeIds = [...new Set(items.map(i => i.recipeId))];
    if (recipeIds.length > 0) {
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds);

      if (!recipesError && recipesData) {
        const mappedRecipes: Recipe[] = recipesData.map(r => ({
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
          isPublic: r.is_public,
          cuisine: r.cuisine || undefined,
          dietary: r.dietary || [],
          mealTypes: (r.meal_types as MealType[]) || [],
          author: r.author || undefined,
          nutrition: r.nutrition as RecipeNutrition | undefined,
          importMethod: r.import_method as ImportMethod | undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        setRecipes(mappedRecipes);
      }
    }

    // 4. Fetch creator profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, username, cover_image_url, cover_image_position')
      .eq('user_id', planData.user_id)
      .single();

    if (profileData) {
      setCreator({
        userId: profileData.user_id,
        displayName: profileData.display_name,
        avatarUrl: profileData.avatar_url,
        username: profileData.username,
        coverImageUrl: profileData.cover_image_url,
        coverImagePosition: profileData.cover_image_position ?? 50,
      });
    }

    setMealPlan({
      id: planData.id,
      weekStartDate: planData.week_start_date,
      title: planData.title,
      description: planData.description,
      items,
    });

    setIsLoading(false);
  };

  return { mealPlan, recipes, creator, isLoading, error };
}
