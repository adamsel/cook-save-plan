import { useState, useEffect } from 'react';
import { Recipe, Ingredient, IngredientReplacement } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ChefHat, Check } from 'lucide-react';

interface IngredientReplacementPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mainRecipe: Recipe;       // The recipe being viewed (e.g., Fajitas)
  linkedRecipe: Recipe;     // The recipe being linked (e.g., Homemade Naan)
  existingReplacements?: IngredientReplacement[];
  onSave: (replacements: IngredientReplacement[]) => void;
}

export function IngredientReplacementPicker({
  open,
  onOpenChange,
  mainRecipe,
  linkedRecipe,
  existingReplacements = [],
  onSave,
}: IngredientReplacementPickerProps) {
  // Set of main recipe ingredient IDs that are being replaced
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());

  // Initialize selections from existing replacements
  useEffect(() => {
    if (open) {
      const selected = new Set<string>();
      for (const replacement of existingReplacements) {
        selected.add(replacement.replacesIngredientId);
      }
      setSelectedIngredientIds(selected);
    }
  }, [open, existingReplacements]);

  const toggleIngredient = (ingredientId: string) => {
    setSelectedIngredientIds(prev => {
      const next = new Set(prev);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  };

  const handleSave = () => {
    // Create replacements - we use a dummy linkedIngredientId since the main thing
    // we care about is which main recipe ingredients get replaced
    const replacements: IngredientReplacement[] = Array.from(selectedIngredientIds).map(
      replacesIngredientId => ({
        linkedIngredientId: linkedRecipe.id, // Use recipe ID as placeholder
        replacesIngredientId,
      })
    );

    onSave(replacements);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSave([]);
    onOpenChange(false);
  };

  const formatIngredient = (ing: Ingredient) => {
    const parts = [];
    if (ing.quantity) parts.push(ing.quantity);
    if (ing.unit) parts.push(ing.unit);
    parts.push(ing.item);
    return parts.join(' ');
  };

  const hasAnySelection = selectedIngredientIds.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Configure Ingredient Replacement
          </DialogTitle>
          <DialogDescription>
            Which ingredients in <span className="font-medium">{mainRecipe.title}</span> does{' '}
            <span className="font-medium">{linkedRecipe.title}</span> replace?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Select the ingredients you won't need to buy when you're making {linkedRecipe.title} instead.
            These will be excluded from your shopping list when both recipes are planned.
          </p>

          <div className="space-y-2">
            {mainRecipe.ingredients.map((ingredient) => (
              <label
                key={ingredient.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedIngredientIds.has(ingredient.id)}
                  onCheckedChange={() => toggleIngredient(ingredient.id)}
                />
                <span className="text-sm flex-1">
                  {formatIngredient(ingredient)}
                </span>
              </label>
            ))}
          </div>

          {mainRecipe.ingredients.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No ingredients found in {mainRecipe.title}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleSave}>
            {hasAnySelection ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save ({selectedIngredientIds.size} replaced)
              </>
            ) : (
              'Save (No Replacements)'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
