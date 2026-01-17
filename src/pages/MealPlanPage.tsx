import { useState, useMemo } from 'react';
import { DAYS_OF_WEEK, MEAL_SLOTS, DayOfWeek, MealSlot, Recipe, MealPlanItem } from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  X, 
  Clock, 
  Users,
  Minus,
  Plus,
  Heart,
  Utensils,
  Calendar,
  History,
  BarChart3,
  Eye,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MealPlanDialog } from '@/components/recipes/MealPlanDialog';
import { WeeklySummary } from '@/components/recipes/WeeklySummary';
import { RecipeDetailDialog } from '@/components/recipes/RecipeDetailDialog';

interface PlannedRecipeDisplay {
  recipe: Recipe;
  item: MealPlanItem;
}

type FilterType = 'all' | 'favorites' | 'quick' | 'category';

export default function MealPlanPage() {
  const { recipes, mealPlans, getCurrentMealPlan, addToMealPlan, removeFromMealPlan, updateMealPlanItem, categories, pantryStaples, toggleFavorite, toggleArchive, deleteRecipe } = useRecipes();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<{ itemId: string; recipeId: string } | null>(null);
  const [selectedRecipeForPlan, setSelectedRecipeForPlan] = useState<Recipe | null>(null);
  const [selectedRecipeForView, setSelectedRecipeForView] = useState<Recipe | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [showSummary, setShowSummary] = useState(true);
  const [showRecipePanel, setShowRecipePanel] = useState(true);
  
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

  const filteredRecipes = useMemo(() => {
    let filtered = recipes.filter(r => !r.isArchived);
    
    // Apply filter
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
    
    // Apply search
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

  const getRecipesForSlot = (day: DayOfWeek, slot: MealSlot): PlannedRecipeDisplay[] => {
    const items = selectedWeekPlan.items.filter(i => i.day === day && i.mealSlot === slot);
    return items
      .map(item => {
        const recipe = recipes.find(r => r.id === item.recipeId);
        return recipe ? { recipe, item } : null;
      })
      .filter((r): r is PlannedRecipeDisplay => r !== null);
  };

  const handleDrop = (e: React.DragEvent, day: string, slot: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
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
          title: "Moved recipe",
          description: `${recipe.title} moved to ${day} ${slot}.`,
        });
      }
    } 
    // Adding a new recipe from sidebar
    else if (recipeId) {
      const weekStartStr = format(selectedWeekStart, 'yyyy-MM-dd');
      addToMealPlan(recipeId, day, slot, weekStartStr);
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe) {
        toast({
          title: "Added to meal plan",
          description: `${recipe.title} added to ${day} ${slot}.`,
        });
      }
    }
    
    setDragOverSlot(null);
    setDraggingItem(null);
  };

  const handleMealItemDragStart = (e: React.DragEvent, item: MealPlanItem, recipe: Recipe) => {
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

  const updateServings = (itemId: string, delta: number) => {
    const item = selectedWeekPlan.items.find(i => i.id === itemId);
    if (item) {
      const newMultiplier = Math.max(0.5, Math.min(4, item.servingsMultiplier + delta));
      updateMealPlanItem(itemId, { servingsMultiplier: newMultiplier });
    }
  };

  const toggleSlotExpansion = (slotId: string) => {
    setExpandedSlots(prev => ({ ...prev, [slotId]: !prev[slotId] }));
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

  const slotIcons: Record<string, typeof Utensils> = {
    breakfast: Utensils,
    lunch: Utensils,
    dinner: Utensils,
  };

  const getDailyNutrition = (day: DayOfWeek) => {
    let calories = 0;
    MEAL_SLOTS.forEach(slot => {
      const plannedRecipes = getRecipesForSlot(day, slot);
      plannedRecipes.forEach(({ recipe, item }) => {
        if (recipe.nutrition) {
          calories += recipe.nutrition.perServing.calories * item.servingsMultiplier;
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
                  const isToday = isSameWeek(date, today) && date.getDay() === today.getDay();
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
                      const plannedRecipes = getRecipesForSlot(day, slot);
                      const isOver = dragOverSlot === slotId;
                      const hasRecipes = plannedRecipes.length > 0;
                      const isExpanded = expandedSlots[slotId];
                      const displayRecipes = isExpanded ? plannedRecipes : plannedRecipes.slice(0, 2);
                      const hiddenCount = plannedRecipes.length - 2;

                      return (
                        <div
                          key={slotId}
                          onDrop={(e) => handleDrop(e, day, slot)}
                          onDragOver={(e) => handleDragOver(e, slotId)}
                          onDragLeave={handleDragLeave}
                          className={cn(
                            "min-h-[120px] rounded-xl border-2 border-dashed transition-all p-2",
                            hasRecipes 
                              ? "border-transparent bg-card shadow-sm" 
                              : "border-border/40 bg-muted/20 hover:bg-muted/30",
                            isOver && "border-primary bg-primary/5 scale-[1.02]",
                            !canEdit && "opacity-80"
                          )}
                        >
                          {hasRecipes ? (
                            <div className="space-y-2">
                              {displayRecipes.map(({ recipe, item }) => (
                                <div 
                                  key={item.id} 
                                  draggable={canEdit}
                                  onDragStart={(e) => handleMealItemDragStart(e, item, recipe)}
                                  onDragEnd={handleMealItemDragEnd}
                                  className={cn(
                                    "group relative bg-secondary/50 rounded-lg overflow-hidden cursor-pointer hover:bg-secondary/70 transition-all",
                                    canEdit && "cursor-grab active:cursor-grabbing",
                                    draggingItem?.itemId === item.id && "opacity-50 ring-2 ring-primary"
                                  )}
                                  onClick={() => setSelectedRecipeForView(recipe)}
                                >
                                  {/* Recipe Image */}
                                  {recipe.imageUrl && (
                                    <div className="relative h-12 w-full">
                                      <img
                                        src={recipe.imageUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    </div>
                                  )}
                                  
                                  <div className="p-2">
                                    <div className="flex items-start justify-between gap-1">
                                      <h4 className="font-medium text-xs leading-tight line-clamp-2">
                                        {recipe.title}
                                      </h4>
                                      {canEdit && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeFromMealPlan(item.id);
                                          }}
                                          className="shrink-0 p-0.5 rounded hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                        </button>
                                      )}
                                    </div>

                                    {canEdit && (
                                      <div className="flex items-center justify-between mt-1.5">
                                        <span className="text-[10px] text-muted-foreground">
                                          {Math.round(recipe.servings * item.servingsMultiplier)} srv
                                        </span>
                                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            onClick={() => updateServings(item.id, -0.5)}
                                            className="p-0.5 rounded hover:bg-muted"
                                          >
                                            <Minus className="h-3 w-3" />
                                          </button>
                                          <span className="text-[10px] w-5 text-center font-medium">
                                            {item.servingsMultiplier}x
                                          </span>
                                          <button
                                            onClick={() => updateServings(item.id, 0.5)}
                                            className="p-0.5 rounded hover:bg-muted"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {hiddenCount > 0 && !isExpanded && (
                                <button
                                  onClick={() => toggleSlotExpansion(slotId)}
                                  className="text-[10px] text-primary hover:underline w-full text-center font-medium"
                                >
                                  +{hiddenCount} more
                                </button>
                              )}
                              
                              {isExpanded && plannedRecipes.length > 2 && (
                                <button
                                  onClick={() => toggleSlotExpansion(slotId)}
                                  className="text-[10px] text-muted-foreground hover:underline w-full text-center"
                                >
                                  Show less
                                </button>
                              )}
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
      </div>
    </div>
  );
}
