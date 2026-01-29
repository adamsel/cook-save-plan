import { Recipe, MealPlanItem, EventType } from '@/types/recipe';
import { cn } from '@/lib/utils';
import { Utensils, Undo2, PartyPopper, Users, ShoppingBag } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const eventConfig: Record<EventType, { icon: typeof PartyPopper; label: string; color: string }> = {
  potluck: { icon: PartyPopper, label: 'Potluck', color: 'bg-purple-500' },
  guests: { icon: Users, label: 'Guests', color: 'bg-blue-500' },
  takeaway: { icon: ShoppingBag, label: 'Takeaway', color: 'bg-orange-500' },
};

interface MealCardProps {
  recipe: Recipe;
  item: MealPlanItem;
  isLeftover?: boolean;
  leftoverSource?: { day: string; mealSlot: string };
  sourceLeftoverMeals?: number; // Number of leftover meals from the source item
  householdSize: number;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onClick?: () => void;
}

export function MealCard({
  recipe,
  item,
  isLeftover = false,
  leftoverSource,
  sourceLeftoverMeals,
  householdSize,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: MealCardProps) {
  // For leftover cards, use source item's leftoverMeals count for correct calculation
  const leftoverCount = isLeftover && sourceLeftoverMeals !== undefined
    ? sourceLeftoverMeals
    : (item.leftoverMeals || 0);
  // Calculate per-meal servings (total servings ÷ number of meals)
  const totalServings = recipe.servings * item.servingsMultiplier;
  const numberOfMeals = 1 + leftoverCount;
  const plannedServings = Math.round(totalServings / numberOfMeals);

  // Format source info for tooltip
  const formatDay = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);
  const formatSlot = (slot: string) => slot.charAt(0).toUpperCase() + slot.slice(1);
  const sourceLabel = leftoverSource
    ? `From ${formatDay(leftoverSource.day)}'s ${formatSlot(leftoverSource.mealSlot)}`
    : 'Leftover';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group relative rounded-xl overflow-hidden cursor-pointer",
        "card-hover",
        isLeftover
          ? "ring-2 ring-dashed ring-amber-400/50 opacity-90"
          : "shadow-md",
        isDragging && "dragging"
      )}
    >
      {/* Recipe image with square aspect ratio for compact grid */}
      <div className="aspect-square relative">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/70">
            <Utensils className="h-8 w-8 text-muted-foreground/60" />
          </div>
        )}

        {/* Stronger gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Leftover indicator - top right corner badge */}
        {isLeftover && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-amber-500 shadow-md">
                <Undo2 className="h-3 w-3 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" avoidCollisions>
              <p className="text-xs">{sourceLabel}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Leftover count badge - top right (for source items) */}
        {!isLeftover && leftoverCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 shadow-md text-[10px] font-bold text-white">
                +{leftoverCount}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" avoidCollisions>
              <p className="text-xs">Makes {leftoverCount} leftover meal{leftoverCount > 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Event badge - top left */}
        {!isLeftover && item.eventType && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full shadow-md text-[10px] font-medium text-white flex items-center gap-1",
                eventConfig[item.eventType].color
              )}>
                {(() => {
                  const EventIcon = eventConfig[item.eventType!].icon;
                  return <EventIcon className="h-3 w-3" />;
                })()}
                {item.guestCount && <span>{item.guestCount}</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" avoidCollisions>
              <p className="text-xs">
                {eventConfig[item.eventType].label}
                {item.guestCount && ` for ${item.guestCount}`}
                {item.eventNote && ` - ${item.eventNote}`}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Content overlay - bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <h4 className="font-semibold text-white text-xs leading-tight line-clamp-2 drop-shadow-lg">
            {recipe.title}
          </h4>
          <div className="text-[10px] text-white/80 mt-0.5 drop-shadow-md">
            {plannedServings} srv
          </div>
        </div>
      </div>
    </div>
  );
}
