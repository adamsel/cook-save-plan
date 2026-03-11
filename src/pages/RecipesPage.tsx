import { useState, useMemo, useEffect } from 'react';
import { Recipe, MealType, ImportMethod } from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeFilters, SortOption } from '@/components/recipes/RecipeFilters';
import { AddRecipeDialog } from '@/components/recipes/AddRecipeDialog';
import { BulkImportDialog } from '@/components/recipes/BulkImportDialog';
import { PremiumGate } from '@/components/PremiumGate';
import { MealPlanDialog } from '@/components/recipes/MealPlanDialog';
import { RecipeDetailDialog } from '@/components/recipes/RecipeDetailDialog';
import { SpoonacularRecipeCard } from '@/components/recipes/SpoonacularRecipeCard';
import { SpoonacularRecipeDetailDialog } from '@/components/recipes/SpoonacularRecipeDetailDialog';
import { SpoonacularSearchForm } from '@/components/recipes/SpoonacularSearchForm';
import { useSpoonacularRecipes, SpoonacularRecipeSearchResult, SpoonacularRecipeDetails } from '@/hooks/useSpoonacularRecipes';
import { useDiscoverCreators, type DiscoverCreator } from '@/hooks/useDiscoverCreators';
import { usePopularRecipes, type PopularRecipe } from '@/hooks/usePopularRecipes';
import { useFollowingFeed, type FeedItem } from '@/hooks/useFollowingFeed';
import { useFollowCreator } from '@/hooks/useFollowCreator';
import { useAuth } from '@/context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, CheckSquare, X, Tag, FolderOpen, BookUser, Globe, Loader2, ChevronLeft, ChevronRight, Heart, Clock, UserPlus, UserCheck, Upload, BookmarkPlus, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

function CompactCreatorCard({ creator }: { creator: DiscoverCreator }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFollowing, follow, unfollow, isLoading } = useFollowCreator(creator.userId);
  const isOwnProfile = user?.id === creator.userId;

  const initials = creator.displayName
    ? creator.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : creator.username[0].toUpperCase();

  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/auth?redirect=/recipes');
      return;
    }
    if (isFollowing) { unfollow(); } else { follow(); }
  };

  return (
    <Link
      to={`/creator/${creator.username}`}
      className="flex flex-col items-center gap-2 p-3 rounded-xl border bg-card hover:shadow-md transition-shadow min-w-[140px] w-[140px] shrink-0"
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={creator.avatarUrl || undefined} alt={creator.displayName || creator.username} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="text-center min-w-0 w-full">
        <p className="text-sm font-medium truncate">{creator.displayName || creator.username}</p>
        <p className="text-xs text-muted-foreground">@{creator.username}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {creator.followerCount} {creator.followerCount === 1 ? 'follower' : 'followers'}
        </p>
      </div>
      {!isOwnProfile && (
        <Button
          variant={isFollowing ? 'outline' : 'default'}
          size="sm"
          className={cn("w-full h-7 text-xs", !isFollowing && "bg-[#2D6A4F] hover:bg-[#245A42] text-white")}
          onClick={handleFollow}
          disabled={isLoading}
        >
          {isFollowing ? (
            <><UserCheck className="h-3 w-3 mr-1" />Following</>
          ) : (
            <><UserPlus className="h-3 w-3 mr-1" />Follow</>
          )}
        </Button>
      )}
    </Link>
  );
}

type RecipeTab = 'personal' | 'following' | 'discover';

