import { useState, useMemo } from 'react';
import { Recipe, DayOfWeek, MealSlot } from '@/types/recipe';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Clock, Users, Heart, Utensils, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileRecipePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  day: DayOfWeek | null;
  slot: MealSlot | null;
  onSelectRecipe: (recipe: Recipe, day: DayOfWeek, slot: MealSlot) => void;
}

const slotEmojis: Record<MealSlot, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  snack: '🍪',
  dinner: '🍽️',
};

const formatDay = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);
const formatSlot = (slot: string) => slot.charAt(0).toUpperCase() + slot.slice(1);

export function MobileRecipePickerSheet({
  open,
  onOpenChange,
  recipes,
  day,
  slot,
  onSelectRecipe,
}: MobileRecipePickerSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter recipes by search query
  const filteredRecipes = useMemo(() => {
    const available = recipes.filter(r => !r.isArchived);

    if (!searchQuery) return available;

    const query = searchQuery.toLowerCase();
    return available.filter(r =>
      r.title.toLowerCase().includes(query) ||
      r.category.toLowerCase().includes(query) ||
      r.tags.some(t => t.toLowerCase().includes(query))
    );
  }, [recipes, searchQuery]);

  // Sort: favorites first, then by title
  const sortedRecipes = useMemo(() => {
    return [...filteredRecipes].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [filteredRecipes]);

  const handleSelectRecipe = (recipe: Recipe) => {
    if (day && slot) {
      onSelectRecipe(recipe, day, slot);
      onOpenChange(false);
      setSearchQuery('');
    }
  };

  if (!day || !slot) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span>{slotEmojis[slot]}</span>
            Add {formatSlot(slot)} for {formatDay(day)}
          </SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Recipe List */}
        <ScrollArea className="h-[calc(85vh-160px)]">
          <div className="space-y-2 pr-2">
            {sortedRecipes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recipes found
              </p>
            ) : (
              sortedRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe)}
                  className={cn(
                    "w-full flex gap-3 p-3 rounded-xl text-left transition-all",
                    "bg-card hover:bg-primary/5 active:scale-[0.98]",
                    "border border-border/50 hover:border-primary/30"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <Utensils className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    {recipe.isFavorite && (
                      <div className="absolute top-0.5 right-0.5">
                        <Heart className="h-3 w-3 fill-accent text-accent" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-1">{recipe.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                      {recipe.totalTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {recipe.totalTime}min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {recipe.servings}
                      </span>
                      {recipe.nutrition?.perServing?.calories && (
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          {recipe.nutrition.perServing.calories}cal
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                      {recipe.category}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
