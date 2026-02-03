import { useState } from 'react';
import { Recipe, RecipeShare, PendingShare } from '@/types/recipe';
import { Heart, Clock, Users, ExternalLink, Calendar, Pencil, Archive, Trash2, ChefHat, Flame, Copy, Library, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ShareRecipeDialog } from './ShareRecipeDialog';

interface RecipeDetailDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (id: string) => void;
  onAddToMealPlan: (recipe: Recipe) => void;
  isLibraryRecipe?: boolean;
  onCopyToPersonal?: (recipe: Recipe) => void;
  // Sharing props
  onTogglePublic?: (recipeId: string, isPublic: boolean) => Promise<boolean>;
  onShareByEmail?: (recipeId: string, email: string, canEdit?: boolean) => Promise<{ error: string | null; shared: boolean; pending: boolean }>;
  onGetShares?: (recipeId: string) => Promise<{ shares: RecipeShare[]; pendingShares: PendingShare[] }>;
  onRevokeShare?: (shareId: string) => Promise<boolean>;
  onRevokePendingShare?: (pendingShareId: string) => Promise<boolean>;
}

export function RecipeDetailDialog({
  recipe,
  open,
  onOpenChange,
  onToggleFavorite,
  onToggleArchive,
  onEdit,
  onDelete,
  onAddToMealPlan,
  isLibraryRecipe = false,
  onCopyToPersonal,
  onTogglePublic,
  onShareByEmail,
  onGetShares,
  onRevokeShare,
  onRevokePendingShare,
}: RecipeDetailDialogProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  if (!recipe) return null;

  const nutrition = recipe.nutrition?.perServing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          {/* Hero Image */}
          <div className="relative aspect-[16/9] overflow-hidden bg-muted">
            {recipe.imageUrl ? (
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <ChefHat className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            
            {/* Library badge */}
            {isLibraryRecipe && (
              <Badge 
                className="absolute top-4 left-4 bg-primary/90 text-primary-foreground"
              >
                <Library className="h-3 w-3 mr-1" />
                Library Recipe
              </Badge>
            )}
            
            {/* Favorite button - only show for personal recipes */}
            {!isLibraryRecipe && (
              <button
                onClick={() => onToggleFavorite(recipe.id)}
                className={cn(
                  "absolute top-4 right-4 p-3 rounded-full backdrop-blur-sm transition-all",
                  recipe.isFavorite 
                    ? "bg-accent text-accent-foreground" 
                    : "bg-background/80 text-muted-foreground hover:text-accent"
                )}
              >
                <Heart className={cn("h-5 w-5", recipe.isFavorite && "fill-current")} />
              </button>
            )}
          </div>

          <div className="p-6">
            <DialogHeader className="text-left mb-4">
              <DialogTitle className="font-serif text-2xl md:text-3xl font-bold leading-tight">
                {recipe.title}
              </DialogTitle>
              
              {recipe.author && (
                <p className="text-muted-foreground text-sm mt-1">
                  by {recipe.author}
                </p>
              )}
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
                  <Flame className="h-4 w-4" />
                  Cook: {recipe.cookTime}m
                </span>
              )}
              {recipe.totalTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Total: {recipe.totalTime}m
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
                  title="Recipe from original creator • Always linked back"
                >
                  <ExternalLink className="h-4 w-4" />
                  View source
                </a>
              )}
            </div>

            {/* Source attribution */}
            {recipe.sourceUrl && (
              <p className="text-xs text-muted-foreground mb-4 -mt-2">
                Recipe from original creator • Always linked back
              </p>
            )}

            {/* Meal type and tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge variant="secondary">{recipe.mealTypes?.[0] || recipe.category}</Badge>
              {recipe.tags.map(tag => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>

            {/* Description */}
            {recipe.description && (
              <p className="text-muted-foreground mb-6">{recipe.description}</p>
            )}

            {/* Nutrition */}
            {nutrition && (
              <div className="bg-secondary/50 rounded-xl p-4 mb-6">
                <h3 className="font-serif font-semibold mb-3 flex items-center gap-2">
                  Nutrition per serving
                  {recipe.nutrition?.source !== 'provided_by_site' && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {recipe.nutrition?.source === 'ai_estimate' ? 'Estimated' : 'Manual'}
                    </Badge>
                  )}
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                  {nutrition.calories !== undefined && (
                    <div>
                      <p className="text-lg font-semibold">{nutrition.calories}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                  )}
                  {nutrition.protein !== undefined && (
                    <div>
                      <p className="text-lg font-semibold">{nutrition.protein}g</p>
                      <p className="text-xs text-muted-foreground">protein</p>
                    </div>
                  )}
                  {nutrition.carbs !== undefined && (
                    <div>
                      <p className="text-lg font-semibold">{nutrition.carbs}g</p>
                      <p className="text-xs text-muted-foreground">carbs</p>
                    </div>
                  )}
                  {nutrition.fat !== undefined && (
                    <div>
                      <p className="text-lg font-semibold">{nutrition.fat}g</p>
                      <p className="text-xs text-muted-foreground">fat</p>
                    </div>
                  )}
                  {nutrition.fiber !== undefined && (
                    <div>
                      <p className="text-lg font-semibold">{nutrition.fiber}g</p>
                      <p className="text-xs text-muted-foreground">fiber</p>
                    </div>
                  )}
                  {nutrition.sugar !== undefined && (
                    <div>
                      <p className="text-lg font-semibold">{nutrition.sugar}g</p>
                      <p className="text-xs text-muted-foreground">sugar</p>
                    </div>
                  )}
                </div>
                {recipe.nutrition?.notes && (
                  <p className="text-xs text-muted-foreground mt-3 italic">{recipe.nutrition.notes}</p>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-[1fr_1.5fr] gap-6">
              {/* Ingredients */}
              <div>
                <h3 className="font-serif text-lg font-semibold mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, index) => (
                    <li key={ing.id || index} className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      <span>
                        {ing.quantity && <span className="font-medium">{ing.quantity} </span>}
                        {ing.unit && <span>{ing.unit} </span>}
                        {ing.item}
                        {ing.notes && <span className="text-muted-foreground"> ({ing.notes})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="font-serif text-lg font-semibold mb-3">Instructions</h3>
                <ol className="space-y-4">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="pt-0.5">{typeof instruction === 'string' ? instruction : instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
              <Button onClick={() => onAddToMealPlan(recipe)}>
                <Calendar className="h-4 w-4 mr-2" />
                Add to Meal Plan
              </Button>

              {/* Share button - only for personal recipes with sharing enabled */}
              {!isLibraryRecipe && onTogglePublic && (
                <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              )}

              {isLibraryRecipe && onCopyToPersonal && (
                <Button variant="outline" onClick={() => onCopyToPersonal(recipe)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to My Recipes
                </Button>
              )}

              {!isLibraryRecipe && onEdit && (
                <Button variant="outline" onClick={() => onEdit(recipe)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}

              {!isLibraryRecipe && (
                <Button variant="outline" onClick={() => onToggleArchive(recipe.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  {recipe.isArchived ? 'Unarchive' : 'Archive'}
                </Button>
              )}

              {!isLibraryRecipe && onDelete && (
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    onDelete(recipe.id);
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Share Recipe Dialog */}
      {!isLibraryRecipe && onTogglePublic && (
        <ShareRecipeDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          recipe={recipe}
          isPublic={recipe.isPublic || false}
          onTogglePublic={async (isPublic) => {
            if (onTogglePublic) {
              return await onTogglePublic(recipe.id, isPublic);
            }
            return false;
          }}
          onShareByEmail={onShareByEmail}
          onGetShares={onGetShares}
          onRevokeShare={onRevokeShare}
          onRevokePendingShare={onRevokePendingShare}
        />
      )}
    </Dialog>
  );
}
