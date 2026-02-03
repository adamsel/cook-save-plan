import { SpoonacularRecipeSearchResult } from '@/hooks/useSpoonacularRecipes';
import { Clock, Users, ChefHat, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface SpoonacularRecipeCardProps {
  recipe: SpoonacularRecipeSearchResult;
  onClick: (recipe: SpoonacularRecipeSearchResult) => void;
}

export function SpoonacularRecipeCard({ recipe, onClick }: SpoonacularRecipeCardProps) {
  const isMobile = useIsMobile();

  return (
    <Card
      className="group overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
      onClick={() => onClick(recipe)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <ChefHat className={cn(isMobile ? "h-6 w-6" : "h-10 w-10", "text-muted-foreground")} />
          </div>
        )}

        {/* Spoonacular badge */}
        <Badge
          className={cn(
            "absolute bg-orange-500/90 text-white",
            isMobile ? "top-1.5 left-1.5 text-[10px] px-1.5 py-0" : "top-2 left-2 text-xs"
          )}
        >
          <Globe className={cn(isMobile ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1")} />
          {isMobile ? "Web" : "Spoonacular"}
        </Badge>
      </div>

      <CardContent className={cn(
        "flex flex-col",
        isMobile ? "p-2.5 h-[100px]" : "p-4 h-[140px]"
      )}>
        {/* Title */}
        <h3 className={cn(
          "font-serif font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors",
          isMobile ? "text-sm min-h-[2.5rem] mb-1.5" : "text-lg min-h-[3.5rem] mb-2"
        )}>
          {recipe.title}
        </h3>

        {/* Meta info */}
        <div className={cn(
          "flex items-center text-muted-foreground mt-auto",
          isMobile ? "gap-2 text-xs" : "gap-3 text-sm"
        )}>
          {recipe.readyInMinutes && (
            <span className="flex items-center gap-1">
              <Clock className={cn(isMobile ? "h-3 w-3" : "h-3.5 w-3.5")} />
              {recipe.readyInMinutes}m
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className={cn(isMobile ? "h-3 w-3" : "h-3.5 w-3.5")} />
              {recipe.servings}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
