import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DAYS_OF_WEEK,
  MEAL_SLOTS,
  DayOfWeek,
  MealSlot,
  Recipe,
  MealPlanItem,
  DisplayMealItem
} from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
import { format, startOfWeek, addDays, addWeeks, isSameWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Users,
  Plus,
  Heart,
  Utensils,
  Calendar,
  History,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  LayoutGrid,
  List
} from 'lucide-react';
import { DayListView } from '@/components/recipes/DayListView';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MealPlanDialog } from '@/components/recipes/MealPlanDialog';
import { WeeklySummary } from '@/components/recipes/WeeklySummary';
import { RecipeDetailDialog } from '@/components/recipes/RecipeDetailDialog';
import { MealCard } from '@/components/recipes/MealCard';
import { MealEditSheet } from '@/components/recipes/MealEditSheet';
import { MealPlanEmptyState } from '@/components/recipes/MealPlanEmptyState';
import { useHouseholdSettings } from '@/hooks/useHouseholdSettings';
import { useLocalStorage } from '@/hooks/useLocalStorage';

type FilterType = 'all' | 'favorites' | 'quick' | 'category';
type ViewMode = 'grid' | 'list';

// Hook to detect mobile screens
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export default function MealPlanPage() {
  const {
    recipes,
    mealPlans,
    getCurrentMealPlan,
    addToMealPlan,
    removeFromMealPlan,
    updateMealPlanItem,
    updateLeftoverPosition,
    categories,
    pantryStaples,
    toggleFavorite,
    toggleArchive,
    deleteRecipe
  } = useRecipes();
  const { toast } = useToast();
  const { householdSize } = useHouseholdSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<{ itemId: string; recipeId: string } | null>(null);
  const [selectedRecipeForPlan, setSelectedRecipeForPlan] = useState<Recipe | null>(null);
  const [selectedRecipeForView, setSelectedRecipeForView] = useState<Recipe | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWeekOffset, setSelectedWeekOffset] = useLocalStorage('mealPlanWeekOffset', 0);
  const [showSummary, setShowSummary] = useState(true);
  const [showRecipePanel, setShowRecipePanel] = useState(true);

  // View mode (auto-detect mobile)
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday');

  // Auto-switch to list view on mobile
  useEffect(() => {
    if (isMobile && viewMode === 'grid') {
      setViewMode('list');
    }
  }, [isMobile]);

  // Side panel editing state - store ID instead of copy for real-time updates
  const [editingItemId, setEditingItemId] = useState<{ itemId: string; recipe: Recipe } | null>(null);

  const currentMealPlan = getCurrentMealPlan();
  const today = new Date();
  const selectedWeekStart = startOfWeek(addWeeks(today, selectedWeekOffset), { weekStartsOn: 1 });
  const isCurrentWeek = selectedWeekOffset === 0;
  const isFutureWeek = selectedWeekOffset > 0;
  const canEdit = isCurrentWeek || isFutureWeek;

  // Get meal plan for selected week
  const selectedWeekPlan = useMemo(() => {
    const weekStartStr = format(selectedWeekStart, 'yyyy-MM-dd');
    return mealPlans.find(mp => mp.weekStartDate === weekStartStr) || {
      id: '',
      weekStartDate: weekStartStr,
      items: [],
      leftoverPositions: []
    };
  }, [mealPlans, selectedWeekStart]);

  // Derive current editing item from mealPlans state (ensures real-time updates)
  const editingItem = editingItemId
    ? {
        item: selectedWeekPlan.items.find(i => i.id === editingItemId.itemId) || null,
        recipe: editingItemId.recipe
      }
    : null;

  // Generate display items including virtual leftover cards
  const displayItemsMap = useMemo(() => {
    const map = new Map<string, DisplayMealItem[]>();
    
    // Initialize all slots
    DAYS_OF_WEEK.forEach(day => {
      MEAL_SLOTS.forEach(slot => {
        map.set(`${day}-${slot}`, []);
      });
    });
    
    // Add real items first
    selectedWeekPlan.items.forEach(item => {
      const recipe = recipes.find(r => r.id === item.recipeId);
      if (!recipe) return;
      
      const key = `${item.day}-${item.mealSlot}`;
      const existing = map.get(key) || [];
      existing.push({
        item,
        recipe,
        isLeftover: false,
      });
      map.set(key, existing);
    });
    
    // Generate virtual leftover cards
    selectedWeekPlan.items.forEach(item => {
      if (item.leftoverMeals <= 0) return;

      const recipe = recipes.find(r => r.id === item.recipeId);
      if (!recipe) return;

      const dayIndex = DAYS_OF_WEEK.indexOf(item.day as DayOfWeek);

      // Create leftover cards for each leftover meal
      for (let i = 0; i < item.leftoverMeals; i++) {
        // Check for custom position (now stored on the item itself)
        const customPos = item.leftoverPositions?.find(
          lp => lp.index === i
        );

        let targetDay: DayOfWeek;
        let targetSlot: MealSlot;

        if (customPos) {
          // Use custom position
          targetDay = customPos.day as DayOfWeek;
          targetSlot = customPos.slot;
        } else {
          // Default: next day's lunch
          const targetDayIndex = dayIndex + 1 + i;
          if (targetDayIndex >= DAYS_OF_WEEK.length) continue; // Skip if beyond the week
          targetDay = DAYS_OF_WEEK[targetDayIndex];
          targetSlot = 'lunch';
        }

        const key = `${targetDay}-${targetSlot}`;

        const leftoverItem: MealPlanItem = {
          id: `${item.id}-leftover-${i}`,
          recipeId: item.recipeId,
          day: targetDay,
          mealSlot: targetSlot,
          servingsMultiplier: item.servingsMultiplier,
          leftoverMeals: 0,
          isLeftover: true,
          sourceItemId: item.id,
        };

        const existing = map.get(key) || [];
        existing.push({
          item: leftoverItem,
          recipe,
          isLeftover: true,
          sourceItem: item,
          leftoverIndex: i, // Track which leftover this is
        });
        map.set(key, existing);
      }
    });

    return map;
  }, [selectedWeekPlan, recipes]);

  const filteredRecipes = useMemo(() => {
    let filtered = recipes.filter(r => !r.isArchived);
    
    switch (activeFilter) {
      case 'favorites':
        filtered = filtered.filter(r => r.isFavorite);
        break;
      case 'quick':
        filtered = filtered.filter(r => (r.totalTime || 0) <= 30);
        break;
      case 'category':
        if (selectedCategory) {
          filtered = filtered.filter(r => r.category === selectedCategory);
        }
        break;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [recipes, searchQuery, activeFilter, selectedCategory]);

  const getDisplayItemsForSlot = (day: DayOfWeek, slot: MealSlot): DisplayMealItem[] => {
    return displayItemsMap.get(`${day}-${slot}`) || [];
  };

  const handleDrop = async (e: React.DragEvent, day: string, slot: MealSlot) => {
    e.preventDefault();
    if (!canEdit) {
      toast({
        title: "Cannot modify past weeks",
        description: "You can only add recipes to current or future weeks.",
        variant: "destructive"
      });
      setDragOverSlot(null);
      setDraggingItem(null);
      return;
    }

    const recipeId = e.dataTransfer.getData('recipeId');
    const itemId = e.dataTransfer.getData('itemId');
    const isLeftover = e.dataTransfer.getData('isLeftover') === 'true';
    const sourceItemId = e.dataTransfer.getData('sourceItemId');
    const leftoverIndexStr = e.dataTransfer.getData('leftoverIndex');

    // Moving a leftover to a new position
    if (isLeftover && sourceItemId) {
      const leftoverIndex = leftoverIndexStr ? parseInt(leftoverIndexStr, 10) : 0;
      try {
        await updateLeftoverPosition(sourceItemId, leftoverIndex, day, slot);
        const recipe = recipes.find(r => r.id === recipeId);
        if (recipe) {
          toast({
            title: "Leftover moved",
            description: `${recipe.title} → ${day} ${slot}`,
          });
        }
      } catch (err) {
        console.error('Failed to update leftover position:', err);
        toast({
          title: "Error moving leftover",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
    // Moving an existing meal plan item
    else if (itemId && draggingItem) {
      updateMealPlanItem(itemId, { day, mealSlot: slot });
      const recipe = recipes.find(r => r.id === draggingItem.recipeId);
      if (recipe) {
        toast({
          title: "Moved",
          description: `${recipe.title} → ${day} ${slot}`,
        });
      }
    }
    // Adding a new recipe - auto-set servings and leftovers based on household size
    else if (recipeId) {
      const recipe = recipes.find(r => r.id === recipeId);
      const weekStartStr = format(selectedWeekStart, 'yyyy-MM-dd');
      const result = await addToMealPlan(recipeId, day, slot, weekStartStr);

      if (result && recipe) {
        // Calculate how many meals this recipe provides for the household
        const mealsFromRecipe = recipe.servings / householdSize;

        if (mealsFromRecipe <= 1) {
          // Recipe doesn't make enough for one meal - scale up to household size
          const multiplier = householdSize / recipe.servings;
          if (multiplier !== 1) {
            updateMealPlanItem(result.id, { servingsMultiplier: multiplier });
          }
          toast({
            title: "Added",
            description: `${recipe.title} scaled to ${householdSize} servings`,
          });
        } else {
          // Recipe makes more than one meal - auto-suggest leftovers
          const suggestedLeftovers = Math.floor(mealsFromRecipe) - 1;
          updateMealPlanItem(result.id, {
            servingsMultiplier: 1, // Cook full recipe as written
            leftoverMeals: suggestedLeftovers,
          });
          toast({
            title: "Added",
            description: suggestedLeftovers > 0
              ? `${recipe.title} + ${suggestedLeftovers} leftover${suggestedLeftovers > 1 ? 's' : ''}`
              : `${recipe.title} added`,
          });
        }
      }
    }

    setDragOverSlot(null);
    setDraggingItem(null);
  };

  const handleMealItemDragStart = (
    e: React.DragEvent,
    item: MealPlanItem,
    recipe: Recipe,
    displayItem?: DisplayMealItem
  ) => {
    // Always set recipe data for drop handling
    e.dataTransfer.setData('recipeId', recipe.id);
    e.dataTransfer.effectAllowed = 'move';

    // Always set dragging state for visual feedback
    setDraggingItem({ itemId: item.id, recipeId: recipe.id });

    // Handle leftover dragging - use displayItem for accurate source info
    if (displayItem?.isLeftover) {
      e.dataTransfer.setData('isLeftover', 'true');
      // Get source item ID from displayItem.sourceItem or fall back to item.sourceItemId
      const sourceId = displayItem.sourceItem?.id || item.sourceItemId;
      if (sourceId) {
        e.dataTransfer.setData('sourceItemId', sourceId);
      }
      // Set leftover index (default to 0 if not specified)
      const leftoverIdx = displayItem.leftoverIndex ?? 0;
      e.dataTransfer.setData('leftoverIndex', String(leftoverIdx));
    } else {
      // Dragging a regular meal item
      e.dataTransfer.setData('itemId', item.id);
    }
  };

  const handleMealItemDragEnd = () => {
    setDraggingItem(null);
  };

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    if (canEdit) {
      setDragOverSlot(slotId);
    }
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleCardClick = (displayItem: DisplayMealItem) => {
    if (displayItem.isLeftover && displayItem.sourceItem) {
      // Click on leftover opens the source item for editing
      setEditingItemId({ itemId: displayItem.sourceItem.id, recipe: displayItem.recipe });
    } else {
      setEditingItemId({ itemId: displayItem.item.id, recipe: displayItem.recipe });
    }
  };

  const updateServings = (itemId: string, newMultiplier: number) => {
    updateMealPlanItem(itemId, { servingsMultiplier: newMultiplier });
  };

  const updateLeftovers = (itemId: string, leftoverMeals: number) => {
    updateMealPlanItem(itemId, { leftoverMeals });
  };

  const dayLabels: Record<string, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };

  const getDailyNutrition = (day: DayOfWeek) => {
    let calories = 0;
    MEAL_SLOTS.forEach(slot => {
      const displayItems = getDisplayItemsForSlot(day, slot);
      displayItems.forEach(({ recipe, item, isLeftover, sourceItem }) => {
        if (recipe.nutrition) {
          // For leftover items, use source item's leftoverMeals count for correct calculation
          const leftoverCount = isLeftover && sourceItem
            ? sourceItem.leftoverMeals
            : (item.leftoverMeals || 0);
          // Calculate calories per eating occasion (spread across primary + leftovers)
          const totalMeals = 1 + leftoverCount;
          // Total calories for this cooking session
          const totalCalories = recipe.nutrition.perServing.calories * recipe.servings * item.servingsMultiplier;
          // Calories per meal (spread evenly across all eating occasions)
          const caloriesPerMeal = totalCalories / totalMeals;
          calories += caloriesPerMeal;
        }
      });
    });
    // Divide by household size to show per-person calories
    return { calories: Math.round(calories / householdSize) };
  };

  const quickFilters = [
    { id: 'all' as FilterType, label: 'All', icon: Utensils },
    { id: 'favorites' as FilterType, label: 'Favorites', icon: Heart },
    { id: 'quick' as FilterType, label: '≤30 min', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 animate-fade-in">
        {/* Header with week navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground">Meal Plan</h1>
              <p className="text-muted-foreground mt-1">
                Plan your week, track your meals
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center rounded-lg border border-border/50 p-0.5">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-7 px-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-7 px-2"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant={showRecipePanel ? 'outline' : 'default'}
                size="sm"
                onClick={() => setShowRecipePanel(!showRecipePanel)}
                className="gap-2"
              >
                {showRecipePanel ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{showRecipePanel ? 'Hide Recipes' : 'Show Recipes'}</span>
              </Button>
              <Button
                variant={showSummary ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowSummary(!showSummary)}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Weekly Summary</span>
              </Button>
            </div>
          </div>
          
          {/* Week Navigation */}
          <div className="flex items-center gap-3 mt-4 p-3 bg-card rounded-xl border border-border/50 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedWeekOffset(prev => prev - 1)}
              className="shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 text-center">
              <div className="font-semibold">
                {format(selectedWeekStart, 'MMMM d')} - {format(addDays(selectedWeekStart, 6), 'MMMM d, yyyy')}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                {isCurrentWeek ? (
                  <Badge variant="secondary" className="text-xs">This Week</Badge>
                ) : selectedWeekOffset < 0 ? (
                  <span className="flex items-center gap-1">
                    <History className="h-3 w-3" />
                    {Math.abs(selectedWeekOffset)} week{Math.abs(selectedWeekOffset) > 1 ? 's' : ''} ago
                  </span>
                ) : (
                  <span>{selectedWeekOffset} week{selectedWeekOffset > 1 ? 's' : ''} ahead</span>
                )}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedWeekOffset(prev => prev + 1)}
              className="shrink-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            
            {!isCurrentWeek && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWeekOffset(0)}
                className="shrink-0"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Today
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Recipe sidebar - Glass container */}
          {showRecipePanel && (
          <div className="lg:w-80 shrink-0">
            <div className="sticky top-20 space-y-4 glass rounded-2xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Recipes</h2>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/50"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                {quickFilters.map(filter => (
                  <Button
                    key={filter.id}
                    variant={activeFilter === filter.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setActiveFilter(filter.id);
                      setSelectedCategory(null);
                    }}
                    className="text-xs"
                  >
                    <filter.icon className="h-3 w-3 mr-1" />
                    {filter.label}
                  </Button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-1.5">
                {categories.slice(0, 6).map(category => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => {
                      setActiveFilter('category');
                      setSelectedCategory(selectedCategory === category ? null : category);
                    }}
                  >
                    {category}
                  </Badge>
                ))}
              </div>

              {/* Recipe List */}
              <ScrollArea className="h-[calc(100vh-420px)]">
                <div className="space-y-2 pr-2">
                  {filteredRecipes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recipes found
                    </p>
                  ) : (
                    filteredRecipes.map(recipe => (
                      <div
                        key={recipe.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('recipeId', recipe.id);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="group rounded-xl overflow-hidden bg-card/80 hover:bg-card shadow-sm card-hover cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex gap-3 p-2">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                            {recipe.imageUrl ? (
                              <img
                                src={recipe.imageUrl}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                <Utensils className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            {recipe.isFavorite && (
                              <div className="absolute top-1 right-1">
                                <Heart className="h-3 w-3 fill-accent text-accent" />
                              </div>
                            )}
                            {/* Drag hint overlay */}
                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-[9px] font-medium text-white bg-black/50 px-1.5 py-0.5 rounded transition-opacity">
                                Drag
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 py-0.5">
                            <h4 className="font-medium text-sm line-clamp-1">{recipe.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              {recipe.totalTime && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {recipe.totalTime}m
                                </span>
                              )}
                              <span className="flex items-center gap-0.5">
                                <Users className="h-3 w-3" />
                                {recipe.servings}
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-[10px] mt-1 px-1.5 py-0">
                              {recipe.category}
                            </Badge>
                          </div>
                        </div>
                        {/* Mobile add button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 h-7 text-xs lg:hidden"
                          onClick={() => setSelectedRecipeForPlan(recipe)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add to plan
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          )}

          {/* Calendar grid or List view */}
          <div className="flex-1 overflow-x-clip">
            {viewMode === 'grid' ? (
              <div className="min-w-[700px]">
                {/* Empty state when no meals planned */}
                {selectedWeekPlan.items.length === 0 && (
                  <MealPlanEmptyState
                    onBrowseRecipes={() => setShowRecipePanel(true)}
                  />
                )}

                {/* Day Headers - Hero treatment for today */}
                <div className="sticky top-16 z-20 bg-background pt-2 pb-4 -mx-2 px-2 grid grid-cols-7 gap-3">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const date = addDays(selectedWeekStart, index);
                    const isToday = isSameWeek(date, today, { weekStartsOn: 1 }) && date.getDate() === today.getDate();
                    const dailyNutrition = getDailyNutrition(day);

                    return (
                      <div
                        key={day}
                        className={cn(
                          "text-center p-4 rounded-2xl transition-all duration-300",
                          isToday
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/30"
                            : "bg-card/50 hover:bg-card"
                        )}
                      >
                        <div className={cn(
                          "text-xs font-semibold uppercase tracking-wider mb-1",
                          isToday ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {dayLabels[day]}
                        </div>
                        <div className={cn(
                          "text-3xl font-serif font-bold",
                          isToday ? "text-primary-foreground" : "text-foreground"
                        )}>
                          {format(date, 'd')}
                        </div>
                        {/* Meal dots indicator */}
                        <div className="flex justify-center gap-1.5 mt-2">
                          {MEAL_SLOTS.map(slot => {
                            const hasItems = getDisplayItemsForSlot(day, slot).length > 0;
                            return (
                              <div
                                key={slot}
                                className={cn(
                                  "w-2 h-2 rounded-full transition-all",
                                  hasItems
                                    ? isToday ? "bg-primary-foreground" : "bg-primary"
                                    : isToday ? "bg-primary-foreground/30" : "bg-muted-foreground/20"
                                )}
                              />
                            );
                          })}
                        </div>
                        {dailyNutrition.calories > 0 && (
                          <div className={cn(
                            "text-[10px] mt-1.5 font-medium",
                            isToday ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {dailyNutrition.calories} cal
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Meal Slots */}
                {MEAL_SLOTS.map(slot => (
                  <div key={slot} className="mb-5">
                    <div className="flex items-center gap-2 mb-3 pl-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {slot}
                      </span>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>

                    <div className="grid grid-cols-7 gap-3">
                      {DAYS_OF_WEEK.map(day => {
                        const slotId = `${day}-${slot}`;
                        const displayItems = getDisplayItemsForSlot(day, slot);
                        const isOver = dragOverSlot === slotId;
                        const hasItems = displayItems.length > 0;

                        return (
                          <div
                            key={slotId}
                            onDrop={(e) => handleDrop(e, day, slot)}
                            onDragOver={(e) => handleDragOver(e, slotId)}
                            onDragLeave={handleDragLeave}
                            className={cn(
                              "min-h-[140px] rounded-2xl transition-all duration-300 p-2",
                              hasItems
                                ? "bg-transparent"
                                : "glass-subtle border border-dashed border-muted-foreground/20 hover:border-muted-foreground/40",
                              isOver && "bg-primary/10 border-primary drop-target scale-[1.02] shadow-lg shadow-primary/10",
                              !canEdit && "opacity-70 cursor-not-allowed"
                            )}
                          >
                            {hasItems ? (
                              <div className="space-y-2">
                                {displayItems.map((displayItem) => (
                                  <MealCard
                                    key={displayItem.item.id}
                                    recipe={displayItem.recipe}
                                    item={displayItem.item}
                                    isLeftover={displayItem.isLeftover}
                                    leftoverSource={displayItem.sourceItem ? {
                                      day: displayItem.sourceItem.day,
                                      mealSlot: displayItem.sourceItem.mealSlot
                                    } : undefined}
                                    sourceLeftoverMeals={displayItem.sourceItem?.leftoverMeals}
                                    householdSize={householdSize}
                                    isDragging={draggingItem?.itemId === displayItem.item.id}
                                    onDragStart={(e) => handleMealItemDragStart(e, displayItem.item, displayItem.recipe, displayItem)}
                                    onDragEnd={handleMealItemDragEnd}
                                    onClick={() => handleCardClick(displayItem)}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center py-6 group/slot">
                                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2 group-hover/slot:bg-primary/10 transition-colors">
                                  <Plus className="h-5 w-5 text-muted-foreground/40 group-hover/slot:text-primary transition-colors" />
                                </div>
                                <span className="text-xs text-muted-foreground/50 group-hover/slot:text-muted-foreground transition-colors">
                                  {canEdit ? 'Drop recipe' : 'No meal'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <DayListView
                selectedDay={selectedDay}
                onDayChange={setSelectedDay}
                weekStartDate={selectedWeekStart}
                displayItemsMap={displayItemsMap}
                householdSize={householdSize}
                canEdit={canEdit}
                draggingItem={draggingItem}
                dragOverSlot={dragOverSlot}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDragStart={handleMealItemDragStart}
                onDragEnd={handleMealItemDragEnd}
                onCardClick={handleCardClick}
              />
            )}

            {/* Weekly Summary Panel */}
            {showSummary && (
              <div className="mt-6">
                <WeeklySummary
                  recipes={recipes}
                  mealPlanItems={selectedWeekPlan.items}
                  pantryStaples={pantryStaples}
                  householdSize={householdSize}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile add to plan dialog */}
        <MealPlanDialog
          open={!!selectedRecipeForPlan}
          onOpenChange={() => setSelectedRecipeForPlan(null)}
          recipe={selectedRecipeForPlan}
        />

        {/* Recipe detail dialog */}
        <RecipeDetailDialog
          recipe={selectedRecipeForView}
          open={!!selectedRecipeForView}
          onOpenChange={(open) => !open && setSelectedRecipeForView(null)}
          onToggleFavorite={toggleFavorite}
          onToggleArchive={toggleArchive}
          onEdit={() => {}}
          onDelete={deleteRecipe}
          onAddToMealPlan={(recipe) => {
            setSelectedRecipeForView(null);
            setSelectedRecipeForPlan(recipe);
          }}
        />

        {/* Meal edit side panel */}
        <MealEditSheet
          open={!!editingItem?.item}
          onOpenChange={(open) => !open && setEditingItemId(null)}
          recipe={editingItem?.recipe || null}
          item={editingItem?.item || null}
          householdSize={householdSize}
          onUpdateServings={updateServings}
          onUpdateLeftovers={updateLeftovers}
          onRemove={(itemId) => {
            removeFromMealPlan(itemId);
            setEditingItemId(null);
          }}
          onViewRecipe={(recipe) => {
            setEditingItemId(null);
            setSelectedRecipeForView(recipe);
          }}
        />
      </div>
    </div>
  );
}
