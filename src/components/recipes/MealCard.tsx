import { Recipe, MealPlanItem } from '@/types/recipe';
import { cn } from '@/lib/utils';
import { Utensils } from 'lucide-react';

interface MealCardProps {
  recipe: Recipe;
  item: MealPlanItem;
  isLeftover?: boolean;
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
  householdSize,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: MealCardProps) {
  const plannedServings = Math.round(recipe.servings * item.servingsMultiplier);
  const totalMeals = 1 + (item.leftoverMeals || 0);
  const isAdjusted = item.servingsMultiplier !== 1;

  return (
    <div
      draggable={!isLeftover}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all cursor-pointer",
        isLeftover 
          ? "bg-muted/40 border-2 border-dashed border-border/60" 
          : "bg-card border border-border/40 shadow-sm hover:shadow-md",
        isDragging && "opacity-50 ring-2 ring-primary scale-[1.02]",
        !isLeftover && "hover:border-border"
      )}
    >
      {/* Compact layout */}
      <div className="p-3">
        <div className="flex gap-3">
          {/* Recipe thumbnail */}
          <div className={cn(
            "relative w-12 h-12 rounded-lg overflow-hidden shrink-0",
            isLeftover ? "opacity-70" : ""
          )}>
            {recipe.imageUrl ? (
              <img
                src={recipe.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Utensils className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Recipe title */}
            <h4 className={cn(
              "font-medium text-sm leading-tight line-clamp-1",
              isLeftover && "text-muted-foreground"
            )}>
              {recipe.title}
            </h4>

            {/* Meal info - secondary */}
            <div className="flex items-center gap-2 mt-1">
              {isLeftover ? (
                <span className="text-xs text-muted-foreground italic">
                  Leftover
                </span>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">
                    {plannedServings} servings
                  </span>
                  {totalMeals > 1 && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-xs text-muted-foreground">
                        {totalMeals} meals
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Adjusted indicator - tertiary */}
            {isAdjusted && !isLeftover && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                Adjusted from original recipe
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
