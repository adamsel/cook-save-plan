import React, { createContext, useContext, ReactNode } from 'react';
import { Recipe, MealPlan, MealPlanItem, DEFAULT_CATEGORIES, DEFAULT_AISLE_CATEGORIES, DEFAULT_PANTRY_STAPLES } from '@/types/recipe';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { seedRecipes } from '@/data/seedRecipes';
import { startOfWeek, format } from 'date-fns';

interface RecipeContextType {
  recipes: Recipe[];
  mealPlans: MealPlan[];
  categories: string[];
  tags: string[];
  pantryStaples: string[];
  aisleCategories: string[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  toggleFavorite: (id: string) => void;
  toggleArchive: (id: string) => void;
  getCurrentMealPlan: () => MealPlan;
  addToMealPlan: (recipeId: string, day: string, mealSlot: 'breakfast' | 'lunch' | 'dinner') => void;
  removeFromMealPlan: (itemId: string) => void;
  updateMealPlanItem: (itemId: string, updates: Partial<MealPlanItem>) => void;
  addCategory: (category: string) => void;
  addTag: (tag: string) => void;
  updatePantryStaples: (staples: string[]) => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('recipes', seedRecipes);
  const [mealPlans, setMealPlans] = useLocalStorage<MealPlan[]>('mealPlans', []);
  const [categories, setCategories] = useLocalStorage<string[]>('categories', DEFAULT_CATEGORIES);
  const [tags, setTags] = useLocalStorage<string[]>('tags', ['Italian', 'Quick', 'Healthy', 'Vegetarian', 'Comfort Food']);
  const [pantryStaples, setPantryStaples] = useLocalStorage<string[]>('pantryStaples', DEFAULT_PANTRY_STAPLES);
  const [aisleCategories] = useLocalStorage<string[]>('aisleCategories', DEFAULT_AISLE_CATEGORIES);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addRecipe = (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRecipes(prev => [...prev, newRecipe]);
  };

  const updateRecipe = (recipe: Recipe) => {
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...recipe, updatedAt: new Date().toISOString() } : r));
  };

  const deleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    // Also remove from meal plans
    setMealPlans(prev => prev.map(mp => ({
      ...mp,
      items: mp.items.filter(item => item.recipeId !== id)
    })));
  };

  const toggleFavorite = (id: string) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r));
  };

  const toggleArchive = (id: string) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, isArchived: !r.isArchived } : r));
  };

  const getCurrentMealPlan = (): MealPlan => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    let plan = mealPlans.find(mp => mp.weekStartDate === weekStart);
    
    if (!plan) {
      plan = {
        id: generateId(),
        weekStartDate: weekStart,
        items: [],
      };
      setMealPlans(prev => [...prev, plan!]);
    }
    
    return plan;
  };

  const addToMealPlan = (recipeId: string, day: string, mealSlot: 'breakfast' | 'lunch' | 'dinner') => {
    const currentPlan = getCurrentMealPlan();
    
    // Check if slot already has a recipe
    const existingItem = currentPlan.items.find(
      item => item.day === day && item.mealSlot === mealSlot
    );
    
    if (existingItem) {
      // Replace existing
      setMealPlans(prev => prev.map(mp => 
        mp.id === currentPlan.id 
          ? {
              ...mp,
              items: mp.items.map(item => 
                item.id === existingItem.id 
                  ? { ...item, recipeId }
                  : item
              )
            }
          : mp
      ));
    } else {
      // Add new
      const newItem: MealPlanItem = {
        id: generateId(),
        recipeId,
        day,
        mealSlot,
        servingsMultiplier: 1,
      };
      
      setMealPlans(prev => prev.map(mp => 
        mp.id === currentPlan.id 
          ? { ...mp, items: [...mp.items, newItem] }
          : mp
      ));
    }
  };

  const removeFromMealPlan = (itemId: string) => {
    setMealPlans(prev => prev.map(mp => ({
      ...mp,
      items: mp.items.filter(item => item.id !== itemId)
    })));
  };

  const updateMealPlanItem = (itemId: string, updates: Partial<MealPlanItem>) => {
    setMealPlans(prev => prev.map(mp => ({
      ...mp,
      items: mp.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    })));
  };

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

  return (
    <RecipeContext.Provider value={{
      recipes,
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
      getCurrentMealPlan,
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
