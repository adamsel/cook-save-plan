import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRecipes } from '@/context/RecipeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { Recipe } from '@/types/recipe';

interface FeedRecipePreviewDialogProps {
  recipeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pre-populated card-level data for instant rendering
  cardData?: {
    title: string;
    imageUrl: string | null;
    creatorDisplayName: string | null;
    creatorUsername: string | null;
    creatorAvatarUrl: string | null;
  } | null;
}

export function FeedRecipePreviewDialog({
  recipeId,
  open,
  onOpenChange,
  cardData,
}: FeedRecipePreviewDialogProps) {
  const { user } = useAuth();
  const { copyToPersonal } = useRecipes();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open || !recipeId) {
      setRecipe(null);
      setSaved(false);
      return;
    }

    setIsLoading(true);
    supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('is_public', true)
      .single()
      .then(({ data }) => {
        if (data) {
          setRecipe({
            id: data.id,
            title: data.title,
            description: data.description,
            imageUrl: data.image_url,
            sourceUrl: data.source_url,
            category: data.category || '',
            tags: data.tags || [],
            prepTime: data.prep_time,
            cookTime: data.cook_time,
            totalTime: data.total_time,
            servings: data.servings || 4,
            ingredients: (data.ingredients as any[]) || [],
            instructions: (data.instructions as string[]) || [],
            isFavorite: false,
            isArchived: false,
            cuisine: data.cuisine,
            dietary: data.dietary || [],
            mealTypes: data.meal_types || [],
            author: data.author,
            nutrition: data.nutrition as any,
            importMethod: data.import_method as any,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          } as Recipe);
        }
        setIsLoading(false);
      });
  }, [open, recipeId]);

  const handleSave = async () => {
    if (!user) {
      onOpenChange(false);
      navigate('/auth');
      return;
    }
    if (!recipe) return;

    setIsSaving(true);
    const result = await copyToPersonal(recipe.id, recipe);
    if (result) {
      setSaved(true);
      toast({ title: 'Recipe saved to your collection' });
    } else {
      toast({ title: 'Failed to save recipe', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const displayTitle = recipe?.title || cardData?.title || '';
  const displayImage = recipe?.imageUrl || cardData?.imageUrl;
  const creatorName = cardData?.creatorDisplayName || cardData?.creatorUsername;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 overflow-hidden">
        <div className="overflow-y-auto max-h-[85vh]">
          {displayImage && (
            <div className="aspect-video overflow-hidden">
              <img src={displayImage} alt={displayTitle} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl">{displayTitle}</DialogTitle>
              {recipe?.description && (
                <DialogDescription>{recipe.description}</DialogDescription>
              )}
            </DialogHeader>

            {/* Creator info */}
            {cardData && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={cardData.creatorAvatarUrl || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {(creatorName || 'C')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">{creatorName}</span>
              </div>
            )}

            {/* Metadata */}
            {recipe && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {recipe.totalTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {recipe.totalTime} min
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {recipe.servings} servings
                </span>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {/* Ingredients */}
            {recipe?.ingredients && recipe.ingredients.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Ingredients</h3>
                <ul className="space-y-1">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>
                        {ing.quantity && <span className="font-medium">{ing.quantity} </span>}
                        {ing.unit && <span>{ing.unit} </span>}
                        {ing.item || (ing as any).name || ''}
                        {ing.notes && <span className="text-muted-foreground"> ({ing.notes})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions */}
            {recipe?.instructions && recipe.instructions.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Instructions</h3>
                <ol className="space-y-2">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="text-sm flex gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">{i + 1}</span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Actions */}
            {recipe && (
              <div className="pt-2 space-y-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || saved}
                  className="w-full"
                >
                  {saved ? (
                    'Saved to My Stash'
                  ) : isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save to My Stash'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/recipe/${recipeId}`);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View full recipe
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
