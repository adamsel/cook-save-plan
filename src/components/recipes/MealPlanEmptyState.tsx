import { Calendar, ChefHat, Clock, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MealPlanEmptyState() {
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
        Plan Your Perfect Week
      </h2>

      <p className="text-muted-foreground max-w-md mb-8 text-base md:text-lg animate-fade-up" style={{ animationDelay: '0.2s' }}>
        Drag recipes from the sidebar to start planning. We'll track nutrition and help you stay organized.
      </p>

      {/* Feature highlights */}
      <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-10 animate-fade-up" style={{ animationDelay: '0.3s' }}>
        <FeatureHighlight
          icon={Clock}
          label="Track cooking time"
          color="text-meal-breakfast"
        />
        <FeatureHighlight
          icon={ShoppingCart}
          label="Auto shopping list"
          color="text-meal-lunch"
        />
        <FeatureHighlight
          icon={ChefHat}
          label="Leftover planning"
          color="text-meal-dinner"
        />
      </div>

    </div>
  );
}

interface FeatureHighlightProps {
  icon: React.ElementType;
  label: string;
  color: string;
}

function FeatureHighlight({ icon: Icon, label, color }: FeatureHighlightProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className={cn("p-1.5 rounded-full bg-muted/50", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <span>{label}</span>
    </div>
  );
}
