import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Recipe, Ingredient, MealPlan, MealPlanItem, RecipeNutrition, MealType, ImportMethod, VideoPlatform } from '@/types/recipe';
import { useToast } from '@/hooks/use-toast';
import { FREE_RECIPE_LIMIT } from '@/hooks/useSubscription';

// Database recipe row type
interface DbRecipe {
  id: string;
  user_id: string | null;
  title: string;
  source_url: string | null;
  image_url: string | null;
  description: string | null;
  category: string;
  tags: string[];
  prep_time: number | null;
  cook_time: number | null;
  total_time: number | null;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  is_favorite: boolean;
  is_archived: boolean;
  cuisine: string | null;
  dietary: string[];
  meal_types: string[];
  author: string | null;
  nutrition: RecipeNutrition | null;
  import_method: string | null;
  raw_import_snapshot: string | null;
  is_public: boolean;
  is_library: boolean;
  original_recipe_id: string | null;
  video_url: string | null;
  video_platform: string | null;
  created_at: string;
  updated_at: string;
}

// Convert DB recipe to app Recipe type
function dbToRecipe(db: DbRecipe): Recipe {
  const ingredients = db.ingredients || [];
  const nutrition = db.nutrition || undefined;

  // Compute data quality warning: >25% empty ingredients or suspicious calories
  const emptyIngredients = ingredients.filter(ing => !ing.item || !ing.item.trim()).length;
  const hasEmptyIngredientIssue = ingredients.length > 0 && emptyIngredients / ingredients.length > 0.25;
  const hasSuspiciousCalories = nutrition?.perServing?.calories ? nutrition.perServing.calories > 1500 : false;
  const dataQualityWarning = hasEmptyIngredientIssue || hasSuspiciousCalories;

  return {
    id: db.id,
    title: db.title,
    sourceUrl: db.source_url || undefined,
    imageUrl: db.image_url || undefined,
    description: db.description || undefined,
    category: db.category,
    tags: db.tags || [],
    prepTime: db.prep_time || undefined,
    cookTime: db.cook_time || undefined,
    totalTime: db.total_time || undefined,
    servings: db.servings,
    ingredients,
    instructions: db.instructions || [],
    isFavorite: db.is_favorite,
    isArchived: db.is_archived,
    cuisine: db.cuisine || undefined,
    dietary: db.dietary || [],
    mealTypes: (db.meal_types || []) as MealType[],
    author: db.author || undefined,
    nutrition,
    isPublic: db.is_public || undefined,
    videoUrl: db.video_url || undefined,
    videoPlatform: db.video_platform as VideoPlatform || undefined,
    originalRecipeId: db.original_recipe_id || undefined,
    importMethod: db.import_method as ImportMethod || undefined,
    rawImportSnapshot: db.raw_import_snapshot || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    dataQualityWarning: dataQualityWarning || undefined,
  };
}

// Convert app Recipe to DB format
function recipeToDb(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>, userId: string) {
  return {
    user_id: userId,
    title: recipe.title,
    source_url: recipe.sourceUrl || null,
    image_url: recipe.imageUrl || null,
    description: recipe.description || null,
    category: recipe.category,
    tags: recipe.tags || [],
    prep_time: recipe.prepTime || null,
    cook_time: recipe.cookTime || null,
    total_time: recipe.totalTime || null,
    servings: recipe.servings,
    ingredients: JSON.parse(JSON.stringify(recipe.ingredients || [])),
    instructions: recipe.instructions || [],
    is_favorite: recipe.isFavorite,
    is_archived: recipe.isArchived,
    cuisine: recipe.cuisine || null,
    dietary: recipe.dietary || [],
    meal_types: recipe.mealTypes || [],
    author: recipe.author || null,
    nutrition: recipe.nutrition ? JSON.parse(JSON.stringify(recipe.nutrition)) : null,
    video_url: recipe.videoUrl || null,
    video_platform: recipe.videoPlatform || null,
    import_method: recipe.importMethod || null,
    raw_import_snapshot: recipe.rawImportSnapshot || null,
    is_public: false,
    is_library: false,
  };
}

export type RecipeSource = 'personal' | 'library' | 'shared' | 'all';

