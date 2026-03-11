import { useState } from 'react';
import { Recipe, RecipeShare, PendingShare, IngredientReplacement } from '@/types/recipe';
import { Heart, Clock, Users, ExternalLink, Calendar, Pencil, Archive, Trash2, ChefHat, Flame, Copy, Library, Share2, Link2, X, Loader2, Settings, AlertTriangle } from 'lucide-react';
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
import { RecipeLinkPicker } from './RecipeLinkPicker';
import { VideoEmbed } from './VideoEmbed';
import { IngredientReplacementPicker } from './IngredientReplacementPicker';
import { useRecipeLinks } from '@/hooks/useRecipeLinks';
import { useRecipeAttribution } from '@/hooks/useRecipeAttribution';
import { useRecipes } from '@/context/RecipeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';

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
  const [replacementPickerState, setReplacementPickerState] = useState<{
    open: boolean;
    linkedRecipe: Recipe | null;
    linkId: string | null;
    existingReplacements: IngredientReplacement[];
  }>({ open: false, linkedRecipe: null, linkId: null, existingReplacements: [] });

  const { recipes: allRecipes } = useRecipes();
  const { linkedRecipes, isLoading: isLoadingLinks, addLink, removeLink, updateReplacements } = useRecipeLinks(recipe?.id);
  const { attribution } = useRecipeAttribution(recipe?.id, recipe?.originalRecipeId);

  if (!recipe) return null;

  // Handle adding a new link - show replacement picker after
  const handleAddLink = async (linkedRecipe: Recipe) => {
    const linkId = await addLink(linkedRecipe.id);
    if (linkId) {
      // Open the replacement picker with the created link ID
      setReplacementPickerState({
        open: true,
        linkedRecipe,
        linkId,
        existingReplacements: [],
      });
    }
  };

  // Open replacement picker for existing link
  const openReplacementPicker = (linkedRecipe: Recipe, linkId: string, existingReplacements: IngredientReplacement[]) => {
    setReplacementPickerState({
      open: true,
      linkedRecipe,
      linkId,
      existingReplacements,
    });
  };

  // Save replacements
  const handleSaveReplacements = async (replacements: IngredientReplacement[]) => {
    // Find the link ID if not already set
    let linkId = replacementPickerState.linkId;
    if (!linkId && replacementPickerState.linkedRecipe) {
      const link = linkedRecipes.find(
        lr => lr.recipe.id === replacementPickerState.linkedRecipe?.id
      );
      linkId = link?.link.id || null;
    }

    if (linkId) {
      await updateReplacements(linkId, replacements.length > 0 ? replacements : null);
    }
  };

  // Helper to get ingredient name by ID
  const getIngredientName = (ingredientId: string) => {
    const ing = recipe.ingredients.find(i => i.id === ingredientId);
    return ing?.item || 'Unknown ingredient';
  };

  const nutrition = recipe.nutrition?.perServing;

  // IDs to exclude from the link picker (current recipe + already linked)
  const excludeFromPicker = [
    recipe.id,
    ...linkedRecipes.map(lr => lr.recipe.id),
  ];

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

          {/* Video embed */}
          {recipe.videoUrl && (
            <div className="px-6 pt-4">
              <VideoEmbed url={recipe.videoUrl} platform={recipe.videoPlatform} />
            </div>
          )}

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

            {/* Attribution banner for saved/cloned recipes */}
            {attribution && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border mb-4">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={attribution.creatorAvatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {attribution.creatorDisplayName?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <span className="text-muted-foreground">Originally by </span>
                  {attribution.creatorUsername ? (
                    <Link
                      to={`/creator/${attribution.creatorUsername}`}
                      className="font-medium text-primary hover:underline"
                      onClick={() => onOpenChange(false)}
                    >
                      @{attribution.creatorUsername}
                    </Link>
                  ) : (
                    <span className="font-medium">
                      {attribution.creatorDisplayName || 'Unknown creator'}
                    </span>
                  )}
                </div>
              </div>
            )}

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
                      {recipe.nutrition?.source === 'calculated' ? 'Calculated' :
                       recipe.nutrition?.source === 'ai_estimate' ? 'Estimated' : 'Manual'}
                    </Badge>
                  )}
                </h3>
                {recipe.nutrition?.verified === false ? (
                  <p className="text-sm text-amber-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Nutrition data may be inaccurate — tap to review and edit this recipe.
                  </p>
                ) : (
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
                )}
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

            {/* Goes with - Linked recipes (only for personal recipes) */}
            {!isLibraryRecipe && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Goes with
                  </h3>
                  <RecipeLinkPicker
                    recipes={allRecipes}
                    excludeRecipeIds={excludeFromPicker}
                    onSelectRecipe={handleAddLink}
                  />
                </div>

                {isLoadingLinks ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading linked recipes...
                  </div>
                ) : linkedRecipes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No linked recipes yet. Link recipes that go well together.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedRecipes.map(({ link, recipe: linkedRecipe }) => (
                      <div
                        key={link.id}
                        className="p-2 rounded-lg bg-muted/50 group"
                      >
                        <div className="flex items-center gap-3">
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
                            <p className="font-medium text-sm truncate">{linkedRecipe.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {linkedRecipe.totalTime ? `${linkedRecipe.totalTime}m` : linkedRecipe.category}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openReplacementPicker(
                              linkedRecipe,
                              link.id,
                              link.replacements || []
                            )}
                            title="Configure ingredient replacements"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeLink(link.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Show replacement info if configured */}
                        {link.replacements && link.replacements.length > 0 && (
                          <div className="mt-2 ml-[52px] pl-2 border-l-2 border-primary/30">
                            <p className="text-xs text-muted-foreground">
                              Replaces:{' '}
                              <span className="text-foreground">
                                {link.replacements.map(r => getIngredientName(r.replacesIngredientId)).join(', ')}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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

      {/* Ingredient Replacement Picker Dialog */}
      {replacementPickerState.linkedRecipe && (
        <IngredientReplacementPicker
          open={replacementPickerState.open}
          onOpenChange={(open) => setReplacementPickerState(prev => ({ ...prev, open }))}
          mainRecipe={recipe}
          linkedRecipe={replacementPickerState.linkedRecipe}
          existingReplacements={replacementPickerState.existingReplacements}
          onSave={handleSaveReplacements}
        />
      )}
    </Dialog>
  );
}
