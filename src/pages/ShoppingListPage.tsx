import { useState, useMemo, useEffect, useRef } from 'react';
import { useRecipes } from '@/context/RecipeContext';
import { ShoppingListItem, DEFAULT_AISLE_CATEGORIES, DAYS_OF_WEEK, DayOfWeek, MealPlan, MealSlot } from '@/types/recipe';
import { mergeIngredients, type RawIngredientInput } from '@/lib/ingredientNormalizer/index';
import { useDietaryPreferences } from '@/hooks/useDietaryPreferences';
import { checkDietaryFlags } from '@/lib/dietaryFlags';
import { useUnplannedLinkedRecipes, useActiveReplacements } from '@/hooks/useRecipeLinks';
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
  Loader2,
  Check,
  X,
  AlertTriangle,
  MoreHorizontal,
  Link2
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
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
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
  const { recipes, getMealPlanForWeek, mealPlans, aisleCategories, addToMealPlan } = useRecipes();
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
    clearAllCustomItems,
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

  // Dismissed linked recipe reminders (per recipe ID)
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(new Set());

  // Use ref to access mealPlans without causing useEffect re-runs
  const mealPlansRef = useRef(mealPlans);
  mealPlansRef.current = mealPlans;

  // One-time clear of stale custom items (can remove this effect after clearing)
  useEffect(() => {
    if (customItems.length > 0) {
      clearAllCustomItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const today = new Date();
  const selectedWeekStart = startOfWeek(addWeeks(today, selectedWeekOffset), { weekStartsOn: 1 });
  const selectedWeekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek = selectedWeekOffset === 0;

  // Fetch meal plan(s) when week or week count changes
  useEffect(() => {
    const fetchAllPlans = async () => {
      // Fetch the primary week
      const weekStartStr = format(selectedWeekStart, 'yyyy-MM-dd');
      const existingPlan = mealPlansRef.current.find(mp => mp.weekStartDate === weekStartStr);
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
          const existingAdditional = mealPlansRef.current.find(mp => mp.weekStartDate === additionalWeekStartStr);
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
  }, [selectedWeekOffset, weekCount, getMealPlanForWeek]);

  const effectiveMealPlan = mealPlan || { id: '', weekStartDate: '', items: [] };

  // Combine all meal plans for multi-week shopping
  const allMealPlanItems = useMemo(() => {
    const items = [...effectiveMealPlan.items];
    additionalMealPlans.forEach(plan => {
      items.push(...plan.items);
    });
    return items;
  }, [effectiveMealPlan.items, additionalMealPlans]);

  // Check for linked recipes that aren't in the meal plan
  const { unplannedLinks, isLoading: isLoadingLinks } = useUnplannedLinkedRecipes(
    allMealPlanItems,
    recipes
  );

  // Get active ingredient replacements for recipes in the meal plan
  const { replacementsMap, replacementDetails } = useActiveReplacements(allMealPlanItems, recipes);

  // Filter out dismissed reminders
  const activeUnplannedLinks = useMemo(() => {
    return unplannedLinks.filter(
      link => !dismissedReminders.has(link.unplannedLinkedRecipe.id)
    );
  }, [unplannedLinks, dismissedReminders]);

  // Handle adding a linked recipe to the meal plan
  const handleAddLinkedRecipe = async (recipeId: string, day: DayOfWeek, slot: MealSlot) => {
    const weekStartStr = format(selectedWeekStart, 'yyyy-MM-dd');
    const result = await addToMealPlan(recipeId, day, slot, weekStartStr);

    if (result) {
      toast({
        title: 'Added to meal plan',
        description: 'The linked recipe has been added to your meal plan.',
      });
    }
  };

  // Dismiss a reminder (user chose "skip" or "buy store-bought")
  const dismissReminder = (recipeId: string) => {
    setDismissedReminders(prev => new Set([...prev, recipeId]));
  };

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

      // Get the set of ingredient IDs to exclude for this recipe (replaced by linked recipes)
      const excludedIngredientIds = replacementsMap.get(planItem.recipeId) || new Set();

      recipe.ingredients.forEach(ingredient => {
        // Skip ingredients that are being replaced by a linked recipe
        if (ingredient.id && excludedIngredientIds.has(ingredient.id)) {
          return; // This ingredient is being replaced - don't add to shopping list
        }

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
  }, [allMealPlanItems, recipes, customItems, checkedItems, selectedDays, categoryOverrides, weekCount, replacementsMap]);

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

      {/* Group by aisle toggle — sticky on mobile, above day selector */}
      <div className="sticky top-16 z-10 bg-background py-2 -mx-4 px-4 md:static md:mx-0 md:px-0 md:py-0 mb-4">
        <label className="flex items-center gap-3 py-2 cursor-pointer">
          <Switch
            id="group-by-aisle"
            checked={groupByAisle}
            onCheckedChange={setGroupByAisle}
          />
          <span className="text-sm">Group by aisle</span>
        </label>
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

      {/* Desktop action buttons - hidden on mobile */}
      <div className="hidden md:flex flex-wrap items-center gap-2 mb-6">
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

      {/* Active replacements info banner */}
      {replacementDetails.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-1">
                Ingredient Replacements Active
              </p>
              <div className="space-y-1">
                {replacementDetails.map((detail) => (
                  <p key={`${detail.mainRecipeId}-${detail.linkedRecipeId}`} className="text-sm text-blue-700 dark:text-blue-300">
                    <span className="font-medium">{detail.linkedRecipeTitle}</span> replaces{' '}
                    <span className="italic">{detail.replacedIngredientNames.join(', ')}</span> in{' '}
                    <span className="font-medium">{detail.mainRecipeTitle}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Linked recipes reminder banner */}
      {activeUnplannedLinks.length > 0 && (
        <div className="mb-6 space-y-3">
          {activeUnplannedLinks.map(({ plannedRecipe, unplannedLinkedRecipe }) => (
            <div
              key={unplannedLinkedRecipe.id}
              className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Link2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-amber-800 dark:text-amber-200 mb-1">
                    Heads up
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    You're making <span className="font-medium">{plannedRecipe.title}</span> but didn't plan{' '}
                    <span className="font-medium">{unplannedLinkedRecipe.title}</span>. Need to make it?
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="default" className="h-8 bg-amber-600 hover:bg-amber-700 text-white">
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add to plan
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="start">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                          Add to which day?
                        </p>
                        <div className="space-y-1">
                          {DAYS_OF_WEEK.map(day => (
                            <button
                              key={day}
                              onClick={() => {
                                handleAddLinkedRecipe(unplannedLinkedRecipe.id, day, 'dinner');
                                dismissReminder(unplannedLinkedRecipe.id);
                              }}
                              className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted transition-colors text-left text-sm capitalize"
                            >
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {day}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                      onClick={() => dismissReminder(unplannedLinkedRecipe.id)}
                    >
                      Buy store-bought
                    </Button>
                  </div>
                </div>
                <button
                  onClick={() => dismissReminder(unplannedLinkedRecipe.id)}
                  className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
