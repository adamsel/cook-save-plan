import { DAYS_OF_WEEK, MEAL_SLOTS, DayOfWeek, MealSlot, DisplayMealItem, Recipe, MealPlanItem } from '@/types/recipe';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { format, addDays, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, ChevronDown, Utensils, Undo2, Plus, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DayListViewProps {
  selectedDay: DayOfWeek;
  onDayChange: (day: DayOfWeek) => void;
  weekStartDate: Date;
  displayItemsMap: Map<string, DisplayMealItem[]>;
  householdSize: number;
  canEdit: boolean;
  draggingItem: { itemId: string; recipeId: string } | null;
  dragOverSlot: string | null;
  onDrop: (e: React.DragEvent, day: string, slot: MealSlot) => void;
  onDragOver: (e: React.DragEvent, slotId: string) => void;
  onDragLeave: () => void;
  onDragStart: (e: React.DragEvent, item: MealPlanItem, recipe: Recipe, displayItem?: DisplayMealItem) => void;
  onDragEnd: () => void;
  onCardClick: (displayItem: DisplayMealItem) => void;
  onAddMealClick?: (day: DayOfWeek, slot: MealSlot) => void;
  accordionMode?: boolean; // Show all days as collapsible sections
}

// Map meal slot to gradient class
const mealSlotGradients: Record<string, string> = {
  breakfast: 'bg-meal-breakfast',
  lunch: 'bg-meal-lunch',
  dinner: 'bg-meal-dinner',
  snack: 'bg-meal-snack',
};

export function DayListView({
  selectedDay,
  onDayChange,
  weekStartDate,
  displayItemsMap,
  householdSize,
  canEdit,
  draggingItem,
  dragOverSlot,
  onDrop,
  onDragOver,
  onDragLeave,
  onDragStart,
  onDragEnd,
  onCardClick,
  onAddMealClick,
  accordionMode = false,
}: DayListViewProps) {
  const dayIndex = DAYS_OF_WEEK.indexOf(selectedDay);
  const selectedDate = addDays(weekStartDate, dayIndex);
  const today = new Date();

  // Track which days are expanded in accordion mode (persisted to localStorage)
  // Default to today's day if nothing in localStorage
  const todayDayOfWeek = DAYS_OF_WEEK[today.getDay() === 0 ? 6 : today.getDay() - 1] as DayOfWeek;
  const [expandedDaysArray, setExpandedDaysArray] = useLocalStorage<DayOfWeek[]>(
    'mealplan-expanded-days',
    [todayDayOfWeek]
  );
  const expandedDays = new Set(expandedDaysArray);

  const toggleDayExpanded = (day: DayOfWeek) => {
    setExpandedDaysArray(prev => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return [...next];
    });
    onDayChange(day);
  };

  const goToPrevDay = () => {
    const prevIndex = dayIndex > 0 ? dayIndex - 1 : DAYS_OF_WEEK.length - 1;
    onDayChange(DAYS_OF_WEEK[prevIndex]);
  };

  const goToNextDay = () => {
    const nextIndex = dayIndex < DAYS_OF_WEEK.length - 1 ? dayIndex + 1 : 0;
    onDayChange(DAYS_OF_WEEK[nextIndex]);
  };

  const formatSlotLabel = (slot: string) => {
    return slot.charAt(0).toUpperCase() + slot.slice(1);
  };

  // Helper to calculate day stats
  const getDayStats = (day: DayOfWeek) => {
    let mealCount = 0;
    let totalCalories = 0;

    MEAL_SLOTS.forEach(slot => {
      const items = displayItemsMap.get(`${day}-${slot}`) || [];
      mealCount += items.length;
      items.forEach(({ recipe, item, isLeftover, sourceItem }) => {
        if (recipe.nutrition) {
          const leftoverCount = isLeftover && sourceItem
            ? sourceItem.leftoverMeals
            : (item.leftoverMeals || 0);
          const totalMeals = 1 + leftoverCount;
          const totalCals = recipe.nutrition.perServing.calories * recipe.servings * item.servingsMultiplier;
          const calsPerMeal = totalCals / totalMeals;
          const eaters = item.eventType && item.guestCount ? item.guestCount : householdSize;
          totalCalories += calsPerMeal / eaters;
        }
      });
    });

    return { mealCount, totalCalories: Math.round(totalCalories) };
  };

  const slotEmojis: Record<MealSlot, string> = {
    breakfast: '🍳',
    lunch: '🥗',
    snack: '🍪',
    dinner: '🍽️',
  };

  // Accordion mode: show all days as collapsible sections
  if (accordionMode) {
    return (
      <div className="space-y-2">
        {DAYS_OF_WEEK.map((day, index) => {
          const date = addDays(weekStartDate, index);
          const isExpanded = expandedDays.has(day);
          const isToday = isSameDay(date, today);
          const stats = getDayStats(day);
          const hasMeals = stats.mealCount > 0;

          return (
            <Collapsible
              key={day}
              open={isExpanded}
              onOpenChange={() => toggleDayExpanded(day)}
            >
              {/* Day Header - Collapsible trigger */}
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
                        {/* Meal slot dots */}
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
                                title={slot}
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

              {/* Day Content - Meal slots */}
              <CollapsibleContent>
                <div className="pt-2 pb-4 space-y-3">
                  {MEAL_SLOTS.map(slot => {
                    const slotId = `${day}-${slot}`;
                    const displayItems = displayItemsMap.get(slotId) || [];
                    const isOver = dragOverSlot === slotId;
                    const hasItems = displayItems.length > 0;
                    const gradientClass = mealSlotGradients[slot] || 'bg-muted';

                    return (
                      <div key={slot} className="pl-7">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{slotEmojis[slot]}</span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {formatSlotLabel(slot)}
                          </span>
                        </div>

                        <div
                          onDrop={(e) => onDrop(e, day, slot)}
                          onDragOver={(e) => onDragOver(e, slotId)}
                          onDragLeave={onDragLeave}
                          className={cn(
                            "rounded-xl transition-all duration-200",
                            isOver && "bg-primary/10 ring-2 ring-primary/50"
                          )}
                        >
                          {hasItems ? (
                            <div className="space-y-2">
                              {displayItems.map((displayItem) => (
                                <CompactMealCard
                                  key={displayItem.item.id}
                                  displayItem={displayItem}
                                  householdSize={householdSize}
                                  isDragging={draggingItem?.itemId === displayItem.item.id}
                                  onDragStart={(e) => onDragStart(e, displayItem.item, displayItem.recipe, displayItem)}
                                  onDragEnd={onDragEnd}
                                  onClick={() => onCardClick(displayItem)}
                                />
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => canEdit && onAddMealClick?.(day, slot)}
                              disabled={!canEdit}
                              className={cn(
                                "w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs transition-colors",
                                canEdit
                                  ? "text-muted-foreground/60 hover:text-primary hover:bg-primary/5"
                                  : "text-muted-foreground/40 cursor-not-allowed"
                              )}
                            >
                              <Plus className="h-4 w-4" />
                              <span>Add {slot}</span>
                            </button>
                          )}
                        </div>
                      </div>
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

  // Original single-day view
  return (
    <div className="space-y-6">
      {/* Day Navigation Header - Premium glass style */}
      <div className="flex items-center justify-between p-6 glass rounded-2xl">
        <Button variant="ghost" size="icon" onClick={goToPrevDay} className="h-12 w-12">
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="text-center">
          <div className="text-3xl font-serif font-bold">
            {format(selectedDate, 'EEEE')}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {format(selectedDate, 'MMMM d, yyyy')}
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={goToNextDay} className="h-12 w-12">
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Day tabs with meal indicators */}
      <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {DAYS_OF_WEEK.map((day, index) => {
          const date = addDays(weekStartDate, index);
          const isSelected = day === selectedDay;
          const hasItems = MEAL_SLOTS.some(slot =>
            (displayItemsMap.get(`${day}-${slot}`) || []).length > 0
          );

          return (
            <Button
              key={day}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDayChange(day)}
              className={cn(
                "shrink-0 snap-center flex flex-col h-auto min-h-[56px] py-3 px-4 min-w-[64px]",
                isSelected && "shadow-lg scale-105",
                hasItems && !isSelected && "border-primary/30"
              )}
            >
              <span className="text-xs font-medium">
                {format(date, 'EEE')}
              </span>
              <span className="text-xl font-serif font-bold">
                {format(date, 'd')}
              </span>
              {hasItems && (
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full mt-1",
                  isSelected ? "bg-primary-foreground" : "bg-primary"
                )} />
              )}
            </Button>
          );
        })}
      </div>

      {/* Meal Slots for Selected Day */}
      <div className="space-y-6">
        {MEAL_SLOTS.map(slot => {
          const slotId = `${selectedDay}-${slot}`;
          const displayItems = displayItemsMap.get(slotId) || [];
          const isOver = dragOverSlot === slotId;
          const hasItems = displayItems.length > 0;
          const gradientClass = mealSlotGradients[slot] || 'bg-muted';

          return (
            <div key={slot} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", gradientClass)} />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {formatSlotLabel(slot)}
                </h3>
                <div className="flex-1 h-px bg-border/30" />
              </div>

              <div
                onDrop={(e) => onDrop(e, selectedDay, slot)}
                onDragOver={(e) => onDragOver(e, slotId)}
                onDragLeave={onDragLeave}
                className={cn(
                  "min-h-[100px] rounded-2xl transition-all duration-300 p-3",
                  hasItems
                    ? "bg-transparent"
                    : "glass-subtle border border-dashed border-muted-foreground/20",
                  isOver && "bg-primary/10 border-primary drop-target scale-[1.01]",
                  !canEdit && "opacity-70"
                )}
              >
                {hasItems ? (
                  <div className="space-y-3">
                    {displayItems.map((displayItem) => (
                      <ListMealCard
                        key={displayItem.item.id}
                        displayItem={displayItem}
                        householdSize={householdSize}
                        isDragging={draggingItem?.itemId === displayItem.item.id}
                        onDragStart={(e) => onDragStart(e, displayItem.item, displayItem.recipe, displayItem)}
                        onDragEnd={onDragEnd}
                        onClick={() => onCardClick(displayItem)}
                      />
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => canEdit && onAddMealClick?.(selectedDay, slot)}
                    disabled={!canEdit}
                    className={cn(
                      "w-full flex flex-col items-center justify-center py-8 min-h-[100px] rounded-xl border-2 border-dashed transition-colors",
                      canEdit
                        ? "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 active:bg-primary/10"
                        : "border-muted-foreground/10 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors",
                      canEdit ? "bg-primary/10" : "bg-muted/50"
                    )}>
                      <Plus className={cn(
                        "h-7 w-7 transition-colors",
                        canEdit ? "text-primary" : "text-muted-foreground/40"
                      )} />
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      canEdit ? "text-primary" : "text-muted-foreground/60"
                    )}>
                      {canEdit ? 'Tap to add meal' : 'No meal planned'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact card component for list view - horizontal layout
interface ListMealCardProps {
  displayItem: DisplayMealItem;
  householdSize: number;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function ListMealCard({
  displayItem,
  householdSize,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: ListMealCardProps) {
  const { item, recipe, isLeftover, sourceItem } = displayItem;
  // For leftover cards, use source item's leftoverMeals count for correct calculation
  const leftoverCount = isLeftover && sourceItem
    ? sourceItem.leftoverMeals
    : (item.leftoverMeals || 0);
  // Calculate per-meal servings (total servings ÷ number of meals)
  const totalServings = recipe.servings * item.servingsMultiplier;
  const numberOfMeals = 1 + leftoverCount;
  const plannedServings = Math.round(totalServings / numberOfMeals);

  const formatDay = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);
  const formatSlot = (slot: string) => slot.charAt(0).toUpperCase() + slot.slice(1);
  const sourceLabel = sourceItem
    ? `From ${formatDay(sourceItem.day)}'s ${formatSlot(sourceItem.mealSlot)}`
    : 'Leftover';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group flex gap-3 p-3 rounded-xl bg-card cursor-pointer card-hover",
        isLeftover
          ? "ring-2 ring-dashed ring-amber-400/50"
          : "shadow-md",
        isDragging && "dragging"
      )}
    >
      {/* Square thumbnail */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/70">
            <Utensils className="h-6 w-6 text-muted-foreground/60" />
          </div>
        )}

        {/* Leftover icon overlay */}
        {isLeftover && (
          <div className="absolute top-1 right-1 p-1 rounded-full bg-amber-500 shadow-sm">
            <Undo2 className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="font-semibold text-base line-clamp-1 mb-1">
          {recipe.title}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{plannedServings} srv</span>
          {recipe.nutrition && (
            <span>
              {Math.round(
                (recipe.nutrition.perServing.calories * recipe.servings * item.servingsMultiplier) /
                numberOfMeals
              )} cal
            </span>
          )}
          {isLeftover && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-amber-600 font-medium">Leftover</span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{sourceLabel}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {!isLeftover && leftoverCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
              +{leftoverCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact card for accordion view - even smaller than ListMealCard
interface CompactMealCardProps {
  displayItem: DisplayMealItem;
  householdSize: number;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function CompactMealCard({
  displayItem,
  householdSize,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: CompactMealCardProps) {
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
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg bg-card/80 cursor-pointer transition-all",
        "hover:bg-card hover:shadow-sm active:scale-[0.98]",
        isLeftover && "ring-1 ring-dashed ring-amber-400/50",
        isDragging && "opacity-50"
      )}
    >
      {/* Small thumbnail */}
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

      {/* Content */}
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
