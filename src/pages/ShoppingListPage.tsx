import { useState, useMemo, useEffect } from 'react';
import { useRecipes } from '@/context/RecipeContext';
import { ShoppingListItem, DEFAULT_AISLE_CATEGORIES, DAYS_OF_WEEK, DayOfWeek, MealPlan } from '@/types/recipe';
import { mergeIngredients, type RawIngredientInput } from '@/lib/ingredientNormalizer/index';
import { useDietaryPreferences } from '@/hooks/useDietaryPreferences';
import { checkDietaryFlags } from '@/lib/dietaryFlags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Plus,
  Copy,
  Printer,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Package,
  ChevronLeft,
  Calendar,
  UtensilsCrossed,
  Info,
  Sparkles,
  Loader2,
  Check,
  X,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RecipeDetailDialog } from '@/components/recipes/RecipeDetailDialog';
import { Recipe } from '@/types/recipe';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useShoppingListState } from '@/hooks/useShoppingListState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { format, startOfWeek, addWeeks, endOfWeek } from 'date-fns';

export default function ShoppingListPage() {
  const { recipes, getMealPlanForWeek, mealPlans, aisleCategories } = useRecipes();
  const { toast } = useToast();
  const { dietaryRestrictions, allergens } = useDietaryPreferences();

  // Shopping list state - syncs with database for logged-in users
  const {
    checkedItems,
    setCheckedItems,
    customItems,
    setCustomItems,
    categoryOverrides,
    setCategoryOverride,
    isLoading: isStateLoading,
    isSyncing
  } = useShoppingListState();
  const [selectedDays, setSelectedDays] = useLocalStorage<DayOfWeek[]>('shoppingListDays', [...DAYS_OF_WEEK]);
  const [newItemText, setNewItemText] = useState('');
  const [groupByAisle, setGroupByAisle] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [weekCount, setWeekCount] = useState(1); // 1, 2, or 3 weeks
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [additionalMealPlans, setAdditionalMealPlans] = useState<MealPlan[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // AI cleanup state
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    items: Array<{ id: string; ingredient: string; quantity: string; category: string; notes?: string }>;
    changes: string[];
  } | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const { session } = useAuth();

  const today = new Date();
  const selectedWeekStart = startOfWeek(addWeeks(today, selectedWeekOffset), { weekStartsOn: 1 });
  const selectedWeekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek = selectedWeekOffset === 0;

  // Fetch meal plan(s) when week or week count changes
  useEffect(() => {
    const fetchAllPlans = async () => {
      // Fetch the primary week
      const weekStartStr = format(selectedWeekStart, 'yyyy-MM-dd');
      const existingPlan = mealPlans.find(mp => mp.weekStartDate === weekStartStr);
      if (existingPlan) {
        setMealPlan(existingPlan);
      } else {
        const plan = await getMealPlanForWeek(weekStartStr);
        setMealPlan(plan);
      }

      // Fetch additional weeks if weekCount > 1
      if (weekCount > 1) {
        const additionalPlans: MealPlan[] = [];
        for (let i = 1; i < weekCount; i++) {
          const additionalWeekStart = addWeeks(selectedWeekStart, i);
          const additionalWeekStartStr = format(additionalWeekStart, 'yyyy-MM-dd');
          const existingAdditional = mealPlans.find(mp => mp.weekStartDate === additionalWeekStartStr);
          if (existingAdditional) {
            additionalPlans.push(existingAdditional);
          } else {
            const plan = await getMealPlanForWeek(additionalWeekStartStr);
            if (plan) {
              additionalPlans.push(plan);
            }
          }
        }
        setAdditionalMealPlans(additionalPlans);
      } else {
        setAdditionalMealPlans([]);
      }
    };

    fetchAllPlans();
  }, [selectedWeekOffset, weekCount, getMealPlanForWeek, mealPlans, selectedWeekStart]);

  const effectiveMealPlan = mealPlan || { id: '', weekStartDate: '', items: [] };

  // Combine all meal plans for multi-week shopping
  const allMealPlanItems = useMemo(() => {
    const items = [...effectiveMealPlan.items];
    additionalMealPlans.forEach(plan => {
      items.push(...plan.items);
    });
    return items;
  }, [effectiveMealPlan.items, additionalMealPlans]);

  // Generate shopping list from meal plan with smart ingredient normalization and merging
  const shoppingList = useMemo(() => {
    // Filter meal plan items by selected days (for single week) or include all (for multi-week)
    // For multi-week, we include all days since user wants everything
    const filteredPlanItems = weekCount > 1
      ? allMealPlanItems
      : allMealPlanItems.filter(item => selectedDays.includes(item.day as DayOfWeek));

    // Collect all ingredients for smart merging
    const rawIngredients: RawIngredientInput[] = [];
    
    filteredPlanItems.forEach(planItem => {
      const recipe = recipes.find(r => r.id === planItem.recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach(ingredient => {
        rawIngredients.push({
          item: ingredient.item,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          recipeId: recipe.id,
          servingsMultiplier: planItem.servingsMultiplier,
        });
      });
    });

    // Use the smart merging system
    const mergedIngredients = mergeIngredients(rawIngredients);

    // Convert to ShoppingListItem format
    const items: ShoppingListItem[] = mergedIngredients
      .map(item => {
        // Extract the primary quantity for display
        const primaryQty = item.quantities[0];

        // Apply category override if exists
        const effectiveCategory = categoryOverrides[item.key] || item.category;

        return {
          id: item.key,
          ingredient: item.displayName,
          quantity: primaryQty?.value ?? null,
          unit: primaryQty?.unit ?? '',
          recipeIds: item.recipeIds,
          checked: checkedItems[item.key] || false,
          category: effectiveCategory,
          isCustom: false,
          // Store the formatted total for display
          _totalDisplay: item.totalDisplay,
          _originalNames: item.originalNames,
          _alternatives: item.alternatives,
          _alternativeNote: item.alternativeNote,
          _sources: item.sources,
          _hasOverride: !!categoryOverrides[item.key],
        } as ShoppingListItem & {
          _totalDisplay?: string;
          _originalNames?: string[];
          _alternatives?: string[];
          _alternativeNote?: string;
          _sources?: Array<{ recipeId: string; amount: string }>;
          _hasOverride?: boolean;
        };
      });

    // Add custom items (add recipeIds: [] since custom items aren't from recipes)
    customItems.forEach(item => {
      items.push({
        ...item,
        recipeIds: [],
        checked: checkedItems[item.id] || false,
      });
    });

    return items;
  }, [allMealPlanItems, recipes, customItems, checkedItems, selectedDays, categoryOverrides, weekCount]);

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.length > 1 ? prev.filter(d => d !== day) : prev; // Keep at least one day
      }
      return [...prev, day];
    });
  };

  const selectAllDays = () => setSelectedDays([...DAYS_OF_WEEK]);
  const selectWeekdays = () => setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const selectWeekend = () => setSelectedDays(['saturday', 'sunday']);

  // Group items by category
  const groupedItems = useMemo(() => {
    if (!groupByAisle) return { 'All Items': shoppingList };

    const groups: Record<string, ShoppingListItem[]> = {};
    shoppingList.forEach(item => {
      const category = item.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });

    // Sort groups by aisle category order
    const sortedGroups: Record<string, ShoppingListItem[]> = {};
    aisleCategories.forEach(cat => {
      if (groups[cat]) {
        sortedGroups[cat] = groups[cat];
      }
    });
    // Add any remaining categories
    Object.keys(groups).forEach(cat => {
      if (!sortedGroups[cat]) {
        sortedGroups[cat] = groups[cat];
      }
    });

    return sortedGroups;
  }, [shoppingList, groupByAisle, aisleCategories]);

  const toggleItem = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const addCustomItem = () => {
    if (!newItemText.trim()) return;

    const newItem: ShoppingListItem = {
      id: `custom-${Date.now()}`,
      ingredient: newItemText.trim(),
      quantity: null,
      unit: '',
      recipeIds: [],
      checked: false,
      category: 'Other',
      isCustom: true,
    };

    setCustomItems(prev => [...prev, newItem]);
    setNewItemText('');
  };

  const removeCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(i => i.id !== id));
  };

  const clearChecked = () => {
    setCheckedItems({});
  };

  const copyToClipboard = () => {
    const text = shoppingList
      .filter(i => !i.checked)
      .map(i => {
        const item = i as ShoppingListItem & { _totalDisplay?: string };
        return item._totalDisplay || `${i.quantity || ''} ${i.unit || ''} ${i.ingredient}`.trim();
      })
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  const printList = () => {
    window.print();
  };

  const runAICleanup = async () => {
    if (!session?.access_token) {
      toast({
        title: "Sign in required",
        description: "Please sign in to use AI cleanup.",
        variant: "destructive",
      });
      return;
    }

    setIsCleaningUp(true);
    setCleanupError(null);
    setCleanupResult(null);

    try {
      // Prepare items for the AI
      const itemsForCleanup = shoppingList
        .filter(i => !i.checked)
        .map(i => {
          const extItem = i as ShoppingListItem & { _totalDisplay?: string };
          return {
            id: i.id,
            ingredient: i.ingredient,
            quantity: extItem._totalDisplay || (i.quantity ? `${i.quantity} ${i.unit}` : ''),
            category: i.category || 'Other',
          };
        });

      if (itemsForCleanup.length === 0) {
        toast({
          title: "No items",
          description: "Add some items to your shopping list first.",
        });
        setIsCleaningUp(false);
        return;
      }

      // Debug: Log session and URL info
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopping-list-cleanup`;
      console.log('🔍 Debug - Function URL:', functionUrl);
      console.log('🔍 Debug - Items to cleanup:', itemsForCleanup.length);
      console.log('🔍 Debug - Request body:', JSON.stringify({ items: itemsForCleanup }).substring(0, 500));

      // Use direct fetch for better error visibility
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: itemsForCleanup }),
      });

      console.log('🔍 Debug - Response status:', response.status);
      const responseText = await response.text();
      console.log('🔍 Debug - Response body:', responseText);

      if (!response.ok) {
        throw new Error(`Function error (${response.status}): ${responseText}`);
      }

      const result = JSON.parse(responseText);

      if (result?.error) {
        console.error('Function returned error:', result);
        throw new Error(result.error);
      }

      if (result?.error) {
        console.error('Function returned error:', result);
        throw new Error(result.error);
      }

      setCleanupResult(result);
      setCleanupDialogOpen(true);
    } catch (error) {
      console.error('AI cleanup error:', error);
      setCleanupError(error instanceof Error ? error.message : 'An error occurred');
      toast({
        title: "Cleanup failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  function categorizeIngredient(ingredient: string): string {
    const lower = ingredient.toLowerCase();

    // Categorization rules - order matters (check specific patterns first)

    // Meat & Seafood (comprehensive list including steak, turkey, etc.)
    if (/chicken|beef|steak|pork|lamb|turkey|duck|veal|fish|salmon|tuna|cod|tilapia|halibut|shrimp|prawn|crab|lobster|scallop|bacon|pancetta|ham|sausage|mince|ground meat/.test(lower)) return 'Meat & Seafood';

    // Dairy & Eggs
    if (/milk|cheese|cream|butter|yogurt|egg|sour cream|cottage cheese|ricotta|mozzarella|parmesan|cheddar/.test(lower)) return 'Dairy';

    // Produce (fruits and vegetables)
    if (/lettuce|tomato|onion|garlic|pepper|cucumber|broccoli|spinach|carrot|celery|potato|zucchini|mushroom|cabbage|kale|avocado|lemon|lime|orange|apple|banana|berry|grape/.test(lower)) return 'Produce';

    // Bakery
    if (/bread|bagel|tortilla|roll|bun|croissant|muffin|pita/.test(lower)) return 'Bakery';

    // Frozen
    if (/frozen/.test(lower)) return 'Frozen';

    // Spices & Seasonings
    if (/salt|pepper|oregano|basil|cumin|paprika|cinnamon|thyme|rosemary|sage|nutmeg|ginger|turmeric|curry|chili powder|cayenne|bay leaf|dill|parsley|cilantro|mint|seasoning|spice/.test(lower)) return 'Spices & Seasonings';

    // Condiments (check BEFORE beverages to avoid "juice" false matches)
    if (/sauce|ketchup|mustard|mayo|mayonnaise|vinegar|oil|dressing|relish|salsa|soy sauce|hot sauce|worcestershire|sriracha|honey|syrup|jam|jelly/.test(lower)) return 'Condiments';

    // Beverages (check last for liquid-like words)
    if (/water|juice|soda|coffee|tea|broth|stock|wine|beer/.test(lower) && !/steak/.test(lower)) return 'Beverages';

    return 'Pantry';
  }

  // Apply AI cleanup results to the shopping list
  const applyCleanupResults = () => {
    if (!cleanupResult) return;

    // Mark all current recipe-based items as checked (they're being replaced by consolidated items)
    const newCheckedItems: Record<string, boolean> = { ...checkedItems };
    shoppingList.forEach(item => {
      if (!item.isCustom) {
        newCheckedItems[item.id] = true;
      }
    });

    // Create new custom items from the AI cleanup result
    const newCustomItems: ShoppingListItem[] = cleanupResult.items.map(item => ({
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ingredient: item.ingredient,
      quantity: null, // Quantity is in the display string
      unit: item.quantity, // Store the full quantity string (e.g., "150g") in unit field for display
      recipeIds: [],
      checked: false,
      category: item.category,
      isCustom: true,
    }));

    // Update state
    setCheckedItems(newCheckedItems);
    setCustomItems(prev => {
      // Keep existing custom items that weren't part of the cleanup
      const existingCustom = prev.filter(item => checkedItems[item.id]);
      return [...existingCustom, ...newCustomItems];
    });

    // Close dialog and show success
    setCleanupDialogOpen(false);
    setCleanupResult(null);
    toast({
      title: "Cleanup applied!",
      description: `Your shopping list has been consolidated to ${cleanupResult.items.length} items.`,
    });
  };

  const checkedCount = shoppingList.filter(i => i.checked).length;
  const totalCount = shoppingList.length;

  return (
    <div className="container py-6 pb-28 md:pb-6 px-4 md:px-6 animate-fade-in max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-3xl font-bold mb-2">Shopping List</h1>
          {isSyncing && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-muted-foreground">
          {isStateLoading
            ? 'Loading your shopping list...'
            : totalCount > 0
              ? `${checkedCount} of ${totalCount} items checked`
              : 'No items in your shopping list'}
        </p>
      </div>

      {/* Week Selector */}
      <div className="mb-6 p-4 bg-card rounded-xl border border-border/50">
        {/* Week count selector */}
        <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-border/30">
          <span className="text-sm text-muted-foreground">Shopping for:</span>
          <div className="flex rounded-lg border border-border/50 p-0.5">
            {[1, 2, 3].map((count) => (
              <button
                key={count}
                onClick={() => setWeekCount(count)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  weekCount === count
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {count} {count === 1 ? 'week' : 'weeks'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedWeekOffset(prev => prev - 1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {weekCount === 1
                  ? (isCurrentWeek ? 'This Week' : selectedWeekOffset > 0 ? 'Next Week' : 'Previous Week')
                  : `Starting ${isCurrentWeek ? 'This Week' : selectedWeekOffset > 0 ? 'Next Week' : 'Previous Week'}`
                }
              </span>
              {isCurrentWeek && weekCount === 1 && (
                <Badge variant="secondary" className="text-xs">Current</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {weekCount === 1
                ? `${format(selectedWeekStart, 'MMM d')} - ${format(selectedWeekEnd, 'MMM d, yyyy')}`
                : `${format(selectedWeekStart, 'MMM d')} - ${format(endOfWeek(addWeeks(selectedWeekStart, weekCount - 1), { weekStartsOn: 1 }), 'MMM d, yyyy')}`
              }
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedWeekOffset(prev => prev + 1)}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!isCurrentWeek && (
          <div className="flex justify-center mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWeekOffset(0)}
              className="text-xs"
            >
              Back to This Week
            </Button>
          </div>
        )}
      </div>

      {/* Day Selection - only shown for single week */}
      {weekCount === 1 && (
        <div className="mb-6 p-4 bg-card rounded-xl border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Days to include</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={cn(
                  "py-2.5 rounded-lg text-xs font-medium capitalize transition-colors",
                  selectedDays.includes(day)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 text-xs">
            <button onClick={selectAllDays} className="text-primary hover:underline">All</button>
            <span className="text-muted-foreground">·</span>
            <button onClick={selectWeekdays} className="text-primary hover:underline">Weekdays</button>
            <span className="text-muted-foreground">·</span>
            <button onClick={selectWeekend} className="text-primary hover:underline">Weekend</button>
          </div>
        </div>
      )}

      {/* Controls - Toggle switches */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6 mb-4 md:mb-6">
        <label className="flex items-center gap-3 py-2 cursor-pointer">
          <Switch
            id="group-by-aisle"
            checked={groupByAisle}
            onCheckedChange={setGroupByAisle}
          />
          <span className="text-sm">Group by aisle</span>
        </label>

      </div>

      {/* Desktop action buttons - hidden on mobile */}
      <div className="hidden md:flex flex-wrap items-center gap-2 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={runAICleanup}
          disabled={isCleaningUp || shoppingList.filter(i => !i.checked).length === 0}
        >
          {isCleaningUp ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          Smart Cleanup
        </Button>
        <Button variant="outline" size="sm" onClick={clearChecked}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-1" />
          Copy
        </Button>
        <Button variant="outline" size="sm" onClick={printList}>
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
      </div>

      {/* Add custom item */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Add custom item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
        />
        <Button onClick={addCustomItem} disabled={!newItemText.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Shopping list - flat structure for sticky headers */}
      {totalCount > 0 ? (
        <div className="border border-border/50 rounded-xl">
          {Object.entries(groupedItems).flatMap(([category, items]) => [
            /* Sticky category header - rendered as sibling, not nested */
            <button
              key={`header-${category}`}
              onClick={() => toggleCategory(category)}
              className="sticky top-16 z-10 flex items-center gap-3 w-full py-4 px-4 md:px-5 bg-card hover:bg-muted/30 transition-colors border-b border-border/30 first:rounded-t-xl"
            >
              {expandedCategories[category] === false ? (
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <span className="font-semibold text-base">{category}</span>
              <span className="ml-auto text-sm text-muted-foreground">
                {items.filter(i => i.checked).length}/{items.length}
              </span>
            </button>,

            /* Items - conditionally rendered based on expanded state */
            expandedCategories[category] !== false && (
              <div key={`items-${category}`} className="divide-y divide-border/40 bg-card">
                {items.map(item => {
                    const extItem = item as ShoppingListItem & {
                      _totalDisplay?: string;
                      _alternatives?: string[];
                      _alternativeNote?: string;
                      _sources?: Array<{ recipeId: string; amount: string }>;
                    };
                    const qty = extItem._totalDisplay || (item.quantity ? `${item.quantity} ${item.unit}` : '');
                    const flags = checkDietaryFlags(item.ingredient, dietaryRestrictions, allergens);
                    const alts = extItem._alternatives || [];

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          "flex items-center gap-3 md:gap-4 min-h-[56px] md:min-h-[52px] py-3.5 md:py-3 px-4 md:px-5 cursor-pointer transition-colors select-none",
                          item.checked
                            ? "bg-muted/20"
                            : "hover:bg-muted/30 active:bg-muted/50"
                        )}
                      >
                        {/* Custom checkbox visual - larger touch target on mobile */}
                        <div className={cn(
                          "h-7 w-7 md:h-6 md:w-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                          item.checked
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/40"
                        )}>
                          {item.checked && <Check className="h-4 w-4 text-primary-foreground" />}
                        </div>

                        {/* Item content */}
                        <div className={cn(
                          "flex-1 min-w-0 flex items-center gap-2",
                          item.checked && "opacity-50"
                        )}>
                          <span className={cn(
                            "text-base",
                            item.checked && "line-through"
                          )}>
                            {qty && <span className="font-semibold text-primary">{qty} </span>}
                            {item.ingredient}
                          </span>

                          {/* Dietary warning - inline */}
                          {flags.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px]">
                                <p className="text-xs font-medium text-amber-600 mb-1">Dietary Warning</p>
                                {flags.map((flag, idx) => (
                                  <p key={idx} className="text-xs">
                                    {flag.type === 'allergen' ? 'Contains' : 'Not'} {flag.label.toLowerCase()}
                                  </p>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Alternatives tooltip */}
                          {alts.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px]">
                                <p className="text-xs">
                                  <span className="font-medium">Also works: </span>
                                  {alts.join(', ')}
                                </p>
                                {extItem._alternativeNote && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ({extItem._alternativeNote})
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>

                        {/* Recipe badge - subtle pill */}
                        {item.recipeIds.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-muted-foreground bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-full transition-colors flex-shrink-0"
                              >
                                {item.recipeIds.length} {item.recipeIds.length === 1 ? 'recipe' : 'recipes'}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-2" align="end">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                                  Used in:
                                </p>
                                {item.recipeIds.map(recipeId => {
                                  const recipe = recipes.find(r => r.id === recipeId);
                                  const sources = extItem._sources || [];
                                  const recipeSources = sources.filter(s => s.recipeId === recipeId);
                                  const amount = recipeSources.map(s => s.amount).filter(Boolean).join(' + ') || '';
                                  if (!recipe) {
                                    return (
                                      <div key={recipeId} className="text-xs text-muted-foreground px-2 py-1">
                                        Recipe not found: {recipeId.slice(0, 8)}...
                                      </div>
                                    );
                                  }
                                  return (
                                    <button
                                      key={recipeId}
                                      onClick={() => setSelectedRecipe(recipe)}
                                      className="flex items-center justify-between gap-2 w-full p-2 rounded-md hover:bg-muted transition-colors text-left"
                                    >
                                      <span className="flex items-center gap-2 min-w-0">
                                        <UtensilsCrossed className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm truncate">{recipe.title}</span>
                                      </span>
                                      {amount && (
                                        <span className="text-xs text-muted-foreground flex-shrink-0">
                                          {amount}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                                {/* Category edit moved to popover */}
                                {!item.isCustom && (
                                  <>
                                    <div className="border-t border-border/50 my-2" />
                                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                                      Move to category:
                                    </p>
                                    <div className="max-h-32 overflow-y-auto">
                                      {aisleCategories.map(cat => (
                                        <button
                                          key={cat}
                                          onClick={() => setCategoryOverride(item.id, cat)}
                                          className={cn(
                                            "flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted transition-colors text-left text-sm",
                                            item.category === cat && "bg-muted font-medium"
                                          )}
                                        >
                                          <Package className="h-3 w-3 text-muted-foreground" />
                                          {cat}
                                          {item.category === cat && (
                                            <Check className="h-3 w-3 ml-auto text-primary" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}

                        {/* Custom item remove button */}
                        {item.isCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCustomItem(item.id);
                            }}
                            className="text-muted-foreground hover:text-destructive text-xs flex-shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
            )
          ])}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-xl font-semibold mb-2">Your list is empty</h3>
          <p className="text-muted-foreground max-w-md">
            Add recipes to your meal plan and your shopping list will be automatically generated.
          </p>
        </div>
      )}

      {/* Recipe Detail Dialog */}
      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={!!selectedRecipe}
        onOpenChange={(open) => !open && setSelectedRecipe(null)}
        onToggleFavorite={() => {}}
        onToggleArchive={() => {}}
        onAddToMealPlan={() => {}}
        isLibraryRecipe={false}
      />

      {/* AI Cleanup Results Dialog */}
      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart Cleanup Results
            </DialogTitle>
            <DialogDescription>
              AI has analyzed your shopping list and suggests the following improvements:
            </DialogDescription>
          </DialogHeader>

          {cleanupResult && (
            <div className="space-y-4 mt-4">
              {/* Changes summary */}
              {cleanupResult.changes.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Changes Made
                  </h4>
                  <ul className="space-y-1">
                    {cleanupResult.changes.map((change, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cleaned items preview */}
              <div className="rounded-lg border p-4">
                <h4 className="font-medium text-sm mb-3">Cleaned Shopping List</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {cleanupResult.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                    >
                      <span className="text-sm">
                        <span className="font-medium">{item.quantity} </span>
                        {item.ingredient}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCleanupDialogOpen(false);
                    setCleanupResult(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={applyCleanupResults}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Apply Changes
                </Button>
              </div>
            </div>
          )}

          {cleanupError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 mt-4">
              <p className="text-sm text-destructive flex items-center gap-2">
                <X className="h-4 w-4" />
                {cleanupError}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background/95 backdrop-blur-sm border-t z-20 pb-safe">
        <div className="flex items-center justify-between gap-2 p-4 max-w-2xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={clearChecked}
            className="h-10"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={runAICleanup}
                disabled={isCleaningUp || shoppingList.filter(i => !i.checked).length === 0}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Smart Cleanup
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={printList}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
