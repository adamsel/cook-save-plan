import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useHousehold } from '@/hooks/useHousehold';
import { MealPlan, MealPlanItem, LeftoverPositionEntry } from '@/types/recipe';
import { format, startOfWeek } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DbMealPlan {
  id: string;
  user_id: string;
  household_id: string | null;
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
  leftover_meals: number;
  leftover_positions: LeftoverPositionEntry[] | null; // JSON column
  notes: string | null;
  event_type: string | null;
  guest_count: number | null;
  event_note: string | null;
  created_at: string;
}

export function useMealPlansData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { household, hasHousehold } = useHousehold();

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Convert DB meal plan item to app type
  const dbToMealPlanItem = (item: DbMealPlanItem): MealPlanItem => ({
    id: item.id,
    recipeId: item.recipe_id,
    day: item.day,
    mealSlot: item.meal_slot as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    servingsMultiplier: Number(item.servings_multiplier),
    leftoverMeals: Number(item.leftover_meals || 0),
    leftoverPositions: item.leftover_positions || [],
    notes: item.notes || undefined,
    eventType: item.event_type as MealPlanItem['eventType'] || undefined,
    guestCount: item.guest_count || undefined,
    eventNote: item.event_note || undefined,
  });

  // Convert DB meal plan to app type
  const dbToMealPlan = (dbPlan: DbMealPlan, items: DbMealPlanItem[]): MealPlan => ({
    id: dbPlan.id,
    weekStartDate: dbPlan.week_start_date,
    items: items.map(dbToMealPlanItem),
  });

  // Fetch all meal plans (including household plans if applicable)
  const fetchMealPlans = useCallback(async () => {
    if (!user) return [];

    // Build query - get user's own plans
    let query = supabase
      .from('meal_plans')
      .select('*')
      .order('week_start_date', { ascending: false });

    // If user has a household, fetch household plans too
    // RLS will handle permissions, but we use .or() to get both conditions
    if (hasHousehold && household?.id) {
      query = query.or(`user_id.eq.${user.id},household_id.eq.${household.id}`);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: plans, error: plansError } = await query;

    if (plansError) {
      console.error('Error fetching meal plans:', plansError);
      return [];
    }

    if (!plans?.length) return [];

    // Fetch all items for these plans (includes leftover_positions JSON)
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

    return plans.map(plan => dbToMealPlan(
      plan as DbMealPlan,
      itemsByPlan[plan.id] || []
    ));
  }, [user, hasHousehold, household?.id]);

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

    // Check database - look for user's own plan or household plan
    let query = supabase
      .from('meal_plans')
      .select('*')
      .eq('week_start_date', weekStartDate);

    if (hasHousehold && household?.id) {
      query = query.or(`user_id.eq.${user.id},household_id.eq.${household.id}`);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: existingPlans } = await query;
    const existingPlan = existingPlans?.[0];

    if (existingPlan) {
      const { data: items } = await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('meal_plan_id', existingPlan.id);

      const plan = dbToMealPlan(
        existingPlan as DbMealPlan,
        (items || []) as DbMealPlanItem[]
      );
      setMealPlans(prev => [...prev, plan]);
      return plan;
    }

    // Create new plan - include household_id if user has a household
    const insertData: { user_id: string; week_start_date: string; household_id?: string } = {
      user_id: user.id,
      week_start_date: weekStartDate,
    };

    if (hasHousehold && household?.id) {
      insertData.household_id = household.id;
    }

    const { data: newPlan, error: createError } = await supabase
      .from('meal_plans')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating meal plan:', createError);
      return null;
    }

    const plan = dbToMealPlan(newPlan as DbMealPlan, []);
    setMealPlans(prev => [...prev, plan]);
    return plan;
  }, [user, mealPlans, hasHousehold, household?.id]);

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
      mealSlot: item.meal_slot as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      servingsMultiplier: Number(item.servings_multiplier),
      leftoverMeals: Number(item.leftover_meals || 0),
      leftoverPositions: [],
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
    if (updates.leftoverMeals !== undefined) dbUpdates.leftover_meals = updates.leftoverMeals;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.day !== undefined) dbUpdates.day = updates.day;
    if (updates.mealSlot !== undefined) dbUpdates.meal_slot = updates.mealSlot;
    if (updates.leftoverPositions !== undefined) dbUpdates.leftover_positions = updates.leftoverPositions;
    if (updates.eventType !== undefined) dbUpdates.event_type = updates.eventType;
    if (updates.guestCount !== undefined) dbUpdates.guest_count = updates.guestCount;
    if (updates.eventNote !== undefined) dbUpdates.event_note = updates.eventNote;

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

    // If reducing leftover count, also clean up positions array
    if (updates.leftoverMeals !== undefined) {
      const currentItem = mealPlans.flatMap(mp => mp.items).find(i => i.id === itemId);
      if (currentItem && updates.leftoverMeals < currentItem.leftoverMeals) {
        // Filter out positions for removed leftovers
        const filteredPositions = (currentItem.leftoverPositions || []).filter(
          p => p.index < updates.leftoverMeals!
        );

        // Update positions in DB if they changed
        if (filteredPositions.length !== (currentItem.leftoverPositions || []).length) {
          await supabase
            .from('meal_plan_items')
            .update({ leftover_positions: filteredPositions })
            .eq('id', itemId);

          updates.leftoverPositions = filteredPositions;
        }
      }
    }

    setMealPlans(prev => prev.map(mp => ({
      ...mp,
      items: mp.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    })));
  };

  // Update leftover position (simplified - updates JSON column)
  const updateLeftoverPosition = async (
    itemId: string,
    leftoverIndex: number,
    day: string,
    mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ) => {
    // Find the item
    const item = mealPlans.flatMap(mp => mp.items).find(i => i.id === itemId);
    if (!item) {
      toast({
        title: 'Error',
        description: 'Item not found',
        variant: 'destructive',
      });
      return;
    }

    // Build new positions array
    const positions = [...(item.leftoverPositions || [])];
    const existingIdx = positions.findIndex(p => p.index === leftoverIndex);

    const newPosition: LeftoverPositionEntry = {
      index: leftoverIndex,
      day,
      slot: mealSlot,
    };

    if (existingIdx >= 0) {
      positions[existingIdx] = newPosition;
    } else {
      positions.push(newPosition);
    }

    // Update database
    const { error } = await supabase
      .from('meal_plan_items')
      .update({ leftover_positions: positions })
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Error moving leftover',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Re-fetch to ensure UI updates with fresh data
    const freshPlans = await fetchMealPlans();
    setMealPlans(freshPlans);
  };

  // Delete leftover position (revert to default)
  const deleteLeftoverPosition = async (itemId: string, leftoverIndex: number) => {
    const item = mealPlans.flatMap(mp => mp.items).find(i => i.id === itemId);
    if (!item) return;

    // Remove position from array
    const positions = (item.leftoverPositions || []).filter(
      p => p.index !== leftoverIndex
    );

    const { error } = await supabase
      .from('meal_plan_items')
      .update({ leftover_positions: positions })
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting leftover position:', error);
      return;
    }

    setMealPlans(prev => prev.map(mp => ({
      ...mp,
      items: mp.items.map(i =>
        i.id === itemId ? { ...i, leftoverPositions: positions } : i
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
    updateLeftoverPosition,
    deleteLeftoverPosition,
    refresh: fetchMealPlans,
  };
}
