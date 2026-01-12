import { useState, useMemo, useEffect } from 'react';
import { useRecipes } from '@/context/RecipeContext';
import { ShoppingListItem, DEFAULT_AISLE_CATEGORIES, DAYS_OF_WEEK, DayOfWeek, MealPlan } from '@/types/recipe';
import { getIngredientKey, getDisplayName } from '@/lib/ingredientNormalizer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, startOfWeek, addWeeks, endOfWeek } from 'date-fns';

export default function ShoppingListPage() {
  const { recipes, getMealPlanForWeek, mealPlans, pantryStaples, aisleCategories } = useRecipes();
  const { toast } = useToast();
  
  const [checkedItems, setCheckedItems] = useLocalStorage<Record<string, boolean>>('shoppingListChecked', {});
  const [customItems, setCustomItems] = useLocalStorage<ShoppingListItem[]>('customShoppingItems', []);
  const [selectedDays, setSelectedDays] = useLocalStorage<DayOfWeek[]>('shoppingListDays', [...DAYS_OF_WEEK]);
  const [newItemText, setNewItemText] = useState('');
  const [groupByAisle, setGroupByAisle] = useState(true);
  const [excludeStaples, setExcludeStaples] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);

  const today = new Date();
  const selectedWeekStart = startOfWeek(addWeeks(today, selectedWeekOffset), { weekStartsOn: 1 });
  const selectedWeekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek = selectedWeekOffset === 0;

  // Fetch meal plan when week changes
  useEffect(() => {
    const weekStartStr = format(selectedWeekStart, 'yyyy-MM-dd');
    
    // First check if we already have it in mealPlans
    const existingPlan = mealPlans.find(mp => mp.weekStartDate === weekStartStr);
    if (existingPlan) {
      setMealPlan(existingPlan);
    } else {
      getMealPlanForWeek(weekStartStr).then(plan => {
        setMealPlan(plan);
      });
    }
  }, [selectedWeekOffset, getMealPlanForWeek, mealPlans, selectedWeekStart]);

  const effectiveMealPlan = mealPlan || { id: '', weekStartDate: '', items: [] };

  // Generate shopping list from meal plan with ingredient normalization
  const shoppingList = useMemo(() => {
    // Track items by normalized key, with original names for display
    const itemsMap = new Map<string, ShoppingListItem & { originalNames: string[] }>();

    // Filter meal plan items by selected days
    const filteredPlanItems = effectiveMealPlan.items.filter(item => 
      selectedDays.includes(item.day as DayOfWeek)
    );

    filteredPlanItems.forEach(planItem => {
      const recipe = recipes.find(r => r.id === planItem.recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach(ingredient => {
        // Use normalized key for grouping similar ingredients
        const normalizedKey = getIngredientKey(ingredient.item);
        const originalKey = ingredient.item.toLowerCase().trim();
        
        // Skip pantry staples if excluded
        if (excludeStaples && pantryStaples.some(s => 
          normalizedKey.includes(s.toLowerCase()) || originalKey.includes(s.toLowerCase())
        )) {
          return;
        }

        // Create a compound key that includes both normalized ingredient and unit
        const mapKey = `${normalizedKey}::${ingredient.unit.toLowerCase()}`;
        const existing = itemsMap.get(mapKey);
        const quantity = ingredient.quantity ? ingredient.quantity * planItem.servingsMultiplier : null;

        if (existing) {
          // Merge quantities
          if (quantity !== null && existing.quantity !== null) {
            existing.quantity += quantity;
          }
          existing.recipeIds = [...new Set([...existing.recipeIds, recipe.id])];
          // Track original names for display
          if (!existing.originalNames.includes(ingredient.item)) {
            existing.originalNames.push(ingredient.item);
          }
        } else {
          itemsMap.set(mapKey, {
            id: mapKey,
            ingredient: ingredient.item,
            quantity,
            unit: ingredient.unit,
            recipeIds: [recipe.id],
            checked: false,
            category: categorizeIngredient(ingredient.item),
            isCustom: false,
            originalNames: [ingredient.item],
          });
        }
      });
    });

    // Add custom items
    customItems.forEach(item => {
      const customKey = `custom::${item.id}`;
      itemsMap.set(customKey, { ...item, originalNames: [item.ingredient] });
    });

    return Array.from(itemsMap.values()).map(item => ({
      ...item,
      // Use the shortest/simplest original name for display
      ingredient: getDisplayName(item.ingredient, item.originalNames),
      checked: checkedItems[item.id] || false,
    }));
  }, [effectiveMealPlan, recipes, customItems, checkedItems, excludeStaples, pantryStaples, selectedDays]);

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
    toast({ title: "Item added", description: `"${newItemText}" added to your list.` });
  };

  const removeCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(i => i.id !== id));
  };

  const clearChecked = () => {
    setCheckedItems({});
    toast({ title: "List reset", description: "All items unchecked." });
  };

  const copyToClipboard = () => {
    const text = shoppingList
      .map(item => {
        const qty = item.quantity ? `${item.quantity} ${item.unit}` : '';
        return `${item.checked ? '☑' : '☐'} ${qty} ${item.ingredient}`.trim();
      })
      .join('\n');

    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Shopping list copied to clipboard." });
  };

  const printList = () => {
    window.print();
  };

  function categorizeIngredient(ingredient: string): string {
    const lower = ingredient.toLowerCase();
    
    // Simple categorization rules
    if (/chicken|beef|pork|lamb|fish|salmon|shrimp|bacon|pancetta/.test(lower)) return 'Meat & Seafood';
    if (/milk|cheese|cream|butter|yogurt|egg/.test(lower)) return 'Dairy';
    if (/lettuce|tomato|onion|garlic|pepper|cucumber|broccoli|spinach|carrot/.test(lower)) return 'Produce';
    if (/bread|bagel|tortilla|roll/.test(lower)) return 'Bakery';
    if (/frozen/.test(lower)) return 'Frozen';
    if (/salt|pepper|oregano|basil|cumin|paprika|cinnamon/.test(lower)) return 'Spices & Seasonings';
    if (/sauce|ketchup|mustard|mayo|vinegar|oil/.test(lower)) return 'Condiments';
    if (/water|juice|soda|coffee|tea/.test(lower)) return 'Beverages';
    
    return 'Pantry';
  }

  const checkedCount = shoppingList.filter(i => i.checked).length;
  const totalCount = shoppingList.length;

  return (
    <div className="container py-6 animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-2">Shopping List</h1>
        <p className="text-muted-foreground">
          {totalCount > 0 
            ? `${checkedCount} of ${totalCount} items checked`
            : 'No items in your shopping list'}
        </p>
      </div>

      {/* Week Selector */}
      <div className="mb-6 p-4 bg-card rounded-xl border border-border/50">
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
                {isCurrentWeek ? 'This Week' : selectedWeekOffset > 0 ? 'Next Week' : 'Previous Week'}
              </span>
              {isCurrentWeek && (
                <Badge variant="secondary" className="text-xs">Current</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(selectedWeekStart, 'MMM d')} - {format(selectedWeekEnd, 'MMM d, yyyy')}
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

      {/* Day Selection */}
      <div className="mb-6 p-4 bg-card rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Days to include</span>
          <div className="flex-1" />
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAllDays}>All</Button>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectWeekdays}>Weekdays</Button>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectWeekend}>Weekend</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map(day => (
            <Badge
              key={day}
              variant={selectedDays.includes(day) ? 'default' : 'outline'}
              className={cn(
                "cursor-pointer capitalize transition-colors",
                selectedDays.includes(day) && "bg-primary"
              )}
              onClick={() => toggleDay(day)}
            >
              {day.slice(0, 3)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Switch
            id="group-by-aisle"
            checked={groupByAisle}
            onCheckedChange={setGroupByAisle}
          />
          <Label htmlFor="group-by-aisle" className="text-sm">Group by aisle</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="exclude-staples"
            checked={excludeStaples}
            onCheckedChange={setExcludeStaples}
          />
          <Label htmlFor="exclude-staples" className="text-sm">Exclude pantry staples</Label>
        </div>

        <div className="flex-1" />

        <div className="flex gap-2">
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

      {/* Shopping list */}
      {totalCount > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Collapsible
              key={category}
              open={expandedCategories[category] !== false}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors">
                  {expandedCategories[category] === false ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{category}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {items.filter(i => i.checked).length}/{items.length}
                  </Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pl-8 space-y-1 mt-1">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg transition-colors",
                        item.checked ? "opacity-50" : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      <span className={cn(
                        "flex-1",
                        item.checked && "line-through text-muted-foreground"
                      )}>
                        {item.quantity && (
                          <span className="font-medium">
                            {item.quantity} {item.unit}{' '}
                          </span>
                        )}
                        {item.ingredient}
                      </span>
                      {item.recipeIds.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {item.recipeIds.length} recipe{item.recipeIds.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {item.isCustom && (
                        <button
                          onClick={() => removeCustomItem(item.id)}
                          className="text-muted-foreground hover:text-destructive text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
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
    </div>
  );
}
