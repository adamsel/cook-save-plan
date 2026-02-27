import { useState, useMemo } from 'react';
import { Recipe } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Clock, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipeLinkPickerProps {
  recipes: Recipe[];
  excludeRecipeIds: string[]; // IDs to exclude (current recipe + already linked)
  onSelectRecipe: (recipe: Recipe) => void;
  disabled?: boolean;
}

export function RecipeLinkPicker({
  recipes,
  excludeRecipeIds,
  onSelectRecipe,
  disabled = false,
}: RecipeLinkPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter recipes: exclude archived, exclude specific IDs, filter by search
  const filteredRecipes = useMemo(() => {
    const excludeSet = new Set(excludeRecipeIds);
    let available = recipes.filter(r => !r.isArchived && !excludeSet.has(r.id));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      available = available.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    // Sort: favorites first, then by title
    return available.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [recipes, excludeRecipeIds, searchQuery]);

  const handleSelect = (recipe: Recipe) => {
    onSelectRecipe(recipe);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Link a recipe
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          {filteredRecipes.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No recipes found' : 'No recipes available to link'}
            </div>
          ) : (
            <div className="p-1">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelect(recipe)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors",
                    "flex items-center gap-3"
                  )}
                >
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt=""
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <span className="text-lg">🍽️</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">{recipe.title}</span>
                      {recipe.isFavorite && (
                        <Heart className="h-3 w-3 text-red-500 fill-red-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {recipe.totalTime && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {recipe.totalTime}m
                        </span>
                      )}
                      <span>{recipe.mealTypes?.[0] || recipe.category || 'Uncategorized'}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
