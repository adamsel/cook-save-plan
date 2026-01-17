import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { Recipe, MealPlan, MealPlanItem, DEFAULT_CATEGORIES, DEFAULT_AISLE_CATEGORIES, DEFAULT_PANTRY_STAPLES } from '@/types/recipe';
import { useRecipesData, RecipeSource } from '@/hooks/useRecipesData';
import { useMealPlansData } from '@/hooks/useMealPlansData';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { startOfWeek, format } from 'date-fns';

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
  
  // Meal Plan Actions
  getCurrentMealPlan: () => MealPlan;
  getMealPlanForWeek: (weekStartDate: string) => Promise<MealPlan | null>;
  addToMealPlan: (recipeId: string, day: string, mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack', weekStartDate?: string) => Promise<MealPlanItem | null>;
  removeFromMealPlan: (itemId: string) => Promise<void>;
  updateMealPlanItem: (itemId: string, updates: Partial<MealPlanItem>) => Promise<void>;
  
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
      let plan = localMealPlans.find(mp => mp.weekStartDate === weekStart);
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
      getCurrentMealPlan,
      getMealPlanForWeek,
      addToMealPlan,
      removeFromMealPlan,
      updateMealPlanItem,
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
