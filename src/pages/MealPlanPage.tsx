import { useState, useMemo, useCallback } from 'react';
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
  PanelLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MealPlanDialog } from '@/components/recipes/MealPlanDialog';
import { WeeklySummary } from '@/components/recipes/WeeklySummary';
import { RecipeDetailDialog } from '@/components/recipes/RecipeDetailDialog';
import { MealCard } from '@/components/recipes/MealCard';
import { MealEditSheet } from '@/components/recipes/MealEditSheet';
import { useHouseholdSettings } from '@/hooks/useHouseholdSettings';

type FilterType = 'all' | 'favorites' | 'quick' | 'category';

export default function MealPlanPage() {
  const { 
    recipes, 
    mealPlans, 
    getCurrentMealPlan, 
    addToMealPlan, 
    removeFromMealPlan, 
    updateMealPlanItem, 
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
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [showSummary, setShowSummary] = useState(true);
  const [showRecipePanel, setShowRecipePanel] = useState(true);
  
  // Side panel editing state
  const [editingItem, setEditingItem] = useState<{ item: MealPlanItem; recipe: Recipe } | null>(null);
  
  const currentMealPlan = getCurrentMealPlan();
  const today = new Date();
  const selectedWeekStart = startOfWeek(addWeeks(today, selectedWeekOffset), { weekStartsOn: 1 });
  const isCurrentWeek = selectedWeekOffset === 0;
  const isFutureWeek = selectedWeekOffset > 0;
  const canEdit = isCurrentWeek || isFutureWeek;
  
  // Get meal plan for selected week
  const selectedWeekPlan = useMemo(() => {
    const weekStartStr = format(selectedWeekStart, 'yyyy-MM-dd');
    return mealPlans.find(mp => mp.weekStartDate === weekStartStr) || { id: '', weekStartDate: weekStartStr, items: [] };
  }, [mealPlans, selectedWeekStart]);

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
        // Try to place leftovers in lunch slots on subsequent days
        const targetDayIndex = dayIndex + 1 + i;
        if (targetDayIndex >= DAYS_OF_WEEK.length) continue; // Skip if beyond the week
        
        const targetDay = DAYS_OF_WEEK[targetDayIndex];
        // Default leftovers to lunch
        const targetSlot: MealSlot = 'lunch';
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
        });
        map.set(key, existing);
      }
    });
    
    return map;
  }, [selectedWeekPlan.items, recipes]);

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
    
    // Moving an existing meal plan item
    if (itemId && draggingItem) {
      updateMealPlanItem(itemId, { day, mealSlot: slot });
      const recipe = recipes.find(r => r.id === draggingItem.recipeId);
      if (recipe) {
        toast({
          title: "Moved",
          description: `${recipe.title} → ${day} ${slot}`,
        });
      }
    } 
    // Adding a new recipe - auto-set servings to household size
    else if (recipeId) {
      const recipe = recipes.find(r => r.id === recipeId);
      const weekStartStr = format(selectedWeekStart, 'yyyy-MM-dd');
      const result = await addToMealPlan(recipeId, day, slot, weekStartStr);
      
      // Auto-adjust to household size
      if (result && recipe) {
        const multiplier = householdSize / recipe.servings;
        if (multiplier !== 1) {
          updateMealPlanItem(result.id, { servingsMultiplier: multiplier });
        }
        toast({
          title: "Added",
          description: `${recipe.title} added for ${householdSize} servings`,
        });
      }
    }
    
    setDragOverSlot(null);
    setDraggingItem(null);
  };

  const handleMealItemDragStart = (e: React.DragEvent, item: MealPlanItem, recipe: Recipe) => {
    if (item.isLeftover) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.setData('recipeId', recipe.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingItem({ itemId: item.id, recipeId: recipe.id });
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
      setEditingItem({ item: displayItem.sourceItem, recipe: displayItem.recipe });
    } else {
      setEditingItem({ item: displayItem.item, recipe: displayItem.recipe });
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
      displayItems.forEach(({ recipe, item, isLeftover }) => {
        if (recipe.nutrition) {
          // Don't double-count leftovers - they come from the same cooking
          // Only count if it's the primary meal
          if (!isLeftover) {
            const totalMeals = 1 + (item.leftoverMeals || 0);
            calories += recipe.nutrition.perServing.calories * item.servingsMultiplier;
          }
        }
      });
    });
    return { calories: Math.round(calories) };
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
                Weekly Summary
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
          {/* Recipe sidebar */}
          {showRecipePanel && (
          <div className="lg:w-80 shrink-0">
            <div className="sticky top-20 space-y-4 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
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
                  className="pl-10"
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
                        className="group p-2 bg-secondary/30 rounded-xl border border-border/30 cursor-grab active:cursor-grabbing hover:shadow-md hover:bg-secondary/50 transition-all"
                      >
                        <div className="flex gap-3">
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                            {recipe.imageUrl ? (
                              <img
                                src={recipe.imageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            {recipe.isFavorite && (
                              <div className="absolute top-1 right-1">
                                <Heart className="h-3 w-3 fill-accent text-accent" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm truncate">{recipe.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
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

          {/* Calendar grid */}
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-3">
                {DAYS_OF_WEEK.map((day, index) => {
                  const date = addDays(selectedWeekStart, index);
                  const isToday = isSameWeek(date, today, { weekStartsOn: 1 }) && date.getDate() === today.getDate();
                  const dailyNutrition = getDailyNutrition(day);
                  
                  return (
                    <div 
                      key={day} 
                      className={cn(
                        "text-center p-3 rounded-xl transition-colors",
                        isToday && "bg-primary/10 border border-primary/20"
                      )}
                    >
                      <div className={cn(
                        "font-semibold text-sm",
                        isToday && "text-primary"
                      )}>
                        {dayLabels[day]}
                      </div>
                      <div className={cn(
                        "text-lg font-serif",
                        isToday ? "text-primary" : "text-foreground"
                      )}>
                        {format(date, 'd')}
                      </div>
                      {dailyNutrition.calories > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                          {dailyNutrition.calories} cal
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Meal Slots */}
              {MEAL_SLOTS.map(slot => (
                <div key={slot} className="mb-4">
                  <div className="flex items-center gap-2 mb-2 pl-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {slot}
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
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
                            "min-h-[100px] rounded-xl border-2 border-dashed transition-all p-1.5",
                            hasItems 
                              ? "border-transparent bg-transparent" 
                              : "border-border/40 bg-muted/20 hover:bg-muted/30",
                            isOver && "border-primary bg-primary/5 scale-[1.02]",
                            !canEdit && "opacity-80"
                          )}
                        >
                          {hasItems ? (
                            <div className="space-y-1.5">
                              {displayItems.map((displayItem) => (
                                <MealCard
                                  key={displayItem.item.id}
                                  recipe={displayItem.recipe}
                                  item={displayItem.item}
                                  isLeftover={displayItem.isLeftover}
                                  householdSize={householdSize}
                                  isDragging={draggingItem?.itemId === displayItem.item.id}
                                  onDragStart={(e) => handleMealItemDragStart(e, displayItem.item, displayItem.recipe)}
                                  onDragEnd={handleMealItemDragEnd}
                                  onClick={() => handleCardClick(displayItem)}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <span className="text-xs text-muted-foreground/60">
                                {canEdit ? 'Drop recipe' : '—'}
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
            
            {/* Weekly Summary Panel */}
            {showSummary && (
              <div className="mt-6">
                <WeeklySummary
                  recipes={recipes}
                  mealPlanItems={selectedWeekPlan.items}
                  pantryStaples={pantryStaples}
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
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          recipe={editingItem?.recipe || null}
          item={editingItem?.item || null}
          householdSize={householdSize}
          onUpdateServings={updateServings}
          onUpdateLeftovers={updateLeftovers}
          onRemove={(itemId) => {
            removeFromMealPlan(itemId);
            setEditingItem(null);
          }}
          onViewRecipe={(recipe) => {
            setEditingItem(null);
            setSelectedRecipeForView(recipe);
          }}
        />
      </div>
    </div>
  );
}
