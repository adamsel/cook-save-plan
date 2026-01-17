import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MealPlan, MealPlanItem } from '@/types/recipe';
import { format, startOfWeek } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DbMealPlan {
  id: string;
  user_id: string;
  week_start_date: string;
  created_at: string;
  updated_at: string;
}

interface DbMealPlanItem {
  id: string;
  meal_plan_id: string;
  recipe_id: string;
  day: string;
  meal_slot: string;
  servings_multiplier: number;
  notes: string | null;
  created_at: string;
}

export function useMealPlansData() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Convert DB meal plan to app type
  const dbToMealPlan = (dbPlan: DbMealPlan, items: DbMealPlanItem[]): MealPlan => ({
    id: dbPlan.id,
    weekStartDate: dbPlan.week_start_date,
    items: items.map(item => ({
      id: item.id,
      recipeId: item.recipe_id,
      day: item.day,
      mealSlot: item.meal_slot as 'breakfast' | 'lunch' | 'dinner',
      servingsMultiplier: Number(item.servings_multiplier),
      notes: item.notes || undefined,
    })),
  });

  // Fetch all meal plans
  const fetchMealPlans = useCallback(async () => {
    if (!user) return [];
    
    const { data: plans, error: plansError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start_date', { ascending: false });
    
    if (plansError) {
      console.error('Error fetching meal plans:', plansError);
      return [];
    }
    
    if (!plans?.length) return [];
    
    // Fetch all items for these plans
    const { data: items, error: itemsError } = await supabase
      .from('meal_plan_items')
      .select('*')
      .in('meal_plan_id', plans.map(p => p.id));
    
    if (itemsError) {
      console.error('Error fetching meal plan items:', itemsError);
      return [];
    }
    
    // Group items by plan
    const itemsByPlan = (items || []).reduce((acc, item) => {
      if (!acc[item.meal_plan_id]) acc[item.meal_plan_id] = [];
      acc[item.meal_plan_id].push(item as DbMealPlanItem);
      return acc;
    }, {} as Record<string, DbMealPlanItem[]>);
    
    return plans.map(plan => dbToMealPlan(plan as DbMealPlan, itemsByPlan[plan.id] || []));
  }, [user]);

  // Initial fetch
  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      const plans = await fetchMealPlans();
      setMealPlans(plans);
      setIsLoading(false);
    }
    
    fetch();
  }, [fetchMealPlans]);

  // Get or create meal plan for a week
  const getMealPlan = useCallback(async (weekStartDate: string): Promise<MealPlan | null> => {
    if (!user) return null;
    
    // Check if we already have it locally
    const existing = mealPlans.find(mp => mp.weekStartDate === weekStartDate);
    if (existing) return existing;
    
    // Check database
    const { data: existingPlan, error: checkError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartDate)
      .single();
    
    if (existingPlan) {
      const { data: items } = await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('meal_plan_id', existingPlan.id);
      
      const plan = dbToMealPlan(existingPlan as DbMealPlan, (items || []) as DbMealPlanItem[]);
      setMealPlans(prev => [...prev, plan]);
      return plan;
    }
    
    // Create new plan
    const { data: newPlan, error: createError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        week_start_date: weekStartDate,
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating meal plan:', createError);
      return null;
    }
    
    const plan = dbToMealPlan(newPlan as DbMealPlan, []);
    setMealPlans(prev => [...prev, plan]);
    return plan;
  }, [user, mealPlans]);

  // Get current week's meal plan
  const getCurrentMealPlan = useCallback(async (): Promise<MealPlan | null> => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return getMealPlan(weekStart);
  }, [getMealPlan]);

  // Add item to meal plan
  const addToMealPlan = async (
    recipeId: string, 
    day: string, 
    mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    weekStartDate?: string
  ) => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to plan meals.',
        variant: 'destructive',
      });
      return null;
    }
    
    const targetDate = weekStartDate || format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const plan = await getMealPlan(targetDate);
    
    if (!plan) return null;
    
    const { data: item, error } = await supabase
      .from('meal_plan_items')
      .insert({
        meal_plan_id: plan.id,
        recipe_id: recipeId,
        day,
        meal_slot: mealSlot,
        servings_multiplier: 1,
      })
      .select()
      .single();
    
    if (error) {
      toast({
        title: 'Error adding to meal plan',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
    
    const newItem: MealPlanItem = {
      id: item.id,
      recipeId: item.recipe_id,
      day: item.day,
      mealSlot: item.meal_slot as 'breakfast' | 'lunch' | 'dinner',
      servingsMultiplier: Number(item.servings_multiplier),
    };
    
    setMealPlans(prev => prev.map(mp => 
      mp.id === plan.id 
        ? { ...mp, items: [...mp.items, newItem] }
        : mp
    ));
    
    return newItem;
  };

  // Remove item from meal plan
  const removeFromMealPlan = async (itemId: string) => {
    const { error } = await supabase
      .from('meal_plan_items')
      .delete()
      .eq('id', itemId);
    
    if (error) {
      toast({
        title: 'Error removing from meal plan',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    
    setMealPlans(prev => prev.map(mp => ({
      ...mp,
      items: mp.items.filter(item => item.id !== itemId),
    })));
  };

  // Update meal plan item
  const updateMealPlanItem = async (itemId: string, updates: Partial<MealPlanItem>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.servingsMultiplier !== undefined) dbUpdates.servings_multiplier = updates.servingsMultiplier;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.day !== undefined) dbUpdates.day = updates.day;
    if (updates.mealSlot !== undefined) dbUpdates.meal_slot = updates.mealSlot;
    
    const { error } = await supabase
      .from('meal_plan_items')
      .update(dbUpdates)
      .eq('id', itemId);
    
    if (error) {
      toast({
        title: 'Error updating meal plan',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    
    setMealPlans(prev => prev.map(mp => ({
      ...mp,
      items: mp.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ),
    })));
  };

  return {
    mealPlans,
    isLoading,
    getMealPlan,
    getCurrentMealPlan,
    addToMealPlan,
    removeFromMealPlan,
    updateMealPlanItem,
    refresh: fetchMealPlans,
  };
}