export function useRecipesData() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [libraryRecipes, setLibraryRecipes] = useState<Recipe[]>([]);
  const [sharedRecipes, setSharedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch personal recipes
  const fetchPersonalRecipes = useCallback(async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return [];
    }
    
    return (data as unknown as DbRecipe[]).map(dbToRecipe);
  }, [user]);

  // Fetch library recipes (public) - exclude raw_import_snapshot for security
  const fetchLibraryRecipes = useCallback(async () => {
    // Explicitly select safe columns to prevent raw_import_snapshot from being exposed
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id, user_id, title, source_url, image_url, description, category, tags,
        prep_time, cook_time, total_time, servings, ingredients, instructions,
        is_favorite, is_archived, cuisine, dietary, meal_types, author, nutrition,
        import_method, is_public, is_library, original_recipe_id, created_at, updated_at
      `)
      .or('is_public.eq.true,is_library.eq.true')
      .order('created_at', { ascending: false });
    
    if (error) {
      return [];
    }
    
    // Map to DbRecipe with raw_import_snapshot explicitly null for safety
    return (data as unknown as DbRecipe[]).map(row => dbToRecipe({ ...row, raw_import_snapshot: null }));
  }, []);

  // Fetch shared recipes (shared with current user)
  const fetchSharedRecipes = useCallback(async () => {
    if (!user) return [];
    
    const { data: shares, error: sharesError } = await supabase
      .from('recipe_shares')
      .select('recipe_id')
      .eq('shared_with_user_id', user.id);
    
    if (sharesError || !shares?.length) {
      return [];
    }
    
    const recipeIds = shares.map(s => s.recipe_id);
    
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .in('id', recipeIds);
    
    if (error) {
      return [];
    }
    
    return (data as unknown as DbRecipe[]).map(dbToRecipe);
  }, [user]);

  // Initial fetch
  useEffect(() => {
    async function fetchAll() {
      setIsLoading(true);
      setError(null);
      
      try {
        const [personal, library, shared] = await Promise.all([
          fetchPersonalRecipes(),
          fetchLibraryRecipes(),
          fetchSharedRecipes(),
        ]);
        
        setRecipes(personal);
        setLibraryRecipes(library);
        setSharedRecipes(shared);
      } catch (err) {
        setError('Failed to load recipes');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAll();
  }, [fetchPersonalRecipes, fetchLibraryRecipes, fetchSharedRecipes]);

  // Add recipe
  const addRecipe = async (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to add recipes.',
        variant: 'destructive',
      });
      return null;
    }

    // Free users: enforce recipe limit
    if (profile?.subscription_tier !== 'premium' && recipes.length >= FREE_RECIPE_LIMIT) {
      toast({
        title: 'Recipe limit reached',
        description: `Free accounts can store up to ${FREE_RECIPE_LIMIT} recipes. Upgrade to Premium for unlimited storage.`,
        variant: 'destructive',
      });
      return null;
    }
    
    // Clean up ingredients: filter out any with empty names
    const cleanedIngredients = recipe.ingredients.filter(ing => ing.item && ing.item.trim().length > 0);

    // Nutrition sanity check: flag suspicious calorie counts
    let cleanedNutrition = recipe.nutrition;
    if (cleanedNutrition?.perServing?.calories && cleanedNutrition.perServing.calories > 1500) {
      cleanedNutrition = { ...cleanedNutrition, verified: false };
    }

    const cleanedRecipe = {
      ...recipe,
      ingredients: cleanedIngredients,
      nutrition: cleanedNutrition,
    };

    const dbRecipe = recipeToDb(cleanedRecipe, user.id);

    const { data, error } = await supabase
      .from('recipes')
      .insert([dbRecipe])
      .select()
      .single();
    
    if (error) {
      toast({
        title: 'Error adding recipe',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
    
    const isFirstRecipe = recipes.length === 0;
    const newRecipe = dbToRecipe(data as unknown as DbRecipe);
    setRecipes(prev => [newRecipe, ...prev]);

    return { recipe: newRecipe, isFirstRecipe };
  };

  // Update recipe
  const updateRecipe = async (recipe: Recipe) => {
    if (!user) return;

    const { error } = await supabase
      .from('recipes')
      .update({
        title: recipe.title,
        source_url: recipe.sourceUrl || null,
        image_url: recipe.imageUrl || null,
        description: recipe.description || null,
        category: recipe.category,
        tags: recipe.tags,
        prep_time: recipe.prepTime || null,
        cook_time: recipe.cookTime || null,
        total_time: recipe.totalTime || null,
        servings: recipe.servings,
        ingredients: JSON.parse(JSON.stringify(recipe.ingredients || [])),
        instructions: recipe.instructions || [],
        is_favorite: recipe.isFavorite,
        is_archived: recipe.isArchived,
        cuisine: recipe.cuisine || null,
        dietary: recipe.dietary || [],
        meal_types: recipe.mealTypes || [],
        author: recipe.author || null,
        nutrition: recipe.nutrition ? JSON.parse(JSON.stringify(recipe.nutrition)) : null,
        video_url: recipe.videoUrl || null,
        video_platform: recipe.videoPlatform || null,
      })
      .eq('id', recipe.id);
    
    if (error) {
      toast({
        title: 'Error updating recipe',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...recipe, updatedAt: new Date().toISOString() } : r));
  };

  // Delete recipe
  const deleteRecipe = async (id: string) => {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({
        title: 'Error deleting recipe',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  // Toggle favorite
  const toggleFavorite = async (id: string) => {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    
    const { error } = await supabase
      .from('recipes')
      .update({ is_favorite: !recipe.isFavorite })
      .eq('id', id);
    
    if (!error) {
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r));
    } else {
      toast({
        title: 'Failed to update favorite',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Toggle archive
  const toggleArchive = async (id: string) => {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;

    const { error } = await supabase
      .from('recipes')
      .update({ is_archived: !recipe.isArchived })
      .eq('id', id);

    if (!error) {
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, isArchived: !r.isArchived } : r));
    } else {
      toast({
        title: 'Failed to update archive status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Make recipe public
  const makeRecipePublic = async (id: string, isPublic: boolean) => {
    // Attribution notice for cloned recipes
    if (isPublic) {
      const recipe = recipes.find(r => r.id === id);
      if (recipe?.originalRecipeId) {
        const { data: attribution } = await supabase.rpc('get_recipe_attribution', {
          target_recipe_id: id,
        });
        if (attribution && Array.isArray(attribution) && attribution.length > 0) {
          const creator = attribution[0];
          const name = creator.creator_display_name || (creator.creator_username ? `@${creator.creator_username}` : 'the original creator');
          toast({
            title: 'Attribution notice',
            description: `This recipe will show "Originally by ${name}" since it was saved from their collection.`,
          });
        }
      }
    }

    const { error } = await supabase
      .from('recipes')
      .update({ is_public: isPublic })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error updating recipe visibility',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    // Update local recipes state so UI reflects the change immediately
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, isPublic } : r));

    // Refresh library recipes
    const library = await fetchLibraryRecipes();
    setLibraryRecipes(library);

    return true;
  };

  // Make multiple recipes public at once (used when sharing a meal plan)
  const makeRecipesPublicBatch = async (recipeIds: string[]): Promise<boolean> => {
    if (recipeIds.length === 0) return true;

    const { error } = await supabase
      .from('recipes')
      .update({ is_public: true })
      .in('id', recipeIds);

    if (error) {
      toast({
        title: 'Error publishing recipes',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    // Update local state
    setRecipes(prev => prev.map(r =>
      recipeIds.includes(r.id) ? { ...r, isPublic: true } : r
    ));

    return true;
  };

  // Share recipe with user by email
  const shareRecipe = async (recipeId: string, email: string, canEdit: boolean = false) => {
    if (!user) return { error: 'Not authenticated', shared: false, pending: false };

    const normalizedEmail = email.toLowerCase().trim();

    // Check if trying to share with self
    if (normalizedEmail === user.email?.toLowerCase()) {
      return { error: 'Cannot share with yourself', shared: false, pending: false };
    }

    // Look up user by email in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      return { error: 'Failed to look up user', shared: false, pending: false };
    }

    if (profile) {
      // User exists - create direct share
      const { error: shareError } = await supabase
        .from('recipe_shares')
        .insert({
          recipe_id: recipeId,
          shared_by_user_id: user.id,
          shared_with_user_id: profile.user_id,
          can_edit: canEdit,
        });

      if (shareError) {
        if (shareError.code === '23505') { // Unique violation
          return { error: 'Recipe already shared with this user', shared: false, pending: false };
        }
        return { error: 'Failed to share recipe', shared: false, pending: false };
      }

      return { error: null, shared: true, pending: false };
    } else {
      // User doesn't exist - create pending share
      const { error: pendingError } = await supabase
        .from('pending_shares')
        .insert({
          recipe_id: recipeId,
          shared_by_user_id: user.id,
          invited_email: normalizedEmail,
          can_edit: canEdit,
        });

      if (pendingError) {
        if (pendingError.code === '23505') { // Unique violation
          return { error: 'Invitation already sent to this email', shared: false, pending: false };
        }
        return { error: 'Failed to send invitation', shared: false, pending: false };
      }

      // Send invitation email (fire and forget - don't block on email success)
      const recipe = recipes.find(r => r.id === recipeId);
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      supabase.functions.invoke('send-share-invitation', {
        body: {
          email: normalizedEmail,
          recipeTitle: recipe?.title || 'a recipe',
          sharerName: profile?.display_name || 'Someone',
        },
      }).catch(() => {});

      return { error: null, shared: false, pending: true };
    }
  };

  // Get existing shares for a recipe
  const getRecipeShares = async (recipeId: string) => {
    if (!user) return { shares: [], pendingShares: [] };

    // Get active shares
    const { data: shares, error: sharesError } = await supabase
      .from('recipe_shares')
      .select(`
        id,
        shared_with_user_id,
        can_edit,
        created_at,
        profiles!recipe_shares_shared_with_user_id_fkey(display_name, email)
      `)
      .eq('recipe_id', recipeId)
      .eq('shared_by_user_id', user.id);

    if (sharesError) {
      // ignored
    }

    // Get pending shares
    const { data: pendingShares, error: pendingError } = await supabase
      .from('pending_shares')
      .select('id, invited_email, can_edit, created_at')
      .eq('recipe_id', recipeId)
      .eq('shared_by_user_id', user.id);

    if (pendingError) {
      // ignored
    }

    return {
      shares: shares || [],
      pendingShares: pendingShares || [],
    };
  };

  // Revoke a share
  const revokeShare = async (shareId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('recipe_shares')
      .delete()
      .eq('id', shareId)
      .eq('shared_by_user_id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke share',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  // Revoke a pending share
  const revokePendingShare = async (pendingShareId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('pending_shares')
      .delete()
      .eq('id', pendingShareId)
      .eq('shared_by_user_id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke invitation',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  // Copy library/public recipe to personal collection
  const copyToPersonal = async (recipeId: string, externalRecipe?: Recipe) => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to save recipes.',
        variant: 'destructive',
      });
      return null;
    }

    const sourceRecipe = externalRecipe || libraryRecipes.find(r => r.id === recipeId) || sharedRecipes.find(r => r.id === recipeId);
    if (!sourceRecipe) return null;
    
    const { id, createdAt, updatedAt, ...recipeData } = sourceRecipe;
    
    const dbRecipe = {
      ...recipeToDb(recipeData, user.id),
      original_recipe_id: recipeId,
    };
    
    const { data, error } = await supabase
      .from('recipes')
      .insert([dbRecipe])
      .select()
      .single();
    
    if (error) {
      toast({
        title: 'Error copying recipe',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
    
    const newRecipe = dbToRecipe(data as unknown as DbRecipe);
    setRecipes(prev => [newRecipe, ...prev]);

    // Record engagement event (fire-and-forget)
    supabase.from('recipe_engagement').insert({
      recipe_id: recipeId,
      user_id: user.id,
      event_type: 'save',
    }).then(() => {});

    // Notify original recipe creator (fire-and-forget)
    supabase
      .from('recipes')
      .select('user_id')
      .eq('id', recipeId)
      .single()
      .then(({ data: origRecipe }) => {
        if (origRecipe?.user_id && origRecipe.user_id !== user.id) {
          supabase.from('notifications').insert({
            user_id: origRecipe.user_id,
            type: 'recipe_saved',
            data: {
              recipe_id: recipeId,
              recipe_title: sourceRecipe.title,
            },
          }).then(() => {});
        }
      });

    return newRecipe;
  };

  // Get all accessible recipes
  const getAllRecipes = useCallback(() => {
    const allIds = new Set<string>();
    const all: Recipe[] = [];
    
    // Add personal recipes first
    recipes.forEach(r => {
      if (!allIds.has(r.id)) {
        allIds.add(r.id);
        all.push(r);
      }
    });
    
    // Add shared recipes
    sharedRecipes.forEach(r => {
      if (!allIds.has(r.id)) {
        allIds.add(r.id);
        all.push(r);
      }
    });
    
    // Add library recipes
    libraryRecipes.forEach(r => {
      if (!allIds.has(r.id)) {
        allIds.add(r.id);
        all.push(r);
      }
    });
    
    return all;
  }, [recipes, libraryRecipes, sharedRecipes]);

  return {
    // Personal recipes
    recipes,
    // Library (public) recipes
    libraryRecipes,
    // Recipes shared with user
    sharedRecipes,
    // All accessible recipes
    allRecipes: getAllRecipes(),
    // Loading state
    isLoading,
    error,
    // Actions
    addRecipe,
    updateRecipe,
    deleteRecipe,
    toggleFavorite,
    toggleArchive,
    makeRecipePublic,
    makeRecipesPublicBatch,
    shareRecipe,
    getRecipeShares,
    revokeShare,
    revokePendingShare,
    copyToPersonal,
    // Subscription limits
    recipeCount: recipes.length,
    recipeLimit: profile?.subscription_tier === 'premium' ? null : FREE_RECIPE_LIMIT,
    // Refresh functions
    refreshPersonal: fetchPersonalRecipes,
    refreshLibrary: fetchLibraryRecipes,
    refreshShared: fetchSharedRecipes,
  };
}
