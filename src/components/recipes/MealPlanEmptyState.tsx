import { Calendar, Plus, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MealPlanEmptyStateProps {
  onAddRecipe?: () => void;
}

export function MealPlanEmptyState({ onAddRecipe }: MealPlanEmptyStateProps) {
  const navigate = useNavigate();

  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 md:py-20 text-center px-4">
      {/* Animated icon container */}
      <div className="relative mb-8">
        <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary/20 via-accent/15 to-primary/10 flex items-center justify-center animate-fade-up">
          <Calendar className="h-14 w-14 md:h-16 md:w-16 text-primary/60" />
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-meal-breakfast opacity-60" />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-meal-lunch opacity-60" />
        <div className="absolute top-1/2 -right-4 w-2 h-2 rounded-full bg-meal-dinner opacity-60" />
      </div>

      <h2 className="font-serif text-2xl md:text-3xl font-bold mb-3 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        Let's fill your week.
      </h2>

      <p className="text-muted-foreground max-w-md mb-8 text-base md:text-lg animate-fade-up" style={{ animationDelay: '0.2s' }}>
        Tap any empty slot to add a meal. Start with dinners—we'll handle the rest.
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: '0.3s' }}>
        <Button
          size="lg"
          className="gap-2"
          onClick={() => {
            if (onAddRecipe) {
              onAddRecipe();
            } else {
              navigate('/recipes');
            }
          }}
        >
          <Plus className="h-4 w-4" />
          Add a Recipe
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={() => navigate('/discover')}
        >
          <Compass className="h-4 w-4" />
          Browse Creators
        </Button>
      </div>
    </div>
  );
}
