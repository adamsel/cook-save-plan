import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Recipe, Ingredient, MealPlan, MealPlanItem, RecipeNutrition, MealType, ImportMethod } from '@/types/recipe';
import { useToast } from '@/hooks/use-toast';

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
  created_at: string;
  updated_at: string;
}

// Convert DB recipe to app Recipe type
function dbToRecipe(db: DbRecipe): Recipe {
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
    ingredients: db.ingredients || [],
    instructions: db.instructions || [],
    isFavorite: db.is_favorite,
    isArchived: db.is_archived,
    cuisine: db.cuisine || undefined,
    dietary: db.dietary || [],
    mealTypes: (db.meal_types || []) as MealType[],
    author: db.author || undefined,
    nutrition: db.nutrition || undefined,
    importMethod: db.import_method as ImportMethod || undefined,
    rawImportSnapshot: db.raw_import_snapshot || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
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
    import_method: recipe.importMethod || null,
    raw_import_snapshot: recipe.rawImportSnapshot || null,
    is_public: false,
    is_library: false,
  };
}

export type RecipeSource = 'personal' | 'library' | 'shared' | 'all';

export function useRecipesData() {
  const { user } = useAuth();
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
      console.error('Error fetching personal recipes:', error);
      return [];
    }
    
    return (data as unknown as DbRecipe[]).map(dbToRecipe);
  }, [user]);

  // Fetch library recipes (public)
  const fetchLibraryRecipes = useCallback(async () => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .or('is_public.eq.true,is_library.eq.true')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching library recipes:', error);
      return [];
    }
    
    return (data as unknown as DbRecipe[]).map(dbToRecipe);
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
      console.error('Error fetching shared recipes:', error);
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
        console.error(err);
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
    
    const dbRecipe = recipeToDb(recipe, user.id);
    
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
    
    const newRecipe = dbToRecipe(data as unknown as DbRecipe);
    setRecipes(prev => [newRecipe, ...prev]);
    
    return newRecipe;
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
    }
  };

  // Make recipe public
  const makeRecipePublic = async (id: string, isPublic: boolean) => {
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
    
    // Refresh library recipes
    const library = await fetchLibraryRecipes();
    setLibraryRecipes(library);
    
    return true;
  };

  // Share recipe with user
  const shareRecipe = async (recipeId: string, email: string) => {
    if (!user) return { error: 'Not authenticated' };
    
    // Find user by email (we'd need a lookup - for now just use the email as user_id lookup)
    // In a real app, you'd have a user search or invitation system
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('display_name', email);
    
    // This is a simplified approach - in production you'd have proper user lookup
    toast({
      title: 'Share feature',
      description: 'Sharing by email will be available soon. For now, make your recipe public to share.',
    });
    
    return { error: null };
  };

  // Copy library recipe to personal collection
  const copyToPersonal = async (recipeId: string) => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to save recipes.',
        variant: 'destructive',
      });
      return null;
    }
    
    const sourceRecipe = libraryRecipes.find(r => r.id === recipeId) || sharedRecipes.find(r => r.id === recipeId);
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
    
    toast({
      title: 'Recipe saved!',
      description: `${newRecipe.title} has been added to your collection.`,
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
    shareRecipe,
    copyToPersonal,
    // Refresh functions
    refreshPersonal: fetchPersonalRecipes,
    refreshLibrary: fetchLibraryRecipes,
    refreshShared: fetchSharedRecipes,
  };
}
