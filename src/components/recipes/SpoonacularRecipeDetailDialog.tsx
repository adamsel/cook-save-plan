import { SpoonacularRecipeDetails } from '@/hooks/useSpoonacularRecipes';
import { Clock, Users, ExternalLink, ChefHat, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SpoonacularRecipeDetailDialogProps {
  recipe: SpoonacularRecipeDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
  onSaveToCollection?: (recipe: SpoonacularRecipeDetails) => void;
}

export function SpoonacularRecipeDetailDialog({
  recipe,
  open,
  onOpenChange,
  isLoading = false,
  error = null,
  onSaveToCollection,
}: SpoonacularRecipeDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading recipe details...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <ChefHat className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-serif text-lg font-semibold mb-2">Failed to load recipe</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : recipe ? (
            <>
              {/* Hero Image */}
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                {recipe.image ? (
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <ChefHat className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                
                {/* Spoonacular badge */}
                <Badge 
                  className="absolute top-4 left-4 bg-orange-500/90 text-white"
                >
                  <Globe className="h-3 w-3 mr-1" />
                  Spoonacular
                </Badge>
              </div>

              <div className="p-6">
                <DialogHeader className="text-left mb-4">
                  <DialogTitle className="font-serif text-2xl md:text-3xl font-bold leading-tight">
                    {recipe.title}
                  </DialogTitle>
                </DialogHeader>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  {recipe.prepTime && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Prep: {recipe.prepTime}m
                    </span>
                  )}
                  {recipe.cookTime && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Cook: {recipe.cookTime}m
                    </span>
                  )}
                  {recipe.readyInMinutes && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Total: {recipe.readyInMinutes}m
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {recipe.servings} servings
                  </span>
                  {recipe.sourceUrl && (
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View source
                    </a>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {recipe.cuisines?.map(cuisine => (
                    <Badge key={cuisine} variant="secondary">{cuisine}</Badge>
                  ))}
                  {recipe.diets?.map(diet => (
                    <Badge key={diet} variant="outline">{diet}</Badge>
                  ))}
                  {recipe.dishTypes?.map(type => (
                    <Badge key={type} variant="outline" className="bg-accent/10">{type}</Badge>
                  ))}
                </div>

                {/* Summary / Description */}
                {recipe.summary && (
                  <div className="prose prose-sm max-w-none mb-6">
                    <p className="text-muted-foreground">{recipe.summary}</p>
                  </div>
                )}

                {/* Nutrition */}
                {recipe.nutrition && (
                  <div className="bg-secondary/50 rounded-xl p-4 mb-6">
                    <h3 className="font-serif text-sm font-semibold mb-3">Nutrition per serving</h3>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-lg font-semibold">{recipe.nutrition.calories}</p>
                        <p className="text-xs text-muted-foreground">kcal</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{recipe.nutrition.protein}g</p>
                        <p className="text-xs text-muted-foreground">protein</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{recipe.nutrition.carbs}g</p>
                        <p className="text-xs text-muted-foreground">carbs</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{recipe.nutrition.fat}g</p>
                        <p className="text-xs text-muted-foreground">fat</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-[1fr_1.5fr] gap-6">
                  {/* Ingredients */}
                  <div>
                    <h3 className="font-serif text-lg font-semibold mb-3">Ingredients</h3>
                    <ul className="space-y-2">
                      {recipe.extendedIngredients?.map((ing, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                          <span>
                            <span className="font-medium">{ing.amount} </span>
                            <span>{ing.unit} </span>
                            {ing.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h3 className="font-serif text-lg font-semibold mb-3">Instructions</h3>
                    {recipe.instructions?.length > 0 ? (
                      <ol className="space-y-4">
                        {recipe.instructions.map((instruction, index) => (
                          <li key={index} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <span className="pt-0.5">{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No instructions available. Visit the source for full recipe details.
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
                  {onSaveToCollection && (
                    <Button onClick={() => onSaveToCollection(recipe)}>
                      Save to My Recipes
                    </Button>
                  )}
                  
                  {recipe.sourceUrl && (
                    <Button variant="outline" asChild>
                      <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Original
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