export default function RecipesPage() {
  const {
    recipes,
    categories,
    tags,
    toggleFavorite,
    toggleArchive,
    deleteRecipe,
    updateRecipe,
    addRecipe,
    makeRecipePublic,
    shareRecipe,
    getRecipeShares,
    revokeShare,
    revokePendingShare,
  } = useRecipes();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Spoonacular integration
  const {
    searchResults: spoonacularResults,
    totalResults: spoonacularTotal,
    isSearching: isSpoonacularSearching,
    searchError: spoonacularError,
    selectedRecipe: selectedSpoonacularRecipe,
    isLoadingDetails: isLoadingSpoonacularDetails,
    detailsError: spoonacularDetailsError,
    searchRecipes: searchSpoonacular,
    getRecipeDetails: getSpoonacularDetails,
    clearSelectedRecipe: clearSpoonacularRecipe,
    loadPopularRecipes,
    hasLoadedInitial,
  } = useSpoonacularRecipes();

  // Creator discovery
  const { creators: featuredCreators } = useDiscoverCreators();
  const { data: popularRecipes = [] } = usePopularRecipes(8);
  const { data: feedItems = [], isLoading: isFeedLoading } = useFollowingFeed();

  const [activeTab, setActiveTab] = useState<RecipeTab>('personal');

  // Load popular recipes when Discover tab is first opened
  useEffect(() => {
    if (activeTab === 'discover' && !hasLoadedInitial) {
      loadPopularRecipes();
    }
  }, [activeTab, hasLoadedInitial, loadPopularRecipes]);
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
  const [viewingRecipeId, setViewingRecipeId] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Derive viewingRecipe from recipes array so it updates when recipes change
  const viewingRecipe = useMemo(() => {
    if (!viewingRecipeId) return null;
    return recipes.find(r => r.id === viewingRecipeId) || null;
  }, [viewingRecipeId, recipes]);
  
  // Spoonacular detail dialog state
  const [showSpoonacularDetailDialog, setShowSpoonacularDetailDialog] = useState(false);

  // Bulk import dialog
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Bulk edit state
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkTag, setBulkTag] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const RECIPES_PER_PAGE = 20;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedTags, showFavoritesOnly, timeFilter, sortBy, showMissingCategory]);

  // Get recipes for display
  const sourceRecipes = recipes;

  // Count uncategorized recipes (no dish type AND no meal type)
  const missingCategoryCount = useMemo(() =>
    recipes.filter(r =>
      !r.category &&
      (!r.mealTypes || r.mealTypes.length === 0)
    ).length,
    [recipes]
  );

  const filteredRecipes = useMemo(() => {
    const result = sourceRecipes.filter(recipe => {
      // Exclude archived unless toggled (only for personal recipes)
      if (activeTab === 'personal' && !showArchived && recipe.isArchived) return false;

      // Missing category filter: show recipes with no dish type AND no meal type
      if (activeTab === 'personal' && showMissingCategory) {
        const hasCategory = recipe.category && recipe.category !== '';
        const hasMealType = recipe.mealTypes && recipe.mealTypes.length > 0;
        if (hasCategory || hasMealType) return false;
      }

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

      // Categories - check both category AND mealTypes
      if (selectedCategories.length > 0) {
        const categoryMatch = selectedCategories.includes(recipe.category);
        const mealTypeMatch = recipe.mealTypes?.some(mt => selectedCategories.includes(mt)) || false;
        if (!categoryMatch && !mealTypeMatch) {
          return false;
        }
      }

      // Tags
      if (selectedTags.length > 0 && !selectedTags.some(t => recipe.tags.includes(t))) {
        return false;
      }

      // Favorites (only for personal recipes)
      if (activeTab === 'personal' && showFavoritesOnly && !recipe.isFavorite) {
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
  }, [sourceRecipes, searchQuery, selectedCategories, selectedTags, showFavoritesOnly, showArchived, timeFilter, sortBy, showMissingCategory, activeTab]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE);
  const paginatedRecipes = filteredRecipes.slice(
    (currentPage - 1) * RECIPES_PER_PAGE,
    currentPage * RECIPES_PER_PAGE
  );
  const startIndex = (currentPage - 1) * RECIPES_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * RECIPES_PER_PAGE, filteredRecipes.length);

  // Fixed meal type filters — always show all 4
  const mealTypeFilters: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  // Toggle category for quick filter chips
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

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
    setBulkTag('');
  };


  // Handle clicking on a Spoonacular recipe card
  const handleSpoonacularCardClick = async (recipe: SpoonacularRecipeSearchResult) => {
    setShowSpoonacularDetailDialog(true);
    await getSpoonacularDetails(recipe.id);
  };

  // Save a Spoonacular recipe to personal collection
  const handleSaveSpoonacularToCollection = async (spoonacularRecipe: SpoonacularRecipeDetails) => {
    const newRecipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> = {
      title: spoonacularRecipe.title,
      imageUrl: spoonacularRecipe.image,
      description: spoonacularRecipe.summary?.slice(0, 500) || undefined,
      category: '',  // Dish type set by user later; mealTypes handles timing
      tags: [
        ...(spoonacularRecipe.cuisines || []),
        ...(spoonacularRecipe.diets || []),
        // Filter out meal-type values from dishTypes (they go to mealTypes instead)
        ...(spoonacularRecipe.dishTypes || []).filter(
          type => !['breakfast', 'lunch', 'dinner', 'snack', 'brunch'].includes(type.toLowerCase())
        ),
      ],
      // Extract meal types from dishTypes and capitalize correctly
      mealTypes: (spoonacularRecipe.dishTypes || [])
        .filter(type => ['breakfast', 'lunch', 'dinner', 'snack'].includes(type.toLowerCase()))
        .map(type => (type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()) as MealType),
      prepTime: spoonacularRecipe.prepTime || undefined,
      cookTime: spoonacularRecipe.cookTime || undefined,
      totalTime: spoonacularRecipe.readyInMinutes || undefined,
      servings: spoonacularRecipe.servings || 4,
      ingredients: spoonacularRecipe.extendedIngredients?.map((ing, idx) => ({
        id: `ing-${idx}`,
        item: ing.name,
        quantity: ing.amount || null,
        unit: ing.unit || '',
        notes: undefined,
      })) || [],
      instructions: spoonacularRecipe.instructions || [],
      isFavorite: false,
      isArchived: false,
      sourceUrl: spoonacularRecipe.sourceUrl || undefined,
      importMethod: 'spoonacular' as ImportMethod,
      nutrition: spoonacularRecipe.nutrition ? {
        perServing: {
          calories: spoonacularRecipe.nutrition.calories,
          protein: spoonacularRecipe.nutrition.protein,
          carbs: spoonacularRecipe.nutrition.carbs,
          fat: spoonacularRecipe.nutrition.fat,
          fiber: spoonacularRecipe.nutrition.fiber,
          sugar: spoonacularRecipe.nutrition.sugar,
          sodium: spoonacularRecipe.nutrition.sodium,
          saturatedFat: spoonacularRecipe.nutrition.saturatedFat,
          cholesterol: spoonacularRecipe.nutrition.cholesterol,
        },
        source: 'provided_by_site' as const,
        confidence: 'High' as const,
        notes: 'Nutrition data from Spoonacular.',
      } : undefined,
    };

    const added = await addRecipe(newRecipe);
    if (added) {
      setShowSpoonacularDetailDialog(false);
      clearSpoonacularRecipe();
    }
  };

  // Handle Spoonacular search
  const handleSpoonacularSearch = (params: {
    query?: string;
    diet?: string;
    intolerances?: string;
    maxReadyTime?: number;
  }) => {
    searchSpoonacular({
      ...params,
      number: 100, // Show up to 100 recipes matching filters
    });
  };

  return (
    <div className="container py-6 animate-fade-in">
      {/* Header - compact on mobile */}
      <div className="mb-4 md:mb-6">
        <h1 className="font-serif text-xl md:text-3xl font-bold mb-1 md:mb-2">Recipe Collection</h1>
        {!isMobile && (
          <p className="text-muted-foreground">
            Browse your personal recipes or explore the community library
          </p>
        )}
      </div>

      {/* Tabs - compact on mobile */}
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RecipeTab)}>
          <TabsList className="h-9 md:h-10">
            <TabsTrigger value="personal" className="gap-1.5 md:gap-2 text-xs md:text-sm px-2.5 md:px-3">
              <BookUser className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden xs:inline">My</span> Recipes
              <Badge variant="secondary" className="ml-1 h-4 md:h-5 px-1 md:px-1.5 text-[10px] md:text-xs">{recipes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-1.5 md:gap-2 text-xs md:text-sm px-2.5 md:px-3">
              <UserCheck className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Following
            </TabsTrigger>
            <TabsTrigger value="discover" className="gap-1.5 md:gap-2 text-xs md:text-sm px-2.5 md:px-3">
              <Globe className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Discover
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Bulk actions - hide on mobile */}
        {!isMobile && activeTab === 'personal' && (
          <div className="flex items-center gap-2">
            <PremiumGate feature="bulk-import">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkImport(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </PremiumGate>
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
        )}
      </div>

      {/* Bulk edit toolbar (only for personal recipes) */}
      {activeTab === 'personal' && bulkEditMode && (
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

      {/* Show different content based on active tab */}
      {activeTab === 'following' ? (
        <div className="space-y-4">
          {isFeedLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : feedItems.length > 0 ? (
            <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {feedItems.map((item: FeedItem) => (
                <Link
                  key={`${item.contentType}-${item.contentId}`}
                  to={item.contentType === 'recipe' ? `/recipe/${item.contentId}` : `/plan/${item.contentId}`}
                  className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={item.contentType === 'meal_plan' ? { backgroundColor: '#2D6A4F' } : undefined}>
                        {item.contentType === 'meal_plan' ? (
                          <Calendar className="h-8 w-8 text-white/60" />
                        ) : (
                          <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-black/60 text-white border-0 text-[10px] gap-1">
                      {item.contentType === 'recipe' ? 'Recipe' : 'Meal Plan'}
                    </Badge>
                    {item.saveCount > 0 && (
                      <Badge className="absolute top-2 right-2 bg-black/60 text-white border-0 text-xs gap-1">
                        <BookmarkPlus className="h-3 w-3" />
                        {item.saveCount}
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm line-clamp-2 leading-snug">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={item.creatorAvatarUrl || undefined} />
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {(item.creatorDisplayName || item.creatorUsername || 'C')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.creatorDisplayName || `@${item.creatorUsername}`}
                      </span>
                    </div>
                    {item.contentType === 'recipe' && (
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        {item.totalTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.totalTime}m
                          </span>
                        )}
                        {item.servings && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {item.servings}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Follow creators to fill your feed</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                When creators you follow share new recipes or meal plans, they'll show up here.
              </p>
              <Button variant="outline" onClick={() => setActiveTab('discover')}>
                Discover Creators
              </Button>
            </div>
          )}
        </div>
      ) : activeTab === 'discover' ? (
        <>
          {/* Featured Creators */}
          {featuredCreators.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg font-semibold">Featured Creators</h2>
                <Button variant="ghost" size="sm" asChild className="text-primary gap-1">
                  <Link to="/discover">
                    See all
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                {featuredCreators.slice(0, 6).map(creator => (
                  <CompactCreatorCard key={creator.userId} creator={creator} />
                ))}
              </div>
              <Separator className="my-5" />
            </>
          )}

          {/* Popular Recipes */}
          {popularRecipes.length > 0 && (
            <>
              <h2 className="font-serif text-lg font-semibold mb-3">Popular Recipes</h2>
              <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
                {popularRecipes.map((pr: PopularRecipe) => (
                  <Link
                    key={pr.recipeId}
                    to={`/recipe/${pr.recipeId}`}
                    className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                      {pr.imageUrl ? (
                        <img src={pr.imageUrl} alt={pr.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {pr.saveCount > 0 && (
                        <Badge className="absolute top-2 right-2 bg-black/60 text-white border-0 text-xs gap-1">
                          <BookmarkPlus className="h-3 w-3" />
                          {pr.saveCount}
                        </Badge>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm line-clamp-2 leading-snug">{pr.title}</p>
                      {pr.creatorUsername && (
                        <p className="text-xs text-muted-foreground mt-1">by @{pr.creatorUsername}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {pr.totalTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {pr.totalTime}m
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {pr.servings}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <Separator className="my-5" />
            </>
          )}

          {/* Spoonacular Search */}
          <SpoonacularSearchForm
            onSearch={handleSpoonacularSearch}
            isSearching={isSpoonacularSearching}
          />
          
          {spoonacularError && (
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 text-destructive text-center">
              {spoonacularError}
            </div>
          )}
          
          {spoonacularResults.length > 0 ? (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Found {spoonacularTotal} recipes
              </p>
              <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {spoonacularResults.map(recipe => (
                  <SpoonacularRecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onClick={handleSpoonacularCardClick}
                  />
                ))}
              </div>
            </div>
          ) : !isSpoonacularSearching && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Globe className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Discover new recipes</h3>
              <p className="text-muted-foreground max-w-md">
                Search millions of recipes from around the web. Use filters to find exactly what you're craving.
              </p>
            </div>
          )}
          
          {isSpoonacularSearching && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Searching recipes...</p>
            </div>
          )}
        </>
      ) : (
        <>
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
            hidePersonalFilters={false}
          />

          {/* Quick Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap mt-3 scrollbar-hide">
            {mealTypeFilters.map(mealType => (
              <Badge
                key={mealType}
                variant={selectedCategories.includes(mealType) ? 'default' : 'outline'}
                className="cursor-pointer whitespace-nowrap shrink-0 transition-colors hover:bg-primary/10"
                onClick={() => toggleCategory(mealType)}
              >
                {mealType}
              </Badge>
            ))}
            <Badge
              variant={timeFilter === 'quick' ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap shrink-0 transition-colors hover:bg-primary/10 gap-1"
              onClick={() => setTimeFilter(timeFilter === 'quick' ? 'all' : 'quick')}
            >
              <Clock className="h-3 w-3" />
              &lt; 30 min
            </Badge>
            <Badge
              variant={showFavoritesOnly ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap shrink-0 transition-colors hover:bg-primary/10 gap-1"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Heart className={cn("h-3 w-3", showFavoritesOnly && "fill-current")} />
              Favorites
            </Badge>
          </div>

          {/* Recipe count */}
          {filteredRecipes.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              {filteredRecipes.length > RECIPES_PER_PAGE
                ? `Showing ${startIndex}-${endIndex} of ${filteredRecipes.length} recipes`
                : `${filteredRecipes.length} recipe${filteredRecipes.length !== 1 ? 's' : ''}`}
            </p>
          )}

          {filteredRecipes.length > 0 ? (
            <>
              <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4 md:mt-6">
                {paginatedRecipes.map(recipe => (
                  <div key={recipe.id} className="relative">
                    {activeTab === 'personal' && bulkEditMode && (
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
                      onViewDetails={(recipe) => {
                        setViewingRecipeId(recipe.id);
                        setShowDetailDialog(true);
                      }}
                      isLibraryRecipe={false}
                      userId={user?.id}
                      onTogglePublic={makeRecipePublic}
                      onImageUpload={async (recipeId, newImageUrl) => {
                        const r = recipes.find(r => r.id === recipeId);
                        if (r) {
                          await updateRecipe({ ...r, imageUrl: newImageUrl });
                          toast({ title: 'Photo added' });
                        }
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <span className="text-sm text-muted-foreground px-2 sm:px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="gap-1"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">
                {searchQuery || selectedCategories.length > 0 || selectedTags.length > 0
                  ? "No recipes found"
                  : "Your stash is empty"}
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                {searchQuery || selectedCategories.length > 0 || selectedTags.length > 0
                  ? "Try adjusting your filters or search terms."
                  : "Start by adding a recipe you love."}
              </p>
              {!(searchQuery || selectedCategories.length > 0 || selectedTags.length > 0) && (
                <>
                  <Button
                    className="gap-2 mb-8"
                    onClick={() => {
                      setEditingRecipe(null);
                      setShowEditDialog(true);
                    }}
                  >
                    <UtensilsCrossed className="h-4 w-4" />
                    Add Recipe
                  </Button>
                  {/* Decorative placeholder cards */}
                  <div className="grid grid-cols-3 gap-3 max-w-md w-full">
                    {[
                      { gradient: 'linear-gradient(135deg, #E76F51, #F4A261)', label: 'Hearty Dinner' },
                      { gradient: 'linear-gradient(135deg, #264653, #2A9D8F)', label: 'Fresh Salad' },
                      { gradient: 'linear-gradient(135deg, #6D597A, #B56576)', label: 'Quick Lunch' },
                    ].map(({ gradient, label }) => (
                      <div
                        key={label}
                        className="rounded-lg overflow-hidden h-[100px] relative cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                          setEditingRecipe(null);
                          setShowEditDialog(true);
                        }}
                        style={{ background: gradient }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                          <p className="text-white text-xs font-medium">{label}</p>
                          <p className="text-white/60 text-[10px]">Try the importer</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      <AddRecipeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        editingRecipe={editingRecipe}
      />

      <BulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
      />

      <MealPlanDialog
        open={showMealPlanDialog}
        onOpenChange={setShowMealPlanDialog}
        recipe={mealPlanRecipe}
      />

      <RecipeDetailDialog
        recipe={viewingRecipe}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onToggleFavorite={toggleFavorite}
        onToggleArchive={toggleArchive}
        onEdit={(recipe) => {
          setShowDetailDialog(false);
          handleEdit(recipe);
        }}
        onDelete={deleteRecipe}
        onAddToMealPlan={(recipe) => {
          setShowDetailDialog(false);
          handleAddToMealPlan(recipe);
        }}
        isLibraryRecipe={false}
        onTogglePublic={makeRecipePublic}
        onShareByEmail={shareRecipe}
        onGetShares={getRecipeShares}
        onRevokeShare={revokeShare}
        onRevokePendingShare={revokePendingShare}
      />

      {/* Spoonacular Recipe Detail Dialog */}
      <SpoonacularRecipeDetailDialog
        recipe={selectedSpoonacularRecipe}
        open={showSpoonacularDetailDialog}
        onOpenChange={(open) => {
          setShowSpoonacularDetailDialog(open);
          if (!open) clearSpoonacularRecipe();
        }}
        isLoading={isLoadingSpoonacularDetails}
        error={spoonacularDetailsError}
        onSaveToCollection={handleSaveSpoonacularToCollection}
      />
    </div>
  );
}
