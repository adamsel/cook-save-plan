import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { startOfWeek, format } from 'date-fns';
import type { ShoppingListItem } from '@/types/recipe';

// Custom items stored in the database - subset of ShoppingListItem
type CustomShoppingItem = Pick<ShoppingListItem, 'id' | 'ingredient' | 'quantity' | 'unit' | 'category' | 'isCustom'>;

interface ShoppingListState {
  checkedItems: Record<string, boolean>;
  customItems: CustomShoppingItem[];
}

const STORAGE_KEY_CHECKED = 'shoppingListChecked';
const STORAGE_KEY_CUSTOM = 'customShoppingItems';
const STORAGE_KEY_CATEGORY_OVERRIDES = 'shoppingListCategoryOverrides';
const DEBOUNCE_MS = 1500;

function getWeekStartDate(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function getFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setToLocalStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
}

export function useShoppingListState() {
  const { user, session } = useAuth();
  const [checkedItems, setCheckedItemsState] = useState<Record<string, boolean>>(() =>
    getFromLocalStorage(STORAGE_KEY_CHECKED, {})
  );
  const [customItems, setCustomItemsState] = useState<CustomShoppingItem[]>(() =>
    getFromLocalStorage(STORAGE_KEY_CUSTOM, [])
  );
  // Category overrides persist across weeks (not week-specific)
  const [categoryOverrides, setCategoryOverridesState] = useState<Record<string, string>>(() =>
    getFromLocalStorage(STORAGE_KEY_CATEGORY_OVERRIDES, {})
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSyncedRef = useRef(false);

  // Fetch state from database
  const fetchFromDatabase = useCallback(async () => {
    if (!user) return null;

    const weekStart = getWeekStartDate();

    const { data, error } = await supabase
      .from('shopping_list_state')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStart)
      .maybeSingle();

    if (error) {
      console.error('Error fetching shopping list state:', error);
      return null;
    }

    return data;
  }, [user]);

  // Save state to database (debounced)
  const saveToDatabase = useCallback(async (
    newCheckedItems: Record<string, boolean>,
    newCustomItems: CustomShoppingItem[]
  ) => {
    if (!user) return;

    const weekStart = getWeekStartDate();

    const { error } = await supabase
      .from('shopping_list_state')
      .upsert({
        user_id: user.id,
        week_start_date: weekStart,
        checked_items: newCheckedItems,
        custom_items: newCustomItems,
      }, {
        onConflict: 'user_id,week_start_date',
      });

    if (error) {
      console.error('Error saving shopping list state:', error);
    }
  }, [user]);

  // Debounced save
  const debouncedSave = useCallback((
    newCheckedItems: Record<string, boolean>,
    newCustomItems: CustomShoppingItem[]
  ) => {
    // Always save to localStorage immediately
    setToLocalStorage(STORAGE_KEY_CHECKED, newCheckedItems);
    setToLocalStorage(STORAGE_KEY_CUSTOM, newCustomItems);

    // Debounce database save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (user) {
      setIsSyncing(true);
      saveTimeoutRef.current = setTimeout(async () => {
        await saveToDatabase(newCheckedItems, newCustomItems);
        setIsSyncing(false);
      }, DEBOUNCE_MS);
    }
  }, [user, saveToDatabase]);

  // Set checked items with auto-save
  const setCheckedItems = useCallback((
    value: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => {
    setCheckedItemsState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      debouncedSave(newValue, customItems);
      return newValue;
    });
  }, [customItems, debouncedSave]);

  // Set custom items with auto-save
  const setCustomItems = useCallback((
    value: CustomShoppingItem[] | ((prev: CustomShoppingItem[]) => CustomShoppingItem[])
  ) => {
    setCustomItemsState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      debouncedSave(checkedItems, newValue);
      return newValue;
    });
  }, [checkedItems, debouncedSave]);

  // Initial load and sync
  useEffect(() => {
    async function initializeState() {
      setIsLoading(true);

      if (user && !hasSyncedRef.current) {
        // Try to fetch from database
        const dbState = await fetchFromDatabase();

        if (dbState) {
          // Database has state - use it
          const dbChecked = (dbState.checked_items as Record<string, boolean>) || {};
          const dbCustom = (dbState.custom_items as CustomShoppingItem[]) || [];

          setCheckedItemsState(dbChecked);
          setCustomItemsState(dbCustom);

          // Update localStorage to match
          setToLocalStorage(STORAGE_KEY_CHECKED, dbChecked);
          setToLocalStorage(STORAGE_KEY_CUSTOM, dbCustom);
        } else {
          // No database state - sync localStorage to database
          const localChecked = getFromLocalStorage<Record<string, boolean>>(STORAGE_KEY_CHECKED, {});
          const localCustom = getFromLocalStorage<CustomShoppingItem[]>(STORAGE_KEY_CUSTOM, []);

          if (Object.keys(localChecked).length > 0 || localCustom.length > 0) {
            await saveToDatabase(localChecked, localCustom);
          }

          setCheckedItemsState(localChecked);
          setCustomItemsState(localCustom);
        }

        hasSyncedRef.current = true;
      }

      setIsLoading(false);
    }

    initializeState();
  }, [user, fetchFromDatabase, saveToDatabase]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Reset for new week (optional - call this when week changes)
  const resetForNewWeek = useCallback(() => {
    hasSyncedRef.current = false;
  }, []);

  // Set category override for an ingredient key
  const setCategoryOverride = useCallback((ingredientKey: string, category: string) => {
    setCategoryOverridesState(prev => {
      const newOverrides = { ...prev, [ingredientKey]: category };
      setToLocalStorage(STORAGE_KEY_CATEGORY_OVERRIDES, newOverrides);
      return newOverrides;
    });
  }, []);

  // Remove a category override
  const removeCategoryOverride = useCallback((ingredientKey: string) => {
    setCategoryOverridesState(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[ingredientKey];
      setToLocalStorage(STORAGE_KEY_CATEGORY_OVERRIDES, newOverrides);
      return newOverrides;
    });
  }, []);

  return {
    checkedItems,
    setCheckedItems,
    customItems,
    setCustomItems,
    categoryOverrides,
    setCategoryOverride,
    removeCategoryOverride,
    isLoading,
    isSyncing,
    resetForNewWeek,
  };
}
