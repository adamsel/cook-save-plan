import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Recipe, Ingredient, MealType, RecipeNutrition, ImportMethod } from '@/types/recipe';

interface CreatorProfile {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  username: string;
  bio: string | null;
}

interface SharedMealPlanSummary {
  id: string;
  shareSlug: string;
  title: string | null;
  description: string | null;
  weekStartDate: string;
  itemCount: number;
  previewImageUrl: string | null;
}

export function useCreatorProfile(username: string | undefined) {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [sharedMealPlans, setSharedMealPlans] = useState<SharedMealPlanSummary[]>([]);
  const [publicRecipes, setPublicRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setIsLoading(false);
      setError('No username provided');
      return;
    }

    fetchCreatorProfile(username);
  }, [username]);

  const fetchCreatorProfile = async (uname: string) => {
    setIsLoading(true);
    setError(null);

    // 1. Fetch the creator's profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, username, bio, is_creator')
      .eq('username', uname)
      .eq('is_creator', true)
      .single();

    if (profileError || !profileData) {
      setError('Creator not found');
      setIsLoading(false);
      return;
    }

    setProfile({
      userId: profileData.user_id,
      displayName: profileData.display_name,
      avatarUrl: profileData.avatar_url,
      username: profileData.username!,
      bio: profileData.bio,
    });

    // 2. Fetch their shared meal plans
    const { data: plansData } = await supabase
      .from('meal_plans')
      .select('id, share_slug, title, description, week_start_date, is_shared')
      .eq('user_id', profileData.user_id)
      .eq('is_shared', true)
      .order('week_start_date', { ascending: false });

    if (plansData) {
      // Get item counts for each plan
      const planIds = plansData.map(p => p.id);
      const { data: itemsData } = await supabase
        .from('meal_plan_items')
        .select('meal_plan_id')
        .in('meal_plan_id', planIds);

      const itemCounts = new Map<string, number>();
      (itemsData || []).forEach(item => {
        itemCounts.set(item.meal_plan_id, (itemCounts.get(item.meal_plan_id) || 0) + 1);
      });

      // Fetch a preview image for each plan (first recipe with an image)
      const { data: recipeImageData } = await supabase
        .from('meal_plan_items')
        .select('meal_plan_id, recipes(image_url)')
        .in('meal_plan_id', planIds);

      const planImageMap = new Map<string, string>();
      (recipeImageData || []).forEach((item: { meal_plan_id: string; recipes: { image_url: string | null } | null }) => {
        if (!planImageMap.has(item.meal_plan_id) && item.recipes?.image_url) {
          planImageMap.set(item.meal_plan_id, item.recipes.image_url);
        }
      });

      setSharedMealPlans(plansData.map(p => ({
        id: p.id,
        shareSlug: p.share_slug!,
        title: p.title,
        description: p.description,
        weekStartDate: p.week_start_date,
        itemCount: itemCounts.get(p.id) || 0,
        previewImageUrl: planImageMap.get(p.id) || null,
      })));
    }

    // 3. Fetch their public recipes
    const { data: recipesData } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', profileData.user_id)
      .eq('is_public', true)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (recipesData) {
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
        isPublic: true,
        cuisine: r.cuisine || undefined,
        dietary: r.dietary || [],
        mealTypes: (r.meal_types as MealType[]) || [],
        author: r.author || undefined,
        nutrition: r.nutrition as RecipeNutrition | undefined,
        importMethod: r.import_method as ImportMethod | undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      setPublicRecipes(mappedRecipes);
    }

    setIsLoading(false);
  };

  const refetch = () => {
    if (username) fetchCreatorProfile(username);
  };

  const removeMealPlan = (planId: string) => {
    setSharedMealPlans(prev => prev.filter(p => p.id !== planId));
  };

  const removeRecipe = (recipeId: string) => {
    setPublicRecipes(prev => prev.filter(r => r.id !== recipeId));
  };

  return { profile, sharedMealPlans, publicRecipes, isLoading, error, refetch, removeMealPlan, removeRecipe };
}
