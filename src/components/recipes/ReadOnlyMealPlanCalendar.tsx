import { useMemo } from 'react';
import {
  DAYS_OF_WEEK,
  MEAL_SLOTS,
  DayOfWeek,
  MealSlot,
  Recipe,
  MealPlanItem,
  DisplayMealItem,
} from '@/types/recipe';
import { MealCard } from '@/components/recipes/MealCard';
import { format, addDays, parseISO } from 'date-fns';

interface ReadOnlyMealPlanCalendarProps {
  items: MealPlanItem[];
  recipes: Recipe[];
  weekStartDate: string;
  householdSize?: number;
  onRecipeClick?: (recipe: Recipe) => void;
}

export function ReadOnlyMealPlanCalendar({
  items,
  recipes,
  weekStartDate,
  householdSize = 2,
  onRecipeClick,
}: ReadOnlyMealPlanCalendarProps) {
  // Build display items map (same logic as MealPlanPage)
  const displayItemsMap = useMemo(() => {
    const map = new Map<string, DisplayMealItem[]>();

    DAYS_OF_WEEK.forEach(day => {
      MEAL_SLOTS.forEach(slot => {
        map.set(`${day}-${slot}`, []);
      });
    });

    // Add real items
    items.forEach(item => {
      const recipe = recipes.find(r => r.id === item.recipeId);
      if (!recipe) return;

      const key = `${item.day}-${item.mealSlot}`;
      const existing = map.get(key) || [];
      existing.push({ item, recipe, isLeftover: false });
      map.set(key, existing);
    });

    // Generate virtual leftover cards
    items.forEach(item => {
      if (item.leftoverMeals <= 0) return;
      const recipe = recipes.find(r => r.id === item.recipeId);
      if (!recipe) return;

      const dayIndex = DAYS_OF_WEEK.indexOf(item.day as DayOfWeek);

      for (let i = 0; i < item.leftoverMeals; i++) {
        const customPos = item.leftoverPositions?.find(lp => lp.index === i);

        let targetDay: DayOfWeek;
        let targetSlot: MealSlot;

        if (customPos) {
          targetDay = customPos.day as DayOfWeek;
          targetSlot = customPos.slot;
        } else {
          const targetDayIndex = dayIndex + 1 + i;
          if (targetDayIndex >= DAYS_OF_WEEK.length) continue;
          targetDay = DAYS_OF_WEEK[targetDayIndex];
          targetSlot = item.mealSlot === 'dinner' ? 'lunch' : item.mealSlot;
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
          leftoverIndex: i,
        });
        map.set(key, existing);
      }
    });

    return map;
  }, [items, recipes]);

  const weekStart = parseISO(weekStartDate);

  // Check which slots have any items
  const activeSlots = useMemo(() => {
    return MEAL_SLOTS.filter(slot =>
      DAYS_OF_WEEK.some(day => {
        const items = displayItemsMap.get(`${day}-${slot}`) || [];
        return items.length > 0;
      })
    );
  }, [displayItemsMap]);

  const slotLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    snack: 'Snack',
    dinner: 'Dinner',
  };

  return (
    <div className="relative overflow-x-auto pl-4 sm:pl-0 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}>
      <div className="min-w-[700px]" style={{ scrollSnapAlign: 'start' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {DAYS_OF_WEEK.map((day, i) => (
            <div key={day} className="text-center">
              <div className="text-sm font-semibold capitalize">{day}</div>
              <div className="text-xs text-muted-foreground">
                {format(addDays(weekStart, i), 'MMM d')}
              </div>
            </div>
          ))}
        </div>

        {/* Meal slots */}
        {activeSlots.map(slot => (
          <div key={slot} className="mb-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {slotLabels[slot]}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map(day => {
                const cellItems = displayItemsMap.get(`${day}-${slot}`) || [];
                return (
                  <div key={`${day}-${slot}`} className="min-h-[60px] rounded-lg border border-border/30 bg-muted/20 p-1">
                    {cellItems.map(displayItem => (
                      <MealCard
                        key={displayItem.item.id}
                        recipe={displayItem.recipe}
                        item={displayItem.item}
                        isLeftover={displayItem.isLeftover}
                        sourceLeftoverMeals={displayItem.sourceItem?.leftoverMeals}
                        householdSize={householdSize}
                        onClick={() => onRecipeClick?.(displayItem.recipe)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {activeSlots.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No meals planned for this week
          </div>
        )}
      </div>
    </div>
  );
}
