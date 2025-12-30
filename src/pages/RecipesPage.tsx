import { useState, useMemo } from 'react';
import { Recipe } from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeFilters } from '@/components/recipes/RecipeFilters';
import { AddRecipeDialog } from '@/components/recipes/AddRecipeDialog';
import { MealPlanDialog } from '@/components/recipes/MealPlanDialog';
import { UtensilsCrossed } from 'lucide-react';

export default function RecipesPage() {
  const { recipes, categories, tags, toggleFavorite, toggleArchive, deleteRecipe } = useRecipes();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'quick' | 'medium' | 'long'>('all');

  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [mealPlanRecipe, setMealPlanRecipe] = useState<Recipe | null>(null);
  const [showMealPlanDialog, setShowMealPlanDialog] = useState(false);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      // Exclude archived unless toggled
      if (!showArchived && recipe.isArchived) return false;

      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !recipe.title.toLowerCase().includes(query) &&
          !recipe.description?.toLowerCase().includes(query) &&
          !recipe.tags.some(t => t.toLowerCase().includes(query))
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
  }, [recipes, searchQuery, selectedCategories, selectedTags, showFavoritesOnly, showArchived, timeFilter]);

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowEditDialog(true);
  };

  const handleAddToMealPlan = (recipe: Recipe) => {
    setMealPlanRecipe(recipe);
    setShowMealPlanDialog(true);
  };

  return (
    <div className="container py-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold mb-2">Recipe Library</h1>
        <p className="text-muted-foreground">
          {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in your stash
        </p>
      </div>

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
      />

      {filteredRecipes.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
          {filteredRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggleFavorite={toggleFavorite}
              onToggleArchive={toggleArchive}
              onEdit={handleEdit}
              onDelete={deleteRecipe}
              onAddToMealPlan={handleAddToMealPlan}
            />
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
