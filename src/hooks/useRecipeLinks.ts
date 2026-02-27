import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Recipe, RecipeLink, RecipeLinkType, MealPlanItem, IngredientReplacement } from '@/types/recipe';
import { useToast } from '@/hooks/use-toast';

// Database row type
interface DbRecipeLink {
  id: string;
  recipe_id: string;
  linked_recipe_id: string;
  link_type: string;
  created_at: string;
  user_id: string;
  replacements: IngredientReplacement[] | null;
}

// Convert DB row to app type
function dbToRecipeLink(db: DbRecipeLink): RecipeLink {
  return {
    id: db.id,
    recipeId: db.recipe_id,
    linkedRecipeId: db.linked_recipe_id,
    linkType: db.link_type as RecipeLinkType,
    createdAt: db.created_at,
    userId: db.user_id,
    replacements: db.replacements || undefined,
  };
}

interface LinkedRecipeWithDetails {
  link: RecipeLink;
  recipe: Recipe;
}

/**
 * Hook for managing recipe links ("Goes with" feature)
 * Queries are bidirectional - if A links to B, querying B also returns A
 */
export function useRecipeLinks(recipeId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [linkedRecipes, setLinkedRecipes] = useState<LinkedRecipeWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Refs to prevent duplicate fetches and track current recipeId
  const fetchInProgressRef = useRef(false);
  const currentRecipeIdRef = useRef<string | undefined>(recipeId);

  // Fetch linked recipes for a specific recipe (bidirectional)
  const fetchLinkedRecipes = useCallback(async (targetRecipeId?: string) => {
    const fetchId = targetRecipeId ?? recipeId;

    if (!user || !fetchId) {
      setLinkedRecipes([]);
      setHasLoaded(true);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate concurrent fetches for the same recipe
    if (fetchInProgressRef.current && currentRecipeIdRef.current === fetchId) {
      return;
    }

    fetchInProgressRef.current = true;
    setIsLoading(true);

    try {
      // Get links where this recipe is either the source OR the target
      const { data: linksData, error: linksError } = await supabase
        .from('recipe_links')
        .select('*')
        .or(`recipe_id.eq.${fetchId},linked_recipe_id.eq.${fetchId}`)
        .eq('user_id', user.id);

      // Check if recipeId changed during the fetch - if so, abort
      if (currentRecipeIdRef.current !== fetchId) {
        return;
      }

      if (linksError) {
        console.error('Error fetching recipe links:', linksError);
        setLinkedRecipes([]);
        return;
      }

      if (!linksData || linksData.length === 0) {
        setLinkedRecipes([]);
        return;
      }

      // Get the IDs of linked recipes (the "other" recipe in each link)
      const linkedRecipeIds = linksData.map(link =>
        link.recipe_id === fetchId ? link.linked_recipe_id : link.recipe_id
      );

      // Fetch the actual recipe data
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .in('id', linkedRecipeIds);

      // Check again if recipeId changed during the second fetch
      if (currentRecipeIdRef.current !== fetchId) {
        return;
      }

      if (recipesError) {
        console.error('Error fetching linked recipe details:', recipesError);
        setLinkedRecipes([]);
        return;
      }

      // Combine links with recipe data
      const combined: LinkedRecipeWithDetails[] = linksData.map(dbLink => {
        const link = dbToRecipeLink(dbLink);
        const linkedId = link.recipeId === fetchId ? link.linkedRecipeId : link.recipeId;
        const recipeData = recipesData?.find(r => r.id === linkedId);

        return {
          link,
          recipe: recipeData ? {
            id: recipeData.id,
            title: recipeData.title,
            sourceUrl: recipeData.source_url || undefined,
            imageUrl: recipeData.image_url || undefined,
            description: recipeData.description || undefined,
            category: recipeData.category,
            tags: recipeData.tags || [],
            prepTime: recipeData.prep_time || undefined,
            cookTime: recipeData.cook_time || undefined,
            totalTime: recipeData.total_time || undefined,
            servings: recipeData.servings,
            ingredients: recipeData.ingredients || [],
            instructions: recipeData.instructions || [],
            isFavorite: recipeData.is_favorite,
            isArchived: recipeData.is_archived,
            createdAt: recipeData.created_at,
            updatedAt: recipeData.updated_at,
          } : null,
        };
      }).filter(item => item.recipe !== null) as LinkedRecipeWithDetails[];

      setLinkedRecipes(combined);
    } catch (error) {
      console.error('Error in fetchLinkedRecipes:', error);
      // Only clear if this is still the current recipe
      if (currentRecipeIdRef.current === fetchId) {
        setLinkedRecipes([]);
      }
    } finally {
      // Only update loading state if this is still the current recipe
      if (currentRecipeIdRef.current === fetchId) {
        setIsLoading(false);
        setHasLoaded(true);
      }
      fetchInProgressRef.current = false;
    }
  }, [user, recipeId]);

  // Single effect to handle recipeId changes - reset state and trigger fetch
  useEffect(() => {
    // Update the ref to track current recipeId
    currentRecipeIdRef.current = recipeId;

    // Reset state for new recipe
    setHasLoaded(false);
    setLinkedRecipes([]);

    if (recipeId) {
      setIsLoading(true);
      fetchLinkedRecipes(recipeId);
    } else {
      setIsLoading(false);
    }
  }, [recipeId]); // Note: fetchLinkedRecipes intentionally not in deps to avoid loops

  // Add a link between two recipes
  // Returns the created link ID on success, or null on failure
  const addLink = useCallback(async (linkedRecipeId: string, linkType: RecipeLinkType = 'goes_with'): Promise<string | null> => {
    if (!user || !recipeId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to link recipes',
        variant: 'destructive',
      });
      return null;
    }

    if (recipeId === linkedRecipeId) {
      toast({
        title: 'Error',
        description: "A recipe can't link to itself",
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('recipe_links')
        .insert({
          recipe_id: recipeId,
          linked_recipe_id: linkedRecipeId,
          link_type: linkType,
          user_id: user.id,
        })
        .select('id')
        .single();

      if (error) {
        // Check for unique constraint violation (already linked)
        if (error.code === '23505') {
          toast({
            title: 'Already linked',
            description: 'These recipes are already linked together',
          });
          return null;
        }
        throw error;
      }

      toast({
        title: 'Linked',
        description: 'Recipes linked together',
      });

      await fetchLinkedRecipes();
      return data.id;
    } catch (error) {
      console.error('Error adding recipe link:', error);
      toast({
        title: 'Error',
        description: 'Failed to link recipes',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, recipeId, toast, fetchLinkedRecipes]);

  // Remove a link
  const removeLink = useCallback(async (linkId: string) => {
    if (!user) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('recipe_links')
        .delete()
        .eq('id', linkId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Unlinked',
        description: 'Recipe link removed',
      });

      await fetchLinkedRecipes();
      return true;
    } catch (error) {
      console.error('Error removing recipe link:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove link',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, fetchLinkedRecipes]);

  // Update ingredient replacements for a link
  const updateReplacements = useCallback(async (
    linkId: string,
    replacements: IngredientReplacement[] | null
  ) => {
    if (!user) {
      console.error('[updateReplacements] No user logged in');
      return false;
    }

    try {
      const { error } = await supabase
        .from('recipe_links')
        .update({ replacements })
        .eq('id', linkId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: replacements && replacements.length > 0 ? 'Replacements saved' : 'Replacements cleared',
        description: replacements && replacements.length > 0
          ? `${replacements.length} ingredient${replacements.length > 1 ? 's' : ''} will be replaced`
          : 'No ingredient replacements configured',
      });

      await fetchLinkedRecipes();
      return true;
    } catch (error) {
      console.error('Error updating replacements:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ingredient replacements',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast, fetchLinkedRecipes]);

  return {
    linkedRecipes,
    isLoading,
    hasLoaded,
    addLink,
    removeLink,
    updateReplacements,
    refresh: fetchLinkedRecipes,
  };
}

/**
 * Hook to find linked recipes that aren't in the current meal plan
 * Used for the shopping list reminder
 */
export function useUnplannedLinkedRecipes(
  mealPlanItems: MealPlanItem[],
  allRecipes: Recipe[]
) {
  const { user } = useAuth();
  const [unplannedLinks, setUnplannedLinks] = useState<{
    plannedRecipe: Recipe;
    unplannedLinkedRecipe: Recipe;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function checkUnplannedLinks() {
      if (!user || mealPlanItems.length === 0) {
        if (!isCancelled) {
          setUnplannedLinks([]);
        }
        return;
      }

      if (!isCancelled) {
        setIsLoading(true);
      }

      try {
        // Get unique recipe IDs from the meal plan
        const plannedRecipeIds = [...new Set(mealPlanItems.map(item => item.recipeId))];

        // Get all links for planned recipes
        const { data: linksData, error } = await supabase
          .from('recipe_links')
          .select('*')
          .eq('user_id', user.id)
          .or(
            plannedRecipeIds.map(id => `recipe_id.eq.${id}`).join(',') + ',' +
            plannedRecipeIds.map(id => `linked_recipe_id.eq.${id}`).join(',')
          );

        if (isCancelled) return;

        if (error) {
          console.error('Error fetching links for meal plan:', error);
          setUnplannedLinks([]);
          return;
        }

        if (!linksData || linksData.length === 0) {
          setUnplannedLinks([]);
          return;
        }

        // Find linked recipes that aren't in the meal plan
        const missing: { plannedRecipe: Recipe; unplannedLinkedRecipe: Recipe }[] = [];

        for (const link of linksData) {
          const isRecipeIdPlanned = plannedRecipeIds.includes(link.recipe_id);
          const isLinkedIdPlanned = plannedRecipeIds.includes(link.linked_recipe_id);

          // If one is planned but the other isn't
          if (isRecipeIdPlanned && !isLinkedIdPlanned) {
            const plannedRecipe = allRecipes.find(r => r.id === link.recipe_id);
            const unplannedRecipe = allRecipes.find(r => r.id === link.linked_recipe_id);
            if (plannedRecipe && unplannedRecipe) {
              missing.push({
                plannedRecipe,
                unplannedLinkedRecipe: unplannedRecipe,
              });
            }
          } else if (!isRecipeIdPlanned && isLinkedIdPlanned) {
            const plannedRecipe = allRecipes.find(r => r.id === link.linked_recipe_id);
            const unplannedRecipe = allRecipes.find(r => r.id === link.recipe_id);
            if (plannedRecipe && unplannedRecipe) {
              missing.push({
                plannedRecipe,
                unplannedLinkedRecipe: unplannedRecipe,
              });
            }
          }
        }

        // Deduplicate by unplanned recipe ID
        const unique = missing.filter((item, index, self) =>
          index === self.findIndex(t => t.unplannedLinkedRecipe.id === item.unplannedLinkedRecipe.id)
        );

        setUnplannedLinks(unique);
      } catch (error: unknown) {
        if (isCancelled) return;
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error checking unplanned links:', error);
        setUnplannedLinks([]);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    checkUnplannedLinks();

    return () => {
      isCancelled = true;
    };
  }, [user, mealPlanItems, allRecipes]);

  return {
    unplannedLinks,
    isLoading,
  };
}

// Detailed info about active replacements for display purposes
export interface ReplacementDetail {
  mainRecipeId: string;
  mainRecipeTitle: string;
  linkedRecipeId: string;
  linkedRecipeTitle: string;
  replacedIngredientIds: string[];
  replacedIngredientNames: string[];
}

/**
 * Hook to get active ingredient replacements for recipes in the meal plan
 * Returns a map of recipeId -> ingredientIds that should be excluded from shopping list
 * Also returns detailed info for UI display
 */
export function useActiveReplacements(
  mealPlanItems: MealPlanItem[],
  recipes: Recipe[] = []
) {
  const { user } = useAuth();
  const [replacementsMap, setReplacementsMap] = useState<Map<string, Set<string>>>(new Map());
  const [replacementDetails, setReplacementDetails] = useState<ReplacementDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function fetchActiveReplacements() {
      if (!user || mealPlanItems.length === 0) {
        if (!isCancelled) {
          setReplacementsMap(new Map());
          setReplacementDetails([]);
        }
        return;
      }

      if (!isCancelled) {
        setIsLoading(true);
      }

      try {
        // Get unique recipe IDs from the meal plan
        const plannedRecipeIds = [...new Set(mealPlanItems.map(item => item.recipeId))];

        // Get all links for planned recipes that have replacements
        const { data: linksData, error } = await supabase
          .from('recipe_links')
          .select('*')
          .eq('user_id', user.id)
          .not('replacements', 'is', null)
          .or(
            plannedRecipeIds.map(id => `recipe_id.eq.${id}`).join(',') + ',' +
            plannedRecipeIds.map(id => `linked_recipe_id.eq.${id}`).join(',')
          );

        if (isCancelled) return;

        if (error) {
          console.error('Error fetching active replacements:', error);
          setReplacementsMap(new Map());
          setReplacementDetails([]);
          return;
        }

        if (!linksData || linksData.length === 0) {
          setReplacementsMap(new Map());
          setReplacementDetails([]);
          return;
        }

        // Build map of recipeId -> Set of ingredient IDs to exclude
        const newMap = new Map<string, Set<string>>();
        const details: ReplacementDetail[] = [];

        for (const link of linksData) {
          // Only apply replacements when BOTH recipes are in the meal plan
          const isRecipeIdPlanned = plannedRecipeIds.includes(link.recipe_id);
          const isLinkedIdPlanned = plannedRecipeIds.includes(link.linked_recipe_id);

          if (!isRecipeIdPlanned || !isLinkedIdPlanned) {
            continue; // Both must be planned for replacements to apply
          }

          const replacements = link.replacements as IngredientReplacement[] | null;
          if (!replacements || replacements.length === 0) {
            continue;
          }

          // The main recipe (recipe_id) has ingredients being replaced
          const mainRecipeId = link.recipe_id;
          const linkedRecipeId = link.linked_recipe_id;

          if (!newMap.has(mainRecipeId)) {
            newMap.set(mainRecipeId, new Set());
          }

          const excludeSet = newMap.get(mainRecipeId)!;
          const replacedIngredientIds: string[] = [];

          for (const replacement of replacements) {
            excludeSet.add(replacement.replacesIngredientId);
            replacedIngredientIds.push(replacement.replacesIngredientId);
          }

          // Build detail info for display
          const mainRecipe = recipes.find(r => r.id === mainRecipeId);
          const linkedRecipe = recipes.find(r => r.id === linkedRecipeId);

          if (mainRecipe && linkedRecipe) {
            const ingredientNames = replacedIngredientIds
              .map(id => mainRecipe.ingredients.find(i => i.id === id)?.item)
              .filter((name): name is string => !!name);

            details.push({
              mainRecipeId,
              mainRecipeTitle: mainRecipe.title,
              linkedRecipeId,
              linkedRecipeTitle: linkedRecipe.title,
              replacedIngredientIds,
              replacedIngredientNames: ingredientNames,
            });
          }
        }

        setReplacementsMap(newMap);
        setReplacementDetails(details);
      } catch (error: unknown) {
        if (isCancelled) return;
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching active replacements:', error);
        setReplacementsMap(new Map());
        setReplacementDetails([]);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchActiveReplacements();

    return () => {
      isCancelled = true;
    };
  }, [user, mealPlanItems, recipes]);

  return {
    replacementsMap,
    replacementDetails,
    isLoading,
  };
}
