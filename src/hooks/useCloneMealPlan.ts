import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Recipe, MealPlanItem, Ingredient, RecipeNutrition, MealType, ImportMethod } from '@/types/recipe';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, addWeeks } from 'date-fns';

interface CloneResult {
  mealPlanId: string;
  recipesCloned: number;
  itemsCreated: number;
}

export function useCloneMealPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCloning, setIsCloning] = useState(false);

  const cloneMealPlan = async (
    sourceItems: MealPlanItem[],
    sourceRecipes: Recipe[],
    targetWeekDate: string,
  ): Promise<CloneResult | null> => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need an account to clone meal plans.',
        variant: 'destructive',
      });
      return null;
    }

    setIsCloning(true);

    try {
      // 1. Check which recipes the user already has (by original_recipe_id)
      const sourceRecipeIds = [...new Set(sourceItems.map(i => i.recipeId))];

      const { data: existingRecipes } = await supabase
        .from('recipes')
        .select('id, original_recipe_id')
        .eq('user_id', user.id)
        .in('original_recipe_id', sourceRecipeIds);

      const existingMap = new Map<string, string>();
      (existingRecipes || []).forEach(r => {
        if (r.original_recipe_id) {
          existingMap.set(r.original_recipe_id, r.id);
        }
      });

      // 2. Clone recipes that the user doesn't already have
      const recipeIdMap = new Map<string, string>(); // sourceId -> newId
      let recipesCloned = 0;

      for (const sourceRecipe of sourceRecipes) {
        if (!sourceRecipeIds.includes(sourceRecipe.id)) continue;

        // Already have this recipe?
        const existingId = existingMap.get(sourceRecipe.id);
        if (existingId) {
          recipeIdMap.set(sourceRecipe.id, existingId);
          continue;
        }

        // Clone it
        const { data: newRecipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            user_id: user.id,
            title: sourceRecipe.title,
            source_url: sourceRecipe.sourceUrl || null,
            image_url: sourceRecipe.imageUrl || null,
            description: sourceRecipe.description || null,
            category: sourceRecipe.category || '',
            tags: sourceRecipe.tags || [],
            prep_time: sourceRecipe.prepTime || null,
            cook_time: sourceRecipe.cookTime || null,
            total_time: sourceRecipe.totalTime || null,
            servings: sourceRecipe.servings,
            ingredients: sourceRecipe.ingredients as unknown as Record<string, unknown>[],
            instructions: sourceRecipe.instructions,
            is_favorite: false,
            is_archived: false,
            is_public: false,
            cuisine: sourceRecipe.cuisine || null,
            dietary: sourceRecipe.dietary || [],
            meal_types: sourceRecipe.mealTypes || [],
            author: sourceRecipe.author || null,
            nutrition: sourceRecipe.nutrition as unknown as Record<string, unknown> | null,
            import_method: sourceRecipe.importMethod || null,
            original_recipe_id: sourceRecipe.id,
          })
          .select('id')
          .single();

        if (recipeError || !newRecipe) {
          console.error('Failed to clone recipe:', sourceRecipe.title, recipeError);
          continue;
        }

        recipeIdMap.set(sourceRecipe.id, newRecipe.id);
        recipesCloned++;
      }

      // 3. Get or create the target meal plan
      let { data: targetPlan } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_start_date', targetWeekDate)
        .single();

      if (!targetPlan) {
        const { data: newPlan, error: planError } = await supabase
          .from('meal_plans')
          .insert({ user_id: user.id, week_start_date: targetWeekDate })
          .select('id')
          .single();

        if (planError || !newPlan) {
          toast({
            title: 'Error creating meal plan',
            description: planError?.message || 'Could not create the target meal plan.',
            variant: 'destructive',
          });
          setIsCloning(false);
          return null;
        }
        targetPlan = newPlan;
      }

      // 4. Create meal plan items with mapped recipe IDs
      const itemInserts = sourceItems
        .map(item => {
          const newRecipeId = recipeIdMap.get(item.recipeId);
          if (!newRecipeId) return null;

          return {
            meal_plan_id: targetPlan!.id,
            recipe_id: newRecipeId,
            day: item.day,
            meal_slot: item.mealSlot,
            servings_multiplier: item.servingsMultiplier,
            leftover_meals: item.leftoverMeals,
            leftover_positions: item.leftoverPositions || [],
            notes: item.notes || null,
          };
        })
        .filter(Boolean);

      if (itemInserts.length > 0) {
        const { error: itemsError } = await supabase
          .from('meal_plan_items')
          .insert(itemInserts);

        if (itemsError) {
          toast({
            title: 'Error adding meals',
            description: itemsError.message,
            variant: 'destructive',
          });
          setIsCloning(false);
          return null;
        }
      }

      toast({
        title: 'Meal plan cloned!',
        description: `${recipesCloned} new recipe${recipesCloned !== 1 ? 's' : ''} added and ${itemInserts.length} meal${itemInserts.length !== 1 ? 's' : ''} planned. Your shopping list is ready.`,
      });

      setIsCloning(false);
      return {
        mealPlanId: targetPlan.id,
        recipesCloned,
        itemsCreated: itemInserts.length,
      };
    } catch (err) {
      toast({
        title: 'Clone failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsCloning(false);
      return null;
    }
  };

  // Helper: get the default target week (next Monday)
  const getDefaultTargetWeek = () => {
    return format(
      startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }),
      'yyyy-MM-dd'
    );
  };

  return { cloneMealPlan, isCloning, getDefaultTargetWeek };
}
