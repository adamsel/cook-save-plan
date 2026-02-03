import { useMemo } from 'react';
import { DAYS_OF_WEEK, MEAL_SLOTS, DayOfWeek, DisplayMealItem, Recipe } from '@/types/recipe';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface MobileWeekOverviewProps {
  weekStartDate: Date;
  selectedDay: DayOfWeek;
  onDayChange: (day: DayOfWeek) => void;
  displayItemsMap: Map<string, DisplayMealItem[]>;
  recipes: Recipe[];
  householdSize: number;
}

export function MobileWeekOverview({
  weekStartDate,
  selectedDay,
  onDayChange,
  displayItemsMap,
  recipes,
  householdSize,
}: MobileWeekOverviewProps) {
  // Calculate daily calories and meal info for each day
  const dailyStats = useMemo(() => {
    return DAYS_OF_WEEK.map((day, index) => {
      const date = addDays(weekStartDate, index);

      // Check which meal slots have items
      const mealSlotStatus = MEAL_SLOTS.map(slot => {
        const items = displayItemsMap.get(`${day}-${slot}`) || [];
        return items.length > 0;
      });

      // Calculate daily calories
      let dailyCalories = 0;
      MEAL_SLOTS.forEach(slot => {
        const items = displayItemsMap.get(`${day}-${slot}`) || [];
        items.forEach(displayItem => {
          const recipe = displayItem.recipe;
          if (recipe?.nutrition) {
            const multiplier = displayItem.item.servingsMultiplier || 1;
            // Simple per-person estimate
            const totalCalories = recipe.nutrition.perServing.calories * recipe.servings * multiplier;
            const eaters = displayItem.item.eventType && displayItem.item.guestCount
              ? displayItem.item.guestCount
              : householdSize;
            dailyCalories += totalCalories / eaters;
          }
        });
      });

      const hasMeals = mealSlotStatus.some(Boolean);
      const mealCount = mealSlotStatus.filter(Boolean).length;

      return {
        day,
        date,
        dayAbbrev: format(date, 'EEEEE'), // Single letter: M, T, W, etc.
        dayNumber: format(date, 'd'),
        mealSlotStatus, // [breakfast, lunch, snack, dinner]
        hasMeals,
        mealCount,
        dailyCalories: Math.round(dailyCalories),
      };
    });
  }, [weekStartDate, displayItemsMap, recipes, householdSize]);

  return (
    <div className="bg-card rounded-xl border border-border/50 p-3 mb-4">
      <div className="grid grid-cols-7 gap-1">
        {dailyStats.map((stats) => {
          const isSelected = stats.day === selectedDay;

          return (
            <button
              key={stats.day}
              onClick={() => onDayChange(stats.day)}
              className={cn(
                "flex flex-col items-center py-2 px-1 rounded-lg transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-muted/50 active:bg-muted"
              )}
            >
              {/* Day abbreviation */}
              <span className={cn(
                "text-[10px] font-medium uppercase",
                isSelected ? "text-primary-foreground" : "text-muted-foreground"
              )}>
                {stats.dayAbbrev}
              </span>

              {/* Date number */}
              <span className={cn(
                "text-lg font-bold leading-tight",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}>
                {stats.dayNumber}
              </span>

              {/* Meal dots - 4 dots for breakfast/lunch/snack/dinner */}
              <div className="flex gap-0.5 mt-1">
                {stats.mealSlotStatus.map((hasMeal, slotIndex) => (
                  <div
                    key={slotIndex}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      hasMeal
                        ? isSelected
                          ? "bg-primary-foreground"
                          : "bg-primary"
                        : isSelected
                          ? "bg-primary-foreground/30"
                          : "bg-muted-foreground/20"
                    )}
                  />
                ))}
              </div>

              {/* Daily calories */}
              <span className={cn(
                "text-[9px] font-medium mt-1 tabular-nums",
                isSelected
                  ? "text-primary-foreground/80"
                  : stats.hasMeals
                    ? "text-muted-foreground"
                    : "text-muted-foreground/40"
              )}>
                {stats.hasMeals ? `${stats.dailyCalories >= 1000 ? `${(stats.dailyCalories / 1000).toFixed(1)}k` : stats.dailyCalories}` : '--'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-2 pt-2 border-t border-border/30">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[9px] text-muted-foreground">has meal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
          <span className="text-[9px] text-muted-foreground">empty</span>
        </div>
      </div>
    </div>
  );
}
