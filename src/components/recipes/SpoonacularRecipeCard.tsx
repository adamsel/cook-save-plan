import { SpoonacularRecipeSearchResult } from '@/hooks/useSpoonacularRecipes';
import { Clock, Users, ChefHat, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface SpoonacularRecipeCardProps {
  recipe: SpoonacularRecipeSearchResult;
  onClick: (recipe: SpoonacularRecipeSearchResult) => void;
}

export function SpoonacularRecipeCard({ recipe, onClick }: SpoonacularRecipeCardProps) {
  return (
    <Card 
      className="group overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
      onClick={() => onClick(recipe)}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <ChefHat className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        
        {/* Spoonacular badge */}
        <Badge 
          className="absolute top-2 left-2 bg-orange-500/90 text-white text-xs"
        >
          <Globe className="h-3 w-3 mr-1" />
          Spoonacular
        </Badge>
      </div>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="font-serif font-semibold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {recipe.title}
        </h3>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {recipe.readyInMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.readyInMinutes}m
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {recipe.servings}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
