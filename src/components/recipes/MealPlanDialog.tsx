import { Recipe, DAYS_OF_WEEK, MEAL_SLOTS, DisplayMealItem, MealSlot, DayOfWeek } from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
import { useHouseholdSettings } from '@/hooks/useHouseholdSettings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Clock, Users, Flame, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';

interface MealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  displayItemsMap?: Map<string, DisplayMealItem[]>;
  weekStartDate?: Date;
}

export function MealPlanDialog({ open, onOpenChange, recipe, displayItemsMap, weekStartDate }: MealPlanDialogProps) {
  const { addToMealPlan, updateMealPlanItem } = useRecipes();
  const { toast } = useToast();
  const { householdSize } = useHouseholdSettings();

  if (!recipe) return null;

  const handleAddToSlot = async (day: string, slot: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    const weekStartStr = weekStartDate ? format(weekStartDate, 'yyyy-MM-dd') : undefined;
    const result = await addToMealPlan(recipe.id, day, slot, weekStartStr);

    // Auto-adjust servings and leftovers based on household size
    if (result && recipe.servings > 0) {
      const mealsFromRecipe = recipe.servings / householdSize;

      if (mealsFromRecipe <= 1) {
        // Recipe doesn't make enough for one meal - scale up
        const multiplier = householdSize / recipe.servings;
        if (multiplier !== 1) {
          await updateMealPlanItem(result.id, { servingsMultiplier: multiplier });
        }
      } else {
        // Recipe makes more than one meal - auto-suggest leftovers
        const suggestedLeftovers = Math.floor(mealsFromRecipe) - 1;
        await updateMealPlanItem(result.id, {
          servingsMultiplier: 1,
          leftoverMeals: suggestedLeftovers,
        });
      }
    }

    toast({
      title: "Added to meal plan",
      description: `${recipe.title} added to ${day} ${slot}`,
    });

    onOpenChange(false);
  };

  const dayLabels: Record<DayOfWeek, string> = {
    monday: 'M',
    tuesday: 'T',
    wednesday: 'W',
    thursday: 'T',
    friday: 'F',
    saturday: 'S',
    sunday: 'S',
  };

  const slotEmojis: Record<MealSlot, string> = {
    breakfast: '🍳',
    lunch: '🥗',
    snack: '🍪',
    dinner: '🍽️',
  };

  const getSlotItems = (day: DayOfWeek, slot: MealSlot): DisplayMealItem[] => {
    if (!displayItemsMap) return [];
    return displayItemsMap.get(`${day}-${slot}`) || [];
  };

  const hasWeekData = displayItemsMap && displayItemsMap.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-lg",
        hasWeekData && "max-w-md"
      )}>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Add to Meal Plan
          </DialogTitle>
        </DialogHeader>

        {/* Recipe Preview */}
        <div className="flex gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
            {recipe.imageUrl ? (
              <img
                src={recipe.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <Utensils className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-2">{recipe.title}</h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
              {recipe.totalTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {recipe.totalTime}min
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {recipe.servings}
              </span>
              {recipe.nutrition?.perServing?.calories && (
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {recipe.nutrition.perServing.calories}cal
                </span>
              )}
            </div>
          </div>
        </div>

        {hasWeekData ? (
          /* Week Grid View */
          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground text-center">
              Tap an empty slot to add this recipe
            </p>

            {/* Day headers */}
            <div className="grid grid-cols-8 gap-1">
              <div /> {/* Empty corner cell */}
              {DAYS_OF_WEEK.map((day, idx) => {
                const date = weekStartDate ? addDays(weekStartDate, idx) : null;
                return (
                  <div key={day} className="text-center">
                    <div className="text-xs font-semibold text-muted-foreground">
                      {dayLabels[day]}
                    </div>
                    {date && (
                      <div className="text-[10px] text-muted-foreground/70">
                        {format(date, 'd')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Slot rows */}
            {MEAL_SLOTS.map(slot => (
              <div key={slot} className="grid grid-cols-8 gap-1">
                {/* Slot label */}
                <div className="flex items-center justify-center">
                  <span className="text-sm" title={slot}>{slotEmojis[slot]}</span>
                </div>

                {/* Day cells */}
                {DAYS_OF_WEEK.map(day => {
                  const items = getSlotItems(day, slot);
                  const isFilled = items.length > 0;
                  const firstItem = items[0];

                  return (
                    <button
                      key={`${day}-${slot}`}
                      onClick={() => !isFilled && handleAddToSlot(day, slot)}
                      disabled={isFilled}
                      className={cn(
                        "aspect-square rounded-lg transition-all text-xs",
                        "flex items-center justify-center",
                        isFilled
                          ? "bg-primary/20 border border-primary/30 cursor-not-allowed"
                          : "bg-muted/50 border border-dashed border-muted-foreground/30 hover:bg-primary/10 hover:border-primary/50 active:scale-95"
                      )}
                      title={isFilled && firstItem ? firstItem.recipe.title : `Add to ${day} ${slot}`}
                    >
                      {isFilled ? (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      ) : (
                        <span className="text-muted-foreground/40 text-lg">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex justify-center gap-4 text-[10px] text-muted-foreground pt-2">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                filled
              </span>
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground/40">+</span>
                empty (tap to add)
              </span>
            </div>
          </div>
        ) : (
          /* Fallback: List View (no week data) */
          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground text-center">
              Choose when to have this recipe
            </p>

            <div className="grid gap-2">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-medium capitalize text-muted-foreground">
                    {day.slice(0, 3)}
                  </span>
                  <div className="flex gap-1.5 flex-1">
                    {MEAL_SLOTS.map(slot => (
                      <button
                        key={slot}
                        onClick={() => handleAddToSlot(day, slot)}
                        className={cn(
                          "flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all",
                          "bg-muted/50 hover:bg-primary/10 hover:text-primary",
                          "border border-transparent hover:border-primary/30",
                          "active:scale-95"
                        )}
                      >
                        {slotEmojis[slot]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
