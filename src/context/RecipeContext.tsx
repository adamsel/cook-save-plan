import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { Recipe, MealPlan, MealPlanItem, MealType, DEFAULT_CATEGORIES, DEFAULT_AISLE_CATEGORIES, DEFAULT_PANTRY_STAPLES } from '@/types/recipe';
import { useRecipesData, RecipeSource } from '@/hooks/useRecipesData';
import { useMealPlansData } from '@/hooks/useMealPlansData';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { startOfWeek, format } from 'date-fns';

interface RecipeShare {
  id: string;
  shared_with_user_id: string;
  can_edit: boolean;
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
}

interface PendingShare {
  id: string;
  invited_email: string;
  can_edit: boolean;
  created_at: string;
}

interface RecipeContextType {
  // Recipes
  recipes: Recipe[];
  libraryRecipes: Recipe[];
  sharedRecipes: Recipe[];
  allRecipes: Recipe[];
  isLoading: boolean;

  // Meal Plans
  mealPlans: MealPlan[];

  // Categories & Tags
  categories: string[];
  tags: string[];
  pantryStaples: string[];
  aisleCategories: string[];

  // Recipe Actions
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Recipe | null>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  makeRecipePublic: (id: string, isPublic: boolean) => Promise<boolean>;
  copyToPersonal: (recipeId: string) => Promise<Recipe | null>;

  // Sharing Actions
  shareRecipe: (recipeId: string, email: string, canEdit?: boolean) => Promise<{ error: string | null; shared: boolean; pending: boolean }>;
  getRecipeShares: (recipeId: string) => Promise<{ shares: RecipeShare[]; pendingShares: PendingShare[] }>;
  revokeShare: (shareId: string) => Promise<boolean>;
  revokePendingShare: (pendingShareId: string) => Promise<boolean>;
  
