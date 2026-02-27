import { useState, useEffect } from 'react';
import { Recipe, DayOfWeek, MealSlot } from '@/types/recipe';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, ChefHat } from 'lucide-react';
import { useRecipeLinks } from '@/hooks/useRecipeLinks';
import { cn } from '@/lib/utils';

interface LinkedRecipePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  day: DayOfWeek | null;
  slot: MealSlot | null;
  onConfirm: (mainRecipe: Recipe, linkedRecipes: Recipe[], day: DayOfWeek, slot: MealSlot) => void;
}

const formatSlot = (slot: string) => slot.charAt(0).toUpperCase() + slot.slice(1);
const formatDay = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);

export function LinkedRecipePrompt({
  open,
  onOpenChange,
  recipe,
  day,
  slot,
  onConfirm,
}: LinkedRecipePromptProps) {
  const { linkedRecipes, isLoading, hasLoaded } = useRecipeLinks(recipe?.id);
  const [selectedLinkedIds, setSelectedLinkedIds] = useState<Set<string>>(new Set());

  // Pre-select all linked recipes when they load
  useEffect(() => {
    if (linkedRecipes.length > 0) {
      setSelectedLinkedIds(new Set(linkedRecipes.map(lr => lr.recipe.id)));
    }
  }, [linkedRecipes]);

  // Reset selection when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedLinkedIds(new Set());
    }
  }, [open]);

  // Auto-confirm when no linked recipes exist (skip the dialog)
  // This effect MUST be before any early returns to satisfy React hooks rules
  useEffect(() => {
    if (open && hasLoaded && !isLoading && linkedRecipes.length === 0 && recipe && day && slot) {
      onConfirm(recipe, [], day, slot);
      onOpenChange(false);
    }
  }, [open, hasLoaded, isLoading, linkedRecipes.length, recipe, day, slot, onConfirm, onOpenChange]);

  // Early return if required props are missing
  if (!recipe || !day || !slot) return null;

  // Don't show anything while loading - avoids the annoying 1-second popup for recipes without links
  // The auto-confirm effect will handle adding the recipe once we know there are no linked recipes
  if (!hasLoaded || isLoading) {
    return null;
  }

  // Don't render dialog if there are no linked recipes (auto-confirm effect handles this)
  if (linkedRecipes.length === 0) {
    return null;
  }

  const hasLinkedRecipes = linkedRecipes.length > 0;
  const totalPrepTime = (recipe.totalTime || 0) +
    linkedRecipes
      .filter(lr => selectedLinkedIds.has(lr.recipe.id))
      .reduce((sum, lr) => sum + (lr.recipe.totalTime || 0), 0);

  const handleToggleLinked = (id: string) => {
    setSelectedLinkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedLinkedRecipes = linkedRecipes
      .filter(lr => selectedLinkedIds.has(lr.recipe.id))
      .map(lr => lr.recipe);
    onConfirm(recipe, selectedLinkedRecipes, day, slot);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Add to {formatDay(day)} {formatSlot(slot)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Main recipe */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {recipe.imageUrl ? (
                <img
                  src={recipe.imageUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ChefHat className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{recipe.title}</p>
                {recipe.totalTime && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {recipe.totalTime} min
                  </p>
                )}
              </div>
            </div>

            {/* Linked recipes */}
            {hasLinkedRecipes && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Make these too?</p>
                <div className="space-y-2">
                  {linkedRecipes.map(({ link, recipe: linkedRecipe }) => {
                    const isSelected = selectedLinkedIds.has(linkedRecipe.id);
                    return (
                      <label
                        key={link.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          isSelected
                            ? "bg-primary/5 border-primary/30"
                            : "bg-background border-border hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleLinked(linkedRecipe.id)}
                        />
                        {linkedRecipe.imageUrl ? (
                          <img
                            src={linkedRecipe.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                            <ChefHat className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{linkedRecipe.title}</p>
                          {linkedRecipe.totalTime && (
                            <p className="text-xs text-muted-foreground">
                              +{linkedRecipe.totalTime} min
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Total time summary */}
                {totalPrepTime > 0 && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Total time: {totalPrepTime} min
                  </p>
                )}
              </div>
            )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Add to Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
