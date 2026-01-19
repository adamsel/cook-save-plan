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
  const isAdjusted = plannedServings !== householdSize;

  return (
    <div
      draggable={!isLeftover}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all cursor-pointer",
        isLeftover 
          ? "bg-muted/30 border-2 border-dashed border-muted-foreground/20" 
          : "bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border",
        isDragging && "opacity-50 ring-2 ring-primary scale-[1.02]"
      )}
    >
      <div className="p-3">
        <div className="flex gap-3">
          {/* Recipe thumbnail */}
          <div className={cn(
            "relative w-12 h-12 rounded-lg overflow-hidden shrink-0",
            isLeftover && "opacity-60"
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

          {/* Content with clear hierarchy */}
          <div className="flex-1 min-w-0 space-y-0.5">
            {/* PRIMARY: Recipe title */}
            <h4 className={cn(
              "font-medium text-sm leading-tight line-clamp-1",
              isLeftover && "text-muted-foreground"
            )}>
              {recipe.title}
            </h4>

            {/* SECONDARY: Feeds info or leftover label */}
            {isLeftover ? (
              <p className="text-xs text-muted-foreground/80 italic">
                Leftover from previous day
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Feeds {totalMeals} meal{totalMeals > 1 ? 's' : ''}
                {totalMeals > 1 && (
                  <span className="text-muted-foreground/60">
                    {' '}· {item.leftoverMeals} leftover{item.leftoverMeals > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            )}

            {/* TERTIARY: Adjusted serving note */}
            {!isLeftover && isAdjusted && (
              <p className="text-[10px] text-muted-foreground/60">
                {plannedServings} servings · adjusted
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