  // Meal Plan Actions
  getCurrentMealPlan: () => MealPlan;
  getMealPlanForWeek: (weekStartDate: string) => Promise<MealPlan | null>;
  addToMealPlan: (recipeId: string, day: string, mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack', weekStartDate?: string) => Promise<MealPlanItem | null>;
  removeFromMealPlan: (itemId: string) => Promise<void>;
  updateMealPlanItem: (itemId: string, updates: Partial<MealPlanItem>) => Promise<void>;
  updateLeftoverPosition: (itemId: string, leftoverIndex: number, day: string, mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack') => Promise<void>;

  // Meal Plan Sharing
  shareMealPlan: (planId: string, title?: string, description?: string) => Promise<{ shareSlug: string } | null>;
  unshareMealPlan: (planId: string) => Promise<boolean>;
  getMealPlanShareInfo: (planId: string) => Promise<{ isShared: boolean; shareSlug: string | null; title: string | null; description: string | null } | null>;
  makeRecipesPublicBatch: (recipeIds: string[]) => Promise<boolean>;
  
  // Settings Actions
  addCategory: (category: string) => void;
  addTag: (tag: string) => void;
  updatePantryStaples: (staples: string[]) => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export function RecipeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Use database hooks when authenticated
  const recipesData = useRecipesData();
  const mealPlansData = useMealPlansData();
  
  // Local storage for settings (categories, tags, pantry staples)
  const [categories, setCategories] = useLocalStorage<string[]>('categories', DEFAULT_CATEGORIES);
  const [tags, setTags] = useLocalStorage<string[]>('tags', ['Italian', 'Quick', 'Healthy', 'Vegetarian', 'Comfort Food']);
  const [pantryStaples, setPantryStaples] = useLocalStorage<string[]>('pantryStaples', DEFAULT_PANTRY_STAPLES);
  const [aisleCategories] = useLocalStorage<string[]>('aisleCategories', DEFAULT_AISLE_CATEGORIES);
  const migrationInFlight = useRef(false);

  // Migrate localStorage: remove meal-timing categories (now handled by mealTypes field)
  useEffect(() => {
    let updated = [...categories];
    let needsUpdate = false;

    // Remove categories that are now meal types only
    const mealTypeOnly = ['Dinner', 'Lunch', 'Breakfast', 'Snack', 'Main Course'];
    mealTypeOnly.forEach(cat => {
      if (updated.includes(cat)) {
        updated = updated.filter(c => c !== cat);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      setCategories(updated);
    }
  }, []);

  // For unauthenticated fallback - local storage recipes
  const [localRecipes, setLocalRecipes] = useLocalStorage<Recipe[]>('recipes', []);
  const [localMealPlans, setLocalMealPlans] = useLocalStorage<MealPlan[]>('mealPlans', []);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Recipe actions that work with or without auth
  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (user) {
      return await recipesData.addRecipe(recipeData);
    }
    
    // Local fallback
    const newRecipe: Recipe = {
      ...recipeData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalRecipes(prev => [...prev, newRecipe]);
    return newRecipe;
  };

  const updateRecipe = async (recipe: Recipe) => {
    if (user) {
      await recipesData.updateRecipe(recipe);
    } else {
      setLocalRecipes(prev => prev.map(r => 
        r.id === recipe.id ? { ...recipe, updatedAt: new Date().toISOString() } : r
      ));
    }
  };

  const deleteRecipe = async (id: string) => {
    if (user) {
      await recipesData.deleteRecipe(id);
    } else {
      setLocalRecipes(prev => prev.filter(r => r.id !== id));
      setLocalMealPlans(prev => prev.map(mp => ({
        ...mp,
        items: mp.items.filter(item => item.recipeId !== id)
      })));
    }
  };

  const toggleFavorite = async (id: string) => {
    if (user) {
      await recipesData.toggleFavorite(id);
    } else {
      setLocalRecipes(prev => prev.map(r => 
        r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
      ));
    }
  };

  const toggleArchive = async (id: string) => {
    if (user) {
      await recipesData.toggleArchive(id);
    } else {
      setLocalRecipes(prev => prev.map(r => 
        r.id === id ? { ...r, isArchived: !r.isArchived } : r
      ));
    }
  };

  const makeRecipePublic = async (id: string, isPublic: boolean) => {
    if (user) {
      return await recipesData.makeRecipePublic(id, isPublic);
    }
    return false;
  };

  const copyToPersonal = async (recipeId: string) => {
    if (user) {
      return await recipesData.copyToPersonal(recipeId);
    }
    return null;
  };

  // Meal plan actions
  const getCurrentMealPlan = (): MealPlan => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    if (user) {
      const plan = mealPlansData.mealPlans.find(mp => mp.weekStartDate === weekStart);
      if (plan) return plan;
    } else {
      const plan = localMealPlans.find(mp => mp.weekStartDate === weekStart);
      if (plan) return plan;
    }
    
    // Return empty plan structure
    return {
      id: generateId(),
      weekStartDate: weekStart,
      items: [],
    };
  };

  const getMealPlanForWeek = async (weekStartDate: string) => {
    if (user) {
      return await mealPlansData.getMealPlan(weekStartDate);
    }
    return localMealPlans.find(mp => mp.weekStartDate === weekStartDate) || null;
  };

  const addToMealPlan = async (
    recipeId: string, 
    day: string, 
    mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    weekStartDate?: string
  ) => {
    if (user) {
      return await mealPlansData.addToMealPlan(recipeId, day, mealSlot, weekStartDate);
    }
    
    // Local fallback
    const targetDate = weekStartDate || format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    let plan = localMealPlans.find(mp => mp.weekStartDate === targetDate);
    
    if (!plan) {
      plan = {
        id: generateId(),
        weekStartDate: targetDate,
        items: [],
      };
      setLocalMealPlans(prev => [...prev, plan!]);
    }
    
    const newItem: MealPlanItem = {
      id: generateId(),
      recipeId,
      day,
      mealSlot,
      servingsMultiplier: 1,
      leftoverMeals: 0,
    };
    
    setLocalMealPlans(prev => prev.map(mp => 
      mp.id === plan!.id 
        ? { ...mp, items: [...mp.items, newItem] }
        : mp
    ));
    
    return newItem;
  };

  const removeFromMealPlan = async (itemId: string) => {
    if (user) {
      await mealPlansData.removeFromMealPlan(itemId);
    } else {
      setLocalMealPlans(prev => prev.map(mp => ({
        ...mp,
        items: mp.items.filter(item => item.id !== itemId)
      })));
    }
  };

  const updateMealPlanItem = async (itemId: string, updates: Partial<MealPlanItem>) => {
    if (user) {
      await mealPlansData.updateMealPlanItem(itemId, updates);
    } else {
      setLocalMealPlans(prev => prev.map(mp => ({
        ...mp,
        items: mp.items.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      })));
    }
  };

  const updateLeftoverPosition = async (
    itemId: string,
    leftoverIndex: number,
    day: string,
    mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ) => {
    if (user) {
      await mealPlansData.updateLeftoverPosition(itemId, leftoverIndex, day, mealSlot);
    } else {
      // Local fallback - update leftoverPositions array on the item
      setLocalMealPlans(prev => prev.map(mp => ({
        ...mp,
        items: mp.items.map(item => {
          if (item.id !== itemId) return item;
          const positions = [...(item.leftoverPositions || [])];
          const existingIdx = positions.findIndex(p => p.index === leftoverIndex);
          const newPos = { index: leftoverIndex, day, slot: mealSlot };
          if (existingIdx >= 0) {
            positions[existingIdx] = newPos;
          } else {
            positions.push(newPos);
          }
          return { ...item, leftoverPositions: positions };
        })
      })));
    }
  };

  // Settings actions
  const addCategory = (category: string) => {
    if (!categories.includes(category)) {
      setCategories(prev => [...prev, category]);
    }
  };

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
  };

  const updatePantryStaples = (staples: string[]) => {
    setPantryStaples(staples);
  };

  // Compute values based on auth state
  const recipes = user ? recipesData.recipes : localRecipes;
  const libraryRecipes = user ? recipesData.libraryRecipes : [];
  const sharedRecipes = user ? recipesData.sharedRecipes : [];
  const allRecipes = user ? recipesData.allRecipes : localRecipes;
  const mealPlans = user ? mealPlansData.mealPlans : localMealPlans;
  const isLoading = user ? (recipesData.isLoading || mealPlansData.isLoading) : false;

  // One-time migration: move Dinner/Lunch/Breakfast/Snack from category to mealTypes
  useEffect(() => {
    const migrationDone = localStorage.getItem('category-to-mealtype-migration');
    if (migrationDone || migrationInFlight.current || !user || isLoading || recipes.length === 0) return;

    const mealTimingCategories = ['Dinner', 'Lunch', 'Breakfast', 'Snack'];
    const recipesToMigrate = recipes.filter(r =>
      mealTimingCategories.includes(r.category)
    );

    if (recipesToMigrate.length === 0) {
      localStorage.setItem('category-to-mealtype-migration', 'done');
      return;
    }

    // Guard against re-triggering while updates are in-flight
    migrationInFlight.current = true;

    const updates = recipesToMigrate.map(recipe => {
      const mealType = recipe.category as MealType;
      const updatedMealTypes = recipe.mealTypes?.includes(mealType)
        ? recipe.mealTypes
        : [...(recipe.mealTypes || []), mealType];

      return updateRecipe({
        ...recipe,
        category: '',
        mealTypes: updatedMealTypes,
      });
    });

    Promise.allSettled(updates).then(results => {
      const allSucceeded = results.every(r => r.status === 'fulfilled');
      if (allSucceeded) {
        localStorage.setItem('category-to-mealtype-migration', 'done');
      }
      migrationInFlight.current = false;
    });
  }, [user, isLoading, recipes]);

  // Meal plan sharing functions
  const shareMealPlan = async (planId: string, title?: string, description?: string) => {
    if (!user) return null;
    return await mealPlansData.shareMealPlan(planId, title, description);
  };

  const unshareMealPlan = async (planId: string) => {
    if (!user) return false;
    return await mealPlansData.unshareMealPlan(planId);
  };

  const getMealPlanShareInfo = async (planId: string) => {
    return await mealPlansData.getMealPlanShareInfo(planId);
  };

  const makeRecipesPublicBatch = async (recipeIds: string[]) => {
    if (!user) return false;
    return await recipesData.makeRecipesPublicBatch(recipeIds);
  };

  // Sharing functions - only available when authenticated
  const shareRecipe = async (recipeId: string, email: string, canEdit: boolean = false) => {
    if (!user) return { error: 'Not authenticated', shared: false, pending: false };
    return await recipesData.shareRecipe(recipeId, email, canEdit);
  };

  const getRecipeShares = async (recipeId: string) => {
    if (!user) return { shares: [], pendingShares: [] };
    return await recipesData.getRecipeShares(recipeId);
  };

  const revokeShare = async (shareId: string) => {
    if (!user) return false;
    return await recipesData.revokeShare(shareId);
  };

  const revokePendingShare = async (pendingShareId: string) => {
    if (!user) return false;
    return await recipesData.revokePendingShare(pendingShareId);
  };

  return (
    <RecipeContext.Provider value={{
      recipes,
      libraryRecipes,
      sharedRecipes,
      allRecipes,
      isLoading,
      mealPlans,
      categories,
      tags,
      pantryStaples,
      aisleCategories,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      toggleFavorite,
      toggleArchive,
      makeRecipePublic,
      copyToPersonal,
      shareRecipe,
      getRecipeShares,
      revokeShare,
      revokePendingShare,
      getCurrentMealPlan,
      getMealPlanForWeek,
      addToMealPlan,
      removeFromMealPlan,
      updateMealPlanItem,
      updateLeftoverPosition,
      shareMealPlan,
      unshareMealPlan,
      getMealPlanShareInfo,
      makeRecipesPublicBatch,
      addCategory,
      addTag,
      updatePantryStaples,
    }}>
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipes() {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
}
