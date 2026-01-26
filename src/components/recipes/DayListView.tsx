import { DAYS_OF_WEEK, MEAL_SLOTS, DayOfWeek, MealSlot, DisplayMealItem, Recipe, MealPlanItem } from '@/types/recipe';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Utensils, Undo2, Plus } from 'lucide-react';
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
}: DayListViewProps) {
  const dayIndex = DAYS_OF_WEEK.indexOf(selectedDay);
  const selectedDate = addDays(weekStartDate, dayIndex);

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
                "shrink-0 snap-center flex flex-col h-auto py-2 px-4 min-w-[60px]",
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
                  <div className="h-full flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Plus className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <span className="text-sm text-muted-foreground/60">
                      {canEdit ? 'Drop a recipe here' : 'No meal planned'}
                    </span>
                  </div>
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
  const leftoverCount = item.leftoverMeals || 0;
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
                (1 + (item.leftoverMeals || 0))
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
