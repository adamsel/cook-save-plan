import { Recipe, DAYS_OF_WEEK, MEAL_SLOTS } from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
}

export function MealPlanDialog({ open, onOpenChange, recipe }: MealPlanDialogProps) {
  const { addToMealPlan } = useRecipes();
  const { toast } = useToast();

  if (!recipe) return null;

  const handleAddToSlot = (day: string, slot: 'breakfast' | 'lunch' | 'dinner') => {
    addToMealPlan(recipe.id, day, slot);
    toast({
      title: "Added to meal plan",
      description: `${recipe.title} added to ${day} ${slot}.`,
    });
    onOpenChange(false);
  };

  const dayLabels: Record<string, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Add to Meal Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Choose when to have <span className="font-medium text-foreground">{recipe.title}</span>
          </p>

          <div className="grid gap-2">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="flex items-center gap-2">
                <span className="w-12 text-sm font-medium capitalize">{dayLabels[day]}</span>
                <div className="flex gap-2 flex-1">
                  {MEAL_SLOTS.map(slot => (
                    <Button
                      key={slot}
                      variant="outline"
                      size="sm"
                      className="flex-1 capitalize"
                      onClick={() => handleAddToSlot(day, slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
