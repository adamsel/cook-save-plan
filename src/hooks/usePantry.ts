import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useHousehold } from '@/hooks/useHousehold';
import { useToast } from '@/hooks/use-toast';
import { getIngredientKey } from '@/lib/ingredientNormalizer';

export interface PantryItem {
  id: string;
  ingredientKey: string;
  displayName: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expiryDate: string | null;
  lowStockThreshold: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbPantryItem {
  id: string;
  household_id: string | null;
  user_id: string | null;
  ingredient_key: string;
  display_name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expiry_date: string | null;
  low_stock_threshold: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddPantryItemInput {
  displayName: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  expiryDate?: string | null;
  lowStockThreshold?: number | null;
  notes?: string | null;
}

export interface UpdatePantryItemInput {
  displayName?: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  expiryDate?: string | null;
  lowStockThreshold?: number | null;
  notes?: string | null;
}

function dbToItem(db: DbPantryItem): PantryItem {
  return {
    id: db.id,
    ingredientKey: db.ingredient_key,
    displayName: db.display_name,
    quantity: db.quantity,
    unit: db.unit,
    category: db.category,
    expiryDate: db.expiry_date,
    lowStockThreshold: db.low_stock_threshold,
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function usePantry() {
  const { user } = useAuth();
  const { household, hasHousehold } = useHousehold();
  const { toast } = useToast();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all pantry items
  const fetchItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let query = supabase
      .from('pantry_items')
      .select('*')
      .order('display_name');

    // Get items for user's household or their personal items
    if (hasHousehold && household?.id) {
      query = query.or(`household_id.eq.${household.id},user_id.eq.${user.id}`);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pantry items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pantry items',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    setItems((data || []).map(item => dbToItem(item as DbPantryItem)));
    setIsLoading(false);
  }, [user, hasHousehold, household?.id, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Add a new pantry item
  const addItem = useCallback(async (input: AddPantryItemInput): Promise<PantryItem | null> => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to manage your pantry',
        variant: 'destructive',
      });
      return null;
    }

    const ingredientKey = getIngredientKey(input.displayName);

    // Check if item already exists
    const existing = items.find(i => i.ingredientKey === ingredientKey);
    if (existing) {
      toast({
        title: 'Item already exists',
        description: `${input.displayName} is already in your pantry. Try updating it instead.`,
        variant: 'destructive',
      });
      return null;
    }

    const insertData: Record<string, unknown> = {
      ingredient_key: ingredientKey,
      display_name: input.displayName,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      category: input.category ?? null,
      expiry_date: input.expiryDate ?? null,
      low_stock_threshold: input.lowStockThreshold ?? null,
      notes: input.notes ?? null,
    };

    // Set owner (household or user)
    if (hasHousehold && household?.id) {
      insertData.household_id = household.id;
    } else {
      insertData.user_id = user.id;
    }

    const { data, error } = await supabase
      .from('pantry_items')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error adding pantry item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item to pantry',
        variant: 'destructive',
      });
      return null;
    }

    const newItem = dbToItem(data as DbPantryItem);
    setItems(prev => [...prev, newItem].sort((a, b) => a.displayName.localeCompare(b.displayName)));

    toast({
      title: 'Added to pantry',
      description: `${input.displayName} has been added to your pantry`,
    });

    return newItem;
  }, [user, items, hasHousehold, household?.id, toast]);

  // Update a pantry item
  const updateItem = useCallback(async (id: string, input: UpdatePantryItemInput): Promise<boolean> => {
    const updates: Record<string, unknown> = {};

    if (input.displayName !== undefined) {
      updates.display_name = input.displayName;
      updates.ingredient_key = getIngredientKey(input.displayName);
    }
    if (input.quantity !== undefined) updates.quantity = input.quantity;
    if (input.unit !== undefined) updates.unit = input.unit;
    if (input.category !== undefined) updates.category = input.category;
    if (input.expiryDate !== undefined) updates.expiry_date = input.expiryDate;
    if (input.lowStockThreshold !== undefined) updates.low_stock_threshold = input.lowStockThreshold;
    if (input.notes !== undefined) updates.notes = input.notes;

    const { error } = await supabase
      .from('pantry_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating pantry item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update pantry item',
        variant: 'destructive',
      });
      return false;
    }

    setItems(prev => prev.map(item =>
      item.id === id
        ? {
            ...item,
            ...(input.displayName !== undefined && {
              displayName: input.displayName,
              ingredientKey: getIngredientKey(input.displayName),
            }),
            ...(input.quantity !== undefined && { quantity: input.quantity }),
            ...(input.unit !== undefined && { unit: input.unit }),
            ...(input.category !== undefined && { category: input.category }),
            ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
            ...(input.lowStockThreshold !== undefined && { lowStockThreshold: input.lowStockThreshold }),
            ...(input.notes !== undefined && { notes: input.notes }),
          }
        : item
    ));

    return true;
  }, [toast]);

  // Delete a pantry item
  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    const item = items.find(i => i.id === id);

    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pantry item:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove item from pantry',
        variant: 'destructive',
      });
      return false;
    }

    setItems(prev => prev.filter(i => i.id !== id));

    toast({
      title: 'Removed from pantry',
      description: item ? `${item.displayName} has been removed` : 'Item removed',
    });

    return true;
  }, [items, toast]);

  // Quick quantity update (for +/- buttons)
  const adjustQuantity = useCallback(async (id: string, delta: number): Promise<boolean> => {
    const item = items.find(i => i.id === id);
    if (!item) return false;

    const newQuantity = Math.max(0, (item.quantity || 0) + delta);
    return updateItem(id, { quantity: newQuantity });
  }, [items, updateItem]);

  // Check if an ingredient is in the pantry (for shopping list integration)
  const getItemByKey = useCallback((ingredientKey: string): PantryItem | undefined => {
    const normalizedKey = getIngredientKey(ingredientKey);
    return items.find(item => item.ingredientKey === normalizedKey);
  }, [items]);

  // Get items that are low on stock
  const getLowStockItems = useCallback((): PantryItem[] => {
    return items.filter(item =>
      item.lowStockThreshold !== null &&
      item.quantity !== null &&
      item.quantity <= item.lowStockThreshold
    );
  }, [items]);

  // Get items that are expiring soon (within 3 days)
  const getExpiringSoonItems = useCallback((): PantryItem[] => {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threshold = threeDaysFromNow.toISOString().split('T')[0];

    return items.filter(item =>
      item.expiryDate !== null && item.expiryDate <= threshold
    );
  }, [items]);

  // Batch add from shopping list (when marking items as bought)
  const addFromShoppingList = useCallback(async (
    shoppingItems: Array<{ displayName: string; quantity?: number; unit?: string; category?: string }>
  ): Promise<number> => {
    let added = 0;

    for (const item of shoppingItems) {
      const key = getIngredientKey(item.displayName);
      const existing = items.find(i => i.ingredientKey === key);

      if (existing) {
        // Update quantity (add to existing)
        if (item.quantity && existing.quantity !== null) {
          await updateItem(existing.id, {
            quantity: existing.quantity + item.quantity,
          });
        }
      } else {
        // Add new item
        const result = await addItem({
          displayName: item.displayName,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
        });
        if (result) added++;
      }
    }

    if (added > 0) {
      toast({
        title: 'Pantry updated',
        description: `${added} new item${added > 1 ? 's' : ''} added to pantry`,
      });
    }

    return added;
  }, [items, addItem, updateItem, toast]);

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    adjustQuantity,
    getItemByKey,
    getLowStockItems,
    getExpiringSoonItems,
    addFromShoppingList,
    refresh: fetchItems,
  };
}
