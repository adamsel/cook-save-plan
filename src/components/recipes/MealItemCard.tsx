import { useState, useEffect } from 'react';
import { Recipe, MealPlanItem } from '@/types/recipe';
import { cn } from '@/lib/utils';
import { X, Utensils, Users, ChefHat, Minus, Plus, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MealItemCardProps {
  recipe: Recipe;
  item: MealPlanItem;
  canEdit: boolean;
  householdSize: number;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onClick?: () => void;
  onRemove?: () => void;
  onUpdateServings?: (servings: number) => void;
  onUpdateLeftovers?: (leftovers: number) => void;
}

export function MealItemCard({
  recipe,
  item,
  canEdit,
  householdSize,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
  onRemove,
  onUpdateServings,
  onUpdateLeftovers,
}: MealItemCardProps) {
  const plannedServings = Math.round(recipe.servings * item.servingsMultiplier);
  const totalMeals = 1 + (item.leftoverMeals || 0);
  
  // Calculate how many people one "meal" serves
  const servingsPerMeal = Math.ceil(plannedServings / totalMeals);

  const handleServingsChange = (delta: number) => {
    const newMultiplier = Math.max(0.5, Math.min(4, item.servingsMultiplier + delta));
    onUpdateServings?.(newMultiplier);
  };

  return (
    <div
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative bg-secondary/50 rounded-xl overflow-hidden transition-all border border-transparent hover:border-border/50 hover:shadow-sm",
        canEdit && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      {/* Recipe Header - Clickable */}
      <div 
        className="cursor-pointer" 
        onClick={onClick}
      >
        {/* Recipe Image */}
        {recipe.imageUrl && (
          <div className="relative h-14 w-full">
            <img
              src={recipe.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            
            {/* Floating "Feeds X" badge */}
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
              <Badge 
                variant="secondary" 
                className="bg-white/90 text-foreground text-[10px] px-1.5 py-0 h-5 font-medium shadow-sm"
              >
                <ChefHat className="h-3 w-3 mr-0.5" />
                Feeds {totalMeals} meal{totalMeals > 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        )}
        
        {/* No image fallback with badge */}
        {!recipe.imageUrl && (
          <div className="relative h-10 w-full bg-muted/50 flex items-center justify-center">
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0 h-5 font-medium"
            >
              <ChefHat className="h-3 w-3 mr-0.5" />
              Feeds {totalMeals}
            </Badge>
          </div>
        )}
        
        <div className="px-2.5 pt-2 pb-1">
          <div className="flex items-start justify-between gap-1">
            <h4 className="font-medium text-xs leading-tight line-clamp-2 flex-1">
              {recipe.title}
            </h4>
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove?.();
                }}
                className="shrink-0 p-0.5 rounded hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Controls - Only when editable */}
      {canEdit && (
        <div 
          className="px-2.5 pb-2.5 pt-1 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Servings Control */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Servings
            </span>
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
              <button
                onClick={() => handleServingsChange(-0.5)}
                className="p-0.5 rounded hover:bg-background transition-colors"
                disabled={item.servingsMultiplier <= 0.5}
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-xs w-6 text-center font-medium tabular-nums">
                {plannedServings}
              </span>
              <button
                onClick={() => handleServingsChange(0.5)}
                className="p-0.5 rounded hover:bg-background transition-colors"
                disabled={item.servingsMultiplier >= 4}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Leftovers Control */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" />
              Leftovers
            </span>
            <Select
              value={String(item.leftoverMeals || 0)}
              onValueChange={(value) => onUpdateLeftovers?.(parseInt(value))}
            >
              <SelectTrigger className="h-6 w-[90px] text-[10px] border-0 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0" className="text-xs">No leftovers</SelectItem>
                <SelectItem value="1" className="text-xs">+1 meal</SelectItem>
                <SelectItem value="2" className="text-xs">+2 meals</SelectItem>
                <SelectItem value="3" className="text-xs">+3 meals</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Read-only summary for non-editable */}
      {!canEdit && (
        <div className="px-2.5 pb-2 pt-1">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {plannedServings} srv
            </span>
            {item.leftoverMeals > 0 && (
              <span className="flex items-center gap-0.5">
                <ArrowRightLeft className="h-3 w-3" />
                +{item.leftoverMeals} leftover{item.leftoverMeals > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
