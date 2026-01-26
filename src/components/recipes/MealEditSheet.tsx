import { Recipe, MealPlanItem, DAYS_OF_WEEK, MEAL_SLOTS, DayOfWeek, MealSlot } from '@/types/recipe';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Minus, 
  Plus, 
  Trash2, 
  Users, 
  Utensils,
  ChefHat,
  CalendarPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MealEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  item: MealPlanItem | null;
  householdSize: number;
  onUpdateServings: (itemId: string, multiplier: number) => void;
  onUpdateLeftovers: (itemId: string, leftovers: number) => void;
  onRemove: (itemId: string) => void;
  onViewRecipe: (recipe: Recipe) => void;
}

export function MealEditSheet({
  open,
  onOpenChange,
  recipe,
  item,
  householdSize,
  onUpdateServings,
  onUpdateLeftovers,
  onRemove,
  onViewRecipe,
}: MealEditSheetProps) {
  if (!recipe || !item) return null;

  const plannedServings = Math.round(recipe.servings * item.servingsMultiplier);
  const totalMeals = 1 + (item.leftoverMeals || 0);
  const isAdjustedFromOriginal = recipe.servings !== plannedServings;

  // Handle servings change and auto-calculate leftovers
  const handleServingsChange = (delta: number) => {
    const newMultiplier = Math.max(0.5, Math.min(6, item.servingsMultiplier + delta));
    const newServings = Math.round(recipe.servings * newMultiplier);
    onUpdateServings(item.id, newMultiplier);

    // Auto-calculate leftovers based on new servings and household size
    const mealsFromServings = Math.floor(newServings / householdSize);
    const newLeftovers = Math.max(0, mealsFromServings - 1);
    if (newLeftovers !== item.leftoverMeals) {
      onUpdateLeftovers(item.id, newLeftovers);
    }
  };

  // Handle leftovers change and auto-calculate servings
  const handleLeftoversChange = (newLeftovers: number) => {
    onUpdateLeftovers(item.id, newLeftovers);

    // Auto-calculate servings based on leftovers and household size
    const mealsNeeded = newLeftovers + 1;
    const servingsNeeded = mealsNeeded * householdSize;
    const newMultiplier = servingsNeeded / recipe.servings;
    if (Math.abs(newMultiplier - item.servingsMultiplier) > 0.01) {
      onUpdateServings(item.id, Math.min(6, Math.max(0.5, newMultiplier)));
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="font-serif text-xl">Edit Meal</SheetTitle>
        </SheetHeader>

        {/* Recipe Info */}
        <div className="space-y-6">
          {/* Recipe header */}
          <div className="flex gap-4">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
              {recipe.imageUrl ? (
                <img
                  src={recipe.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Utensils className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-lg leading-tight">{recipe.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 capitalize">
                {dayLabels[item.day]} · {item.mealSlot}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 px-2 text-xs"
                onClick={() => onViewRecipe(recipe)}
              >
                View full recipe →
              </Button>
            </div>
          </div>

          <Separator />

          {/* Servings control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Servings to make
                </h4>
                {isAdjustedFromOriginal && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Original recipe serves {recipe.servings}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleServingsChange(-0.5)}
                  disabled={item.servingsMultiplier <= 0.5}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-10 text-center tabular-nums">
                  {plannedServings}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleServingsChange(0.5)}
                  disabled={item.servingsMultiplier >= 6}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2">
              {[householdSize, householdSize * 2, householdSize * 3].map((preset) => {
                const multiplier = preset / recipe.servings;
                const isActive = Math.abs(item.servingsMultiplier - multiplier) < 0.01;
                return (
                  <Button
                    key={preset}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => onUpdateServings(item.id, multiplier)}
                  >
                    {preset}
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Leftovers control */}
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                Leftover meals
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Extra meals from this cooking session
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((count) => {
                const isActive = item.leftoverMeals === count;
                return (
                  <Button
                    key={count}
                    variant={isActive ? "default" : "outline"}
                    className="h-12 flex-col gap-0.5"
                    onClick={() => handleLeftoversChange(count)}
                  >
                    <span className="text-lg font-semibold">{count}</span>
                    <span className="text-[10px] opacity-70">
                      {count === 0 ? 'None' : count === 1 ? 'meal' : 'meals'}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              <span className="font-medium">Summary</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Making <span className="font-medium text-foreground">{plannedServings} servings</span>
              </p>
              <p>
                Provides <span className="font-medium text-foreground">{totalMeals} meal{totalMeals > 1 ? 's' : ''}</span>
                {item.leftoverMeals > 0 && (
                  <span className="text-muted-foreground">
                    {' '}(1 fresh + {item.leftoverMeals} leftover{item.leftoverMeals > 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          </div>

          <Separator />

          {/* Remove button */}
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              onRemove(item.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove from meal plan
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
