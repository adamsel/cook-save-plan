import { useState, useMemo } from 'react';
import { Recipe } from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeFilters, SortOption } from '@/components/recipes/RecipeFilters';
import { AddRecipeDialog } from '@/components/recipes/AddRecipeDialog';
import { MealPlanDialog } from '@/components/recipes/MealPlanDialog';
import { UtensilsCrossed, CheckSquare, X, Tag, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function RecipesPage() {
  const { recipes, categories, tags, toggleFavorite, toggleArchive, deleteRecipe, updateRecipe } = useRecipes();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'quick' | 'medium' | 'long'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showMissingCategory, setShowMissingCategory] = useState(false);

  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [mealPlanRecipe, setMealPlanRecipe] = useState<Recipe | null>(null);
  const [showMealPlanDialog, setShowMealPlanDialog] = useState(false);

  // Bulk edit state
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkTag, setBulkTag] = useState('');

  // Count uncategorized recipes
  const missingCategoryCount = useMemo(() => 
    recipes.filter(r => !r.category || r.category === 'Other').length,
    [recipes]
  );

  const filteredRecipes = useMemo(() => {
    let result = recipes.filter(recipe => {
      // Exclude archived unless toggled
      if (!showArchived && recipe.isArchived) return false;

      // Missing category filter
      if (showMissingCategory && recipe.category && recipe.category !== 'Other') return false;

      // Search - now includes ingredients
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const ingredientMatch = recipe.ingredients.some(i => 
          i.item.toLowerCase().includes(query)
        );
        if (
          !recipe.title.toLowerCase().includes(query) &&
          !recipe.description?.toLowerCase().includes(query) &&
          !recipe.tags.some(t => t.toLowerCase().includes(query)) &&
          !ingredientMatch
        ) {
          return false;
        }
      }

      // Categories
      if (selectedCategories.length > 0 && !selectedCategories.includes(recipe.category)) {
        return false;
      }

      // Tags
      if (selectedTags.length > 0 && !selectedTags.some(t => recipe.tags.includes(t))) {
        return false;
      }

      // Favorites
      if (showFavoritesOnly && !recipe.isFavorite) {
        return false;
      }

      // Time filter
      if (timeFilter !== 'all' && recipe.totalTime) {
        if (timeFilter === 'quick' && recipe.totalTime > 30) return false;
        if (timeFilter === 'medium' && (recipe.totalTime < 30 || recipe.totalTime > 60)) return false;
        if (timeFilter === 'long' && recipe.totalTime <= 60) return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'favorites':
          return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        case 'prep-time':
          return (a.totalTime || 999) - (b.totalTime || 999);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [recipes, searchQuery, selectedCategories, selectedTags, showFavoritesOnly, showArchived, timeFilter, sortBy, showMissingCategory]);

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowEditDialog(true);
  };

  const handleAddToMealPlan = (recipe: Recipe) => {
    setMealPlanRecipe(recipe);
    setShowMealPlanDialog(true);
  };

  const toggleRecipeSelection = (recipeId: string) => {
    setSelectedRecipes(prev => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedRecipes(new Set(filteredRecipes.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedRecipes(new Set());
    setBulkEditMode(false);
  };

  const applyBulkCategory = () => {
    if (!bulkCategory) return;
    selectedRecipes.forEach(id => {
      const recipe = recipes.find(r => r.id === id);
      if (recipe) {
        updateRecipe({ ...recipe, category: bulkCategory });
      }
    });
    toast({ 
      title: "Category updated", 
      description: `Updated ${selectedRecipes.size} recipes to "${bulkCategory}".` 
    });
    setBulkCategory('');
  };

  const applyBulkTag = () => {
    if (!bulkTag) return;
    selectedRecipes.forEach(id => {
      const recipe = recipes.find(r => r.id === id);
      if (recipe && !recipe.tags.includes(bulkTag)) {
        updateRecipe({ ...recipe, tags: [...recipe.tags, bulkTag] });
      }
    });
    toast({ 
      title: "Tag added", 
      description: `Added "${bulkTag}" to ${selectedRecipes.size} recipes.` 
    });
    setBulkTag('');
  };

  return (
    <div className="container py-6 animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-2">Recipe Library</h1>
          <p className="text-muted-foreground">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in your stash
          </p>
        </div>
        {filteredRecipes.length > 0 && (
          <Button
            variant={bulkEditMode ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setBulkEditMode(!bulkEditMode)}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
          </Button>
        )}
      </div>

      {/* Bulk edit toolbar */}
      {bulkEditMode && (
        <div className="mb-4 p-4 rounded-lg bg-secondary/50 border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedRecipes.size} selected
              </span>
              <Button variant="ghost" size="sm" onClick={selectAllVisible}>
                Select all visible
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
          
          {selectedRecipes.size > 0 && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Set category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={applyBulkCategory} disabled={!bulkCategory}>
                  Apply
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Select value={bulkTag} onValueChange={setBulkTag}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Add tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={applyBulkTag} disabled={!bulkTag}>
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <RecipeFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        showFavoritesOnly={showFavoritesOnly}
        onFavoritesChange={setShowFavoritesOnly}
        showArchived={showArchived}
        onArchivedChange={setShowArchived}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        categories={categories}
        tags={tags}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showMissingCategory={showMissingCategory}
        onMissingCategoryChange={setShowMissingCategory}
        missingCategoryCount={missingCategoryCount}
      />

      {filteredRecipes.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
          {filteredRecipes.map(recipe => (
            <div key={recipe.id} className="relative">
              {bulkEditMode && (
                <div 
                  className="absolute top-2 left-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRecipeSelection(recipe.id);
                  }}
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                    selectedRecipes.has(recipe.id) 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'bg-background border-muted-foreground/50 hover:border-primary'
                  }`}>
                    {selectedRecipes.has(recipe.id) && <CheckSquare className="h-4 w-4" />}
                  </div>
                </div>
              )}
              <RecipeCard
                recipe={recipe}
                onToggleFavorite={toggleFavorite}
                onToggleArchive={toggleArchive}
                onEdit={handleEdit}
                onDelete={deleteRecipe}
                onAddToMealPlan={handleAddToMealPlan}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-xl font-semibold mb-2">No recipes found</h3>
          <p className="text-muted-foreground max-w-md">
            {searchQuery || selectedCategories.length > 0 || selectedTags.length > 0
              ? "Try adjusting your filters or search terms."
              : "Start building your recipe collection by adding your first recipe."}
          </p>
        </div>
      )}

      <AddRecipeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        editingRecipe={editingRecipe}
      />

      <MealPlanDialog
        open={showMealPlanDialog}
        onOpenChange={setShowMealPlanDialog}
        recipe={mealPlanRecipe}
      />
    </div>
  );
}
