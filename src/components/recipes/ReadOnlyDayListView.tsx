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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Utensils, Undo2, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, parseISO, isSameDay } from 'date-fns';

interface ReadOnlyDayListViewProps {
  items: MealPlanItem[];
  recipes: Recipe[];
  weekStartDate: string;
  householdSize?: number;
  onRecipeClick?: (recipe: Recipe) => void;
}

const slotEmojis: Record<MealSlot, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  snack: '🍪',
  dinner: '🍽️',
};

export function ReadOnlyDayListView({
  items,
  recipes,
  weekStartDate,
  householdSize = 2,
  onRecipeClick,
}: ReadOnlyDayListViewProps) {
  const weekStart = parseISO(weekStartDate);
  const today = new Date();
  const todayDayOfWeek = DAYS_OF_WEEK[today.getDay() === 0 ? 6 : today.getDay() - 1] as DayOfWeek;

  const [expandedDays, setExpandedDays] = useState<Set<DayOfWeek>>(new Set([todayDayOfWeek]));
  const [collapsedSlots, setCollapsedSlots] = useState<Set<string>>(new Set());

  // Build display items map (same logic as ReadOnlyMealPlanCalendar)
  const displayItemsMap = useMemo(() => {
    const map = new Map<string, DisplayMealItem[]>();

    DAYS_OF_WEEK.forEach(day => {
      MEAL_SLOTS.forEach(slot => {
        map.set(`${day}-${slot}`, []);
      });
    });

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

  const toggleDay = (day: DayOfWeek) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleSlot = (key: string) => {
    setCollapsedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getDayStats = (day: DayOfWeek) => {
    let mealCount = 0;
    let totalCalories = 0;

    MEAL_SLOTS.forEach(slot => {
      const dayItems = displayItemsMap.get(`${day}-${slot}`) || [];
      mealCount += dayItems.length;
      dayItems.forEach(({ recipe, item, isLeftover, sourceItem }) => {
        if (recipe.nutrition) {
          const leftoverCount = isLeftover && sourceItem
            ? sourceItem.leftoverMeals
            : (item.leftoverMeals || 0);
          const totalMeals = 1 + leftoverCount;
          const totalCals = recipe.nutrition.perServing.calories * recipe.servings * item.servingsMultiplier;
          const calsPerMeal = totalCals / totalMeals;
          const eaters = householdSize;
          totalCalories += calsPerMeal / eaters;
        }
      });
    });

    return { mealCount, totalCalories: Math.round(totalCalories) };
  };

  return (
    <div className="space-y-2">
      {DAYS_OF_WEEK.map((day, index) => {
        const date = addDays(weekStart, index);
        const isExpanded = expandedDays.has(day);
        const isToday = isSameDay(date, today);
        const stats = getDayStats(day);
        const hasMeals = stats.mealCount > 0;

        return (
          <Collapsible
            key={day}
            open={isExpanded}
            onOpenChange={() => toggleDay(day)}
          >
            <CollapsibleTrigger className="w-full">
              <div className={cn(
                "flex items-center justify-between p-3 rounded-xl transition-all",
                isExpanded
                  ? "bg-card shadow-sm"
                  : "bg-muted/30 hover:bg-muted/50",
                isToday && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
              )}>
                <div className="flex items-center gap-3">
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180"
                  )} />
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {format(date, 'EEEE')}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          Today
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(date, 'MMM d')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  {hasMeals ? (
                    <>
                      <span className="text-muted-foreground">
                        {stats.mealCount} meal{stats.mealCount !== 1 ? 's' : ''}
                      </span>
                      {stats.totalCalories > 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Flame className="h-3 w-3" />
                          {stats.totalCalories.toLocaleString()}
                        </span>
                      )}
                      <div className="flex gap-1">
                        {MEAL_SLOTS.map(slot => {
                          const hasSlot = (displayItemsMap.get(`${day}-${slot}`) || []).length > 0;
                          return (
                            <div
                              key={slot}
                              className={cn(
                                "w-2 h-2 rounded-full",
                                hasSlot ? "bg-primary" : "bg-muted-foreground/20"
                              )}
                            />
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground/60 text-xs">No meals</span>
                  )}
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="pt-2 pb-4 space-y-3">
                {MEAL_SLOTS.map(slot => {
                  const slotItems = displayItemsMap.get(`${day}-${slot}`) || [];
                  if (slotItems.length === 0) return null;

                  const slotKey = `${day}-${slot}`;
                  const isSlotOpen = !collapsedSlots.has(slotKey);

                  return (
                    <Collapsible
                      key={slot}
                      open={isSlotOpen}
                      onOpenChange={() => toggleSlot(slotKey)}
                    >
                      <div className="pl-7">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-base">{slotEmojis[slot]}</span>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {slot.charAt(0).toUpperCase() + slot.slice(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({slotItems.length})
                            </span>
                            <div className="flex-1" />
                            <ChevronDown className={cn(
                              "h-3 w-3 text-muted-foreground transition-transform",
                              isSlotOpen && "rotate-180"
                            )} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2">
                            {slotItems.map(displayItem => (
                              <ReadOnlyCompactCard
                                key={displayItem.item.id}
                                displayItem={displayItem}
                                householdSize={householdSize}
                                onClick={() => onRecipeClick?.(displayItem.recipe)}
                              />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

// Compact read-only meal card (no drag handlers)
function ReadOnlyCompactCard({
  displayItem,
  householdSize,
  onClick,
}: {
  displayItem: DisplayMealItem;
  householdSize: number;
  onClick: () => void;
}) {
  const { item, recipe, isLeftover, sourceItem } = displayItem;
  const leftoverCount = isLeftover && sourceItem
    ? sourceItem.leftoverMeals
    : (item.leftoverMeals || 0);
  const numberOfMeals = 1 + leftoverCount;

  const caloriesPerMeal = recipe.nutrition
    ? Math.round((recipe.nutrition.perServing.calories * recipe.servings * item.servingsMultiplier) / numberOfMeals)
    : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg bg-card/80 cursor-pointer transition-all",
        "hover:bg-card hover:shadow-sm active:scale-[0.98]",
        isLeftover && "ring-1 ring-dashed ring-amber-400/50"
      )}
    >
      <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Utensils className="h-4 w-4 text-muted-foreground/60" />
          </div>
        )}
        {isLeftover && (
          <div className="absolute -top-0.5 -right-0.5 p-0.5 rounded-full bg-amber-500">
            <Undo2 className="h-2 w-2 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm line-clamp-1">{recipe.title}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {caloriesPerMeal && <span>{caloriesPerMeal} cal</span>}
          {!isLeftover && leftoverCount > 0 && (
            <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-medium">
              +{leftoverCount}
            </span>
          )}
          {isLeftover && (
            <span className="text-[10px] text-amber-600 font-medium">Leftover</span>
          )}
        </div>
      </div>
    </div>
  );
}
