import { useState, useMemo } from 'react';
import { DAYS_OF_WEEK, MEAL_SLOTS, DayOfWeek, MealSlot, Recipe } from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
import { format, startOfWeek, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  X, 
  Clock, 
  Users,
  Minus,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function MealPlanPage() {
  const { recipes, getCurrentMealPlan, addToMealPlan, removeFromMealPlan, updateMealPlanItem } = useRecipes();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  
  const mealPlan = getCurrentMealPlan();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const filteredRecipes = useMemo(() => {
    if (!searchQuery) return recipes.filter(r => !r.isArchived);
    const query = searchQuery.toLowerCase();
    return recipes.filter(r => 
      !r.isArchived && (
        r.title.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.tags.some(t => t.toLowerCase().includes(query))
      )
    );
  }, [recipes, searchQuery]);

  const getRecipeForSlot = (day: DayOfWeek, slot: MealSlot) => {
    const item = mealPlan.items.find(i => i.day === day && i.mealSlot === slot);
    if (!item) return null;
    const recipe = recipes.find(r => r.id === item.recipeId);
    return recipe ? { ...recipe, mealPlanItemId: item.id, servingsMultiplier: item.servingsMultiplier } : null;
  };

  const handleDrop = (e: React.DragEvent, day: string, slot: 'breakfast' | 'lunch' | 'dinner') => {
    e.preventDefault();
    const recipeId = e.dataTransfer.getData('recipeId');
    if (recipeId) {
      addToMealPlan(recipeId, day, slot);
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe) {
        toast({
          title: "Added to meal plan",
          description: `${recipe.title} added to ${day} ${slot}.`,
        });
      }
    }
    setDragOverSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    setDragOverSlot(slotId);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const updateServings = (itemId: string, delta: number) => {
    const item = mealPlan.items.find(i => i.id === itemId);
    if (item) {
      const newMultiplier = Math.max(0.5, Math.min(4, item.servingsMultiplier + delta));
      updateMealPlanItem(itemId, { servingsMultiplier: newMultiplier });
    }
  };

  const dayLabels: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  return (
    <div className="container py-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold mb-2">Meal Plan</h1>
        <p className="text-muted-foreground">
          Week of {format(weekStart, 'MMMM d, yyyy')}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Recipe sidebar */}
        <div className="lg:w-72 shrink-0">
          <div className="sticky top-20 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-2 pr-2">
              {filteredRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('recipeId', recipe.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="p-3 bg-card rounded-xl border border-border/50 cursor-grab active:cursor-grabbing hover:shadow-card transition-shadow"
                >
                  <div className="flex gap-3">
                    {recipe.imageUrl && (
                      <img
                        src={recipe.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                    )}
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS_OF_WEEK.map((day, index) => (
                <div key={day} className="text-center">
                  <div className="font-semibold text-sm">{dayLabels[day]}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(addDays(weekStart, index), 'MMM d')}
                  </div>
                </div>
              ))}
            </div>

            {/* Meal slots */}
            {MEAL_SLOTS.map(slot => (
              <div key={slot} className="mb-4">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 pl-1">
                  {slot}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const slotId = `${day}-${slot}`;
                    const plannedRecipe = getRecipeForSlot(day, slot);
                    const isOver = dragOverSlot === slotId;

                    return (
                      <div
                        key={slotId}
                        onDrop={(e) => handleDrop(e, day, slot)}
                        onDragOver={(e) => handleDragOver(e, slotId)}
                        onDragLeave={handleDragLeave}
                        className={cn(
                          "min-h-[100px] rounded-xl border-2 border-dashed transition-all p-2",
                          plannedRecipe 
                            ? "border-transparent bg-card shadow-sm" 
                            : "border-border/50 bg-muted/30",
                          isOver && "border-primary bg-primary/5 drop-zone-active"
                        )}
                      >
                        {plannedRecipe ? (
                          <div className="h-full">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-medium text-xs leading-tight line-clamp-2">
                                {plannedRecipe.title}
                              </h4>
                              <button
                                onClick={() => removeFromMealPlan(plannedRecipe.mealPlanItemId)}
                                className="shrink-0 p-1 rounded hover:bg-muted -mr-1 -mt-1"
                              >
                                <X className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </div>
                            
                            {plannedRecipe.imageUrl && (
                              <img
                                src={plannedRecipe.imageUrl}
                                alt=""
                                className="w-full h-10 object-cover rounded-lg mt-1"
                              />
                            )}

                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-muted-foreground">
                                {plannedRecipe.servings * plannedRecipe.servingsMultiplier} servings
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => updateServings(plannedRecipe.mealPlanItemId, -0.5)}
                                  className="p-0.5 rounded hover:bg-muted"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-[10px] w-5 text-center">
                                  {plannedRecipe.servingsMultiplier}x
                                </span>
                                <button
                                  onClick={() => updateServings(plannedRecipe.mealPlanItemId, 0.5)}
                                  className="p-0.5 rounded hover:bg-muted"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                            Drop here
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
