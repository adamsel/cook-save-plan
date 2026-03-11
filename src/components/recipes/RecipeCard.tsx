import { useRef } from 'react';
import { Recipe } from '@/types/recipe';
import { Heart, Clock, Users, ExternalLink, MoreHorizontal, Calendar, Archive, Pencil, Trash2, Copy, AlertTriangle, Camera, Globe } from 'lucide-react';
import { uploadRecipeImage } from '@/lib/uploadRecipeImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onAddToMealPlan: (recipe: Recipe) => void;
  onViewDetails: (recipe: Recipe) => void;
  isDragging?: boolean;
  isLibraryRecipe?: boolean;
  onCopyToPersonal?: (recipe: Recipe) => void;
  userId?: string;
  onImageUpload?: (recipeId: string, imageUrl: string) => void;
  onTogglePublic?: (id: string, isPublic: boolean) => Promise<boolean>;
}

export function RecipeCard({
  recipe,
  onToggleFavorite,
  onToggleArchive,
  onEdit,
  onDelete,
  onAddToMealPlan,
  onViewDetails,
  isDragging = false,
  isLibraryRecipe = false,
  onCopyToPersonal,
  userId,
  onImageUpload,
  onTogglePublic,
}: RecipeCardProps) {
  const isMobile = useIsMobile();
  const cardImageInputRef = useRef<HTMLInputElement>(null);

  const handleCardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file || !onImageUpload || !userId) return;
    if (file.size > 5 * 1024 * 1024) return;

    const url = await uploadRecipeImage(userId, recipe.id, file);
    if (url) onImageUpload(recipe.id, url);
    if (cardImageInputRef.current) cardImageInputRef.current.value = '';
  };

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50 overflow-hidden recipe-card-hover cursor-pointer",
        isDragging && "drag-ghost"
      )}
      draggable
      onClick={() => onViewDetails(recipe)}
      onDragStart={(e) => {
        e.dataTransfer.setData('recipeId', recipe.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {/* Image */}
      <div className={cn(
        "relative overflow-hidden bg-muted",
        isMobile ? "aspect-[4/3]" : "aspect-[4/3]"
      )}>
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary relative">
            <span className={cn(isMobile ? "text-2xl" : "text-4xl")}>🍳</span>
            {!isLibraryRecipe && onImageUpload && userId && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cardImageInputRef.current?.click();
                  }}
                  className={cn(
                    "absolute rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground backdrop-blur-sm transition-all",
                    isMobile ? "bottom-2 right-2 p-1.5" : "bottom-3 right-3 p-2"
                  )}
                  title="Add photo"
                >
                  <Camera className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                </button>
                <input
                  ref={cardImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCardImageUpload}
                />
              </>
            )}
          </div>
        )}

        {/* Public/shared badge */}
        {!isLibraryRecipe && recipe.isPublic && (
          <Badge className={cn(
            "absolute bg-primary/90 text-primary-foreground border-0 gap-1",
            isMobile ? "top-2 left-2 text-[10px] px-1.5 py-0.5" : "top-3 left-3 text-xs"
          )}>
            <Globe className="h-3 w-3" />
            Shared
          </Badge>
        )}

        {/* Favorite button - only show for personal recipes */}
        {!isLibraryRecipe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(recipe.id);
            }}
            className={cn(
              "absolute rounded-full backdrop-blur-sm transition-all",
              isMobile ? "top-2 right-2 p-1.5" : "top-3 right-3 p-2",
              recipe.isFavorite
                ? "bg-accent text-accent-foreground"
                : "bg-background/80 text-muted-foreground hover:text-accent"
            )}
          >
            <Heart className={cn(
              recipe.isFavorite && "fill-current",
              isMobile ? "h-3.5 w-3.5" : "h-4 w-4"
            )} />
          </button>
        )}

        {/* Data quality warning */}
        {recipe.dataQualityWarning && !isLibraryRecipe && (
          <div
            className={cn(
              "absolute bg-amber-500/90 text-white rounded-full backdrop-blur-sm",
              isMobile ? "bottom-2 left-2 p-1.5" : "bottom-3 left-3 p-2"
            )}
            title="Some data may be missing or inaccurate. Open recipe to review."
          >
            <AlertTriangle className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
          </div>
        )}

        {/* Source link */}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute rounded-full bg-background/80 text-muted-foreground hover:text-foreground backdrop-blur-sm transition-all",
              isMobile ? "bottom-2 left-2 p-1.5" : "bottom-3 left-3 p-2"
            )}
          >
            <ExternalLink className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
          </a>
        )}
      </div>

      {/* Content - compact on mobile */}
      <div className={cn(
        "flex flex-col",
        isMobile ? "p-2.5 h-[100px]" : "p-4 h-[140px]"
      )}>
        <div className="flex items-start justify-between gap-1.5 mb-1.5">
          <h3 className={cn(
            "font-serif font-semibold leading-tight line-clamp-2",
            isMobile ? "text-sm min-h-[2.5rem]" : "text-lg min-h-[3.5rem]"
          )}>
            {recipe.title}
          </h3>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "shrink-0 transition-opacity",
                  isMobile ? "opacity-100 h-7 w-7" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <MoreHorizontal className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onAddToMealPlan(recipe);
              }}>
                <Calendar className="h-4 w-4 mr-2" />
                Add to Meal Plan
              </DropdownMenuItem>

              {isLibraryRecipe && onCopyToPersonal && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onCopyToPersonal(recipe);
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to My Recipes
                </DropdownMenuItem>
              )}

              {!isLibraryRecipe && (
                <>
                  {onTogglePublic && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onTogglePublic(recipe.id, !recipe.isPublic);
                    }}>
                      <Globe className="h-4 w-4 mr-2" />
                      {recipe.isPublic ? 'Remove from Profile' : 'Share to Profile'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEdit(recipe);
                  }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onToggleArchive(recipe.id);
                  }}>
                    <Archive className="h-4 w-4 mr-2" />
                    {recipe.isArchived ? 'Unarchive' : 'Archive'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(recipe.id);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta info */}
        <div className={cn(
          "flex items-center text-muted-foreground",
          isMobile ? "gap-2 text-xs mb-1.5" : "gap-3 text-sm mb-3"
        )}>
          {recipe.totalTime && (
            <span className="flex items-center gap-1">
              <Clock className={cn(isMobile ? "h-3 w-3" : "h-3.5 w-3.5")} />
              {recipe.totalTime}m
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className={cn(isMobile ? "h-3 w-3" : "h-3.5 w-3.5")} />
            {recipe.servings}
          </span>
        </div>

        {/* Meal type and tags - limit on mobile */}
        <div className="flex flex-wrap gap-1 mt-auto">
          <Badge variant="secondary" className={cn(isMobile ? "text-[10px] px-1.5 py-0" : "text-xs")}>
            {recipe.mealTypes?.[0] || recipe.category}
          </Badge>
          {recipe.tags.slice(0, isMobile ? 1 : 2).map(tag => (
            <Badge key={tag} variant="outline" className={cn(isMobile ? "text-[10px] px-1.5 py-0" : "text-xs")}>
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Quick add to meal plan button (visible on hover) - hidden on mobile */}
      {!isMobile && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-8 bg-gradient-to-t from-card via-card to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onAddToMealPlan(recipe);
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Add to Meal Plan
          </Button>
        </div>
      )}
    </div>
  );
}
