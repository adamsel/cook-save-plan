import { Recipe } from '@/types/recipe';
import { Heart, Clock, Users, ExternalLink, MoreHorizontal, Calendar, Archive, Pencil, Trash2 } from 'lucide-react';
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

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onAddToMealPlan: (recipe: Recipe) => void;
  isDragging?: boolean;
}

export function RecipeCard({
  recipe,
  onToggleFavorite,
  onToggleArchive,
  onEdit,
  onDelete,
  onAddToMealPlan,
  isDragging = false,
}: RecipeCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50 overflow-hidden recipe-card-hover",
        isDragging && "drag-ghost"
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('recipeId', recipe.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <span className="text-4xl">🍳</span>
          </div>
        )}
        
        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
          }}
          className={cn(
            "absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all",
            recipe.isFavorite 
              ? "bg-accent text-accent-foreground" 
              : "bg-background/80 text-muted-foreground hover:text-accent"
          )}
        >
          <Heart className={cn("h-4 w-4", recipe.isFavorite && "fill-current")} />
        </button>

        {/* Source link */}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 left-3 p-2 rounded-full bg-background/80 text-muted-foreground hover:text-foreground backdrop-blur-sm transition-all"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-serif text-lg font-semibold leading-tight line-clamp-2">
            {recipe.title}
          </h3>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAddToMealPlan(recipe)}>
                <Calendar className="h-4 w-4 mr-2" />
                Add to Meal Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(recipe)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleArchive(recipe.id)}>
                <Archive className="h-4 w-4 mr-2" />
                {recipe.isArchived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(recipe.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
          {recipe.totalTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.totalTime}m
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {recipe.servings}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {recipe.category}
          </Badge>
          {recipe.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Quick add to meal plan button (visible on hover) */}
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
    </div>
  );
}
