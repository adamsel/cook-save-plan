import { useMemo, useState } from 'react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, parseISO, isSameDay } from 'date-fns';

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
  const today = new Date();

  // Track which slots are expanded (all by default)
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(
    new Set(MEAL_SLOTS as unknown as string[])
  );

  const toggleSlot = (slot: string) => {
    setExpandedSlots(prev => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

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
        const slotItems = displayItemsMap.get(`${day}-${slot}`) || [];
        return slotItems.length > 0;
      })
    );
  }, [displayItemsMap]);

  const slotLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    snack: 'Snack',
    dinner: 'Dinner',
  };

  // Count items per slot across all days
  const getSlotItemCount = (slot: string) => {
    return DAYS_OF_WEEK.reduce((count, day) => {
      return count + (displayItemsMap.get(`${day}-${slot}`) || []).length;
    }, 0);
  };

  return (
    <div className="relative overflow-x-auto pl-4 sm:pl-0 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}>
      <div className="min-w-[700px]" style={{ scrollSnapAlign: 'start' }}>
        {/* Styled day headers */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {DAYS_OF_WEEK.map((day, i) => {
            const date = addDays(weekStart, i);
            const isToday = isSameDay(date, today);

            return (
              <div
                key={day}
                className={cn(
                  "text-center p-2 rounded-xl transition-all",
                  isToday
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/30"
                    : "bg-card/50 hover:bg-card"
                )}
              >
                <div className={cn(
                  "text-xs font-semibold uppercase tracking-wider mb-1",
                  isToday ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {format(date, 'EEE')}
                </div>
                <div className={cn(
                  "text-lg font-serif font-bold",
                  isToday ? "text-primary-foreground" : "text-foreground"
                )}>
                  {format(date, 'd')}
                </div>
                {/* Meal slot dots */}
                <div className="flex justify-center gap-1.5 mt-2">
                  {MEAL_SLOTS.map(slot => {
                    const hasItems = (displayItemsMap.get(`${day}-${slot}`) || []).length > 0;
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
              </div>
            );
          })}
        </div>

        {/* Collapsible meal slots */}
        {activeSlots.map(slot => {
          const isOpen = expandedSlots.has(slot);
          const itemCount = getSlotItemCount(slot);

          return (
            <Collapsible key={slot} open={isOpen} onOpenChange={() => toggleSlot(slot)}>
              <div className="mb-4">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-2 mb-2 px-1 py-1 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {slotLabels[slot]}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      {itemCount}
                    </Badge>
                    <div className="flex-1 h-px bg-border/30" />
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map(day => {
                      const cellItems = displayItemsMap.get(`${day}-${slot}`) || [];
                      return (
                        <div
                          key={`${day}-${slot}`}
                          className={cn(
                            "min-h-[50px] rounded-xl p-1 transition-all",
                            cellItems.length > 0
                              ? "bg-transparent"
                              : "border border-dashed border-muted-foreground/20 bg-muted/10"
                          )}
                        >
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
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {activeSlots.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No meals planned for this week
          </div>
        )}
      </div>
    </div>
  );
}
