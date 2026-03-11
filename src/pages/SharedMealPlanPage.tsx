import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSharedMealPlan } from '@/hooks/useSharedMealPlan';
import { useCloneMealPlan } from '@/hooks/useCloneMealPlan';
import { useFollowCreator } from '@/hooks/useFollowCreator';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { ReadOnlyMealPlanCalendar } from '@/components/recipes/ReadOnlyMealPlanCalendar';
import { ReadOnlyDayListView } from '@/components/recipes/ReadOnlyDayListView';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Calendar, UtensilsCrossed, Clock, Users, ChefHat, Check, Lock, UserPlus, UserCheck, BookmarkPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRecipes } from '@/context/RecipeContext';
import { Navigation } from '@/components/layout/Navigation';
import { PublicNav } from '@/components/layout/PublicNav';
import { format, parseISO, startOfWeek, addWeeks, addDays } from 'date-fns';
import { Recipe } from '@/types/recipe';

export default function SharedMealPlanPage() {
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { mealPlan, recipes, creator, isLoading, error } = useSharedMealPlan(shareSlug);
  const { cloneMealPlan, isCloning, getDefaultTargetWeek } = useCloneMealPlan();
  const { isFollowing, follow, unfollow, isLoading: followLoading } = useFollowCreator(creator?.userId);
  const { toast } = useToast();
  const { refreshMealPlans } = useRecipes();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cloneComplete, setCloneComplete] = useState(false);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [cloneWeekOffset, setCloneWeekOffset] = useState(1); // default: next week

  // Record view (debounced per session to avoid duplicates)
  useEffect(() => {
    if (!mealPlan) return;
    const viewKey = `plan_viewed_${mealPlan.id}`;
    if (sessionStorage.getItem(viewKey)) return;
    sessionStorage.setItem(viewKey, '1');

    supabase
      .from('plan_engagement')
      .insert({
        meal_plan_id: mealPlan.id,
        user_id: user?.id || null,
        event_type: 'view',
      })
      .then(() => {}); // fire-and-forget
  }, [mealPlan?.id]);

  // Auto-clone if user just signed up/logged in and there's a pending clone
  useEffect(() => {
    if (!user || !mealPlan || isCloning || cloneComplete) return;

    const pendingClone = localStorage.getItem('pendingMealPlanClone');
    if (pendingClone === shareSlug) {
      localStorage.removeItem('pendingMealPlanClone');
      // Open week picker for the user to choose
      setCloneWeekOffset(1);
      setWeekPickerOpen(true);
    }
  }, [user, mealPlan]);

  const handleClone = async (targetWeek: string, weekOffset: number) => {
    if (!mealPlan) return;

    const result = await cloneMealPlan(mealPlan.items, recipes, targetWeek, {
      id: mealPlan.id,
      creatorUserId: creator?.userId || '',
      title: mealPlan.title,
    });
    if (result) {
      setCloneComplete(true);
      // Set the week offset so MealPlanPage opens to the correct week
      localStorage.setItem('mealPlanWeekOffset', JSON.stringify(weekOffset));
      // Refresh meal plan data so it's available when we navigate
      await refreshMealPlans();
      setTimeout(() => navigate('/meal-plan'), 1500);
    }
  };

  const handleGetPlan = () => {
    if (user) {
      setCloneWeekOffset(1); // reset to next week
      setWeekPickerOpen(true);
    } else {
      // Store pending action and redirect to auth
      localStorage.setItem('pendingMealPlanClone', shareSlug || '');
      navigate(`/auth?redirect=/plan/${shareSlug}`);
    }
  };

  const handleConfirmClone = () => {
    const targetWeekStart = startOfWeek(addWeeks(new Date(), cloneWeekOffset), { weekStartsOn: 1 });
    const targetWeek = format(targetWeekStart, 'yyyy-MM-dd');
    setWeekPickerOpen(false);
    handleClone(targetWeek, cloneWeekOffset);
  };

  const saveIndividualRecipe = async (recipe: Recipe) => {
    if (!user) {
      localStorage.setItem('pendingMealPlanClone', shareSlug || '');
      navigate(`/auth?redirect=/plan/${shareSlug}`);
      return;
    }

    setIsSavingRecipe(true);
    const { error: insertError } = await supabase
      .from('recipes')
      .insert([{
        user_id: user.id,
        title: recipe.title,
        source_url: recipe.sourceUrl || null,
        image_url: recipe.imageUrl || null,
        description: recipe.description || null,
        category: recipe.category || '',
        tags: recipe.tags || [],
        prep_time: recipe.prepTime || null,
        cook_time: recipe.cookTime || null,
        total_time: recipe.totalTime || null,
        servings: recipe.servings,
        ingredients: JSON.parse(JSON.stringify(recipe.ingredients || [])),
        instructions: recipe.instructions || [],
        is_favorite: false,
        is_archived: false,
        cuisine: recipe.cuisine || null,
        dietary: recipe.dietary || [],
        meal_types: recipe.mealTypes || [],
        author: recipe.author || null,
        nutrition: recipe.nutrition ? JSON.parse(JSON.stringify(recipe.nutrition)) : null,
        import_method: recipe.importMethod || null,
        is_public: false,
        is_library: false,
        original_recipe_id: recipe.id,
      }]);

    if (insertError) {
      toast({ title: 'Failed to save recipe', description: insertError.message, variant: 'destructive' });
    } else {
      setSavedRecipeIds(prev => new Set(prev).add(recipe.id));
      toast({ title: 'Recipe saved to your collection' });
    }
    setIsSavingRecipe(false);
  };

  const getCreatorInitials = () => {
    if (creator?.displayName) {
      return creator.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (creator?.username) {
      return creator.username[0].toUpperCase();
    }
    return 'C';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  if (error || !mealPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Meal Plan Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'This meal plan may have been removed or is no longer shared.'}
            </p>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weekStart = parseISO(mealPlan.weekStartDate);
  const uniqueRecipeIds = [...new Set(mealPlan.items.map(i => i.recipeId))];
  const totalMeals = mealPlan.items.length;

  // CTA text based on auth/follow state
  const getCtaText = () => {
    if (cloneComplete) return { label: 'Done!', sub: 'Redirecting to your meal planner...' };
    if (!user) return { label: 'Get This Meal Plan', sub: 'Sign up free to get this plan in your Recipe Stash' };
    if (isFollowing) return { label: 'Add to My Week', sub: `Add all ${uniqueRecipeIds.length} recipes to your meal plan` };
    return { label: 'Get This Meal Plan', sub: `Clone all ${uniqueRecipeIds.length} recipes and generate your shopping list` };
  };

  const ctaText = getCtaText();

  return (
    <div className="min-h-screen bg-background pb-20">
      {user ? <Navigation /> : <PublicNav />}

      {/* Creator attribution */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shrink-0">
              <AvatarImage src={creator?.avatarUrl || undefined} alt={creator?.displayName || 'Creator'} />
              <AvatarFallback className="bg-primary/10 text-primary text-base sm:text-lg font-semibold">
                {getCreatorInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              {creator?.displayName && (
                <p className="font-semibold text-sm sm:text-base truncate">
                  {creator.username ? (
                    <Link to={`/creator/${creator.username}`} className="hover:underline">
                      {creator.displayName}
                    </Link>
                  ) : (
                    creator.displayName
                  )}
                </p>
              )}
              {creator?.username && (
                <Link
                  to={`/creator/${creator.username}`}
                  className="text-xs sm:text-sm text-[#2D6A4F] hover:underline"
                >
                  @{creator.username}
                </Link>
              )}
            </div>
          </div>

          {/* Follow button */}
          {creator && user?.id !== creator.userId && (
            <div className="pt-2">
              {isFollowing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unfollow()}
                  disabled={followLoading}
                  className="gap-1.5"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Following
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    if (!user) {
                      localStorage.setItem('pendingMealPlanClone', shareSlug || '');
                      navigate(`/auth?redirect=/plan/${shareSlug}`);
                      return;
                    }
                    follow();
                  }}
                  disabled={followLoading}
                  className="gap-1.5 bg-[#2D6A4F] hover:bg-[#245A42] text-white"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Follow
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Plan title and metadata */}
        <div className="mt-4 sm:mt-5">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            {mealPlan.title || 'Weekly Meal Plan'}
          </h1>

          {mealPlan.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
              {mealPlan.description}
            </p>
          )}

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              Week of {format(weekStart, 'MMMM d, yyyy')}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <UtensilsCrossed className="h-3 w-3" />
              {totalMeals} meal{totalMeals !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <ChefHat className="h-3 w-3" />
              {uniqueRecipeIds.length} recipe{uniqueRecipeIds.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Calendar / List view */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {isMobile ? (
          <ReadOnlyDayListView
            items={mealPlan.items}
            recipes={recipes}
            weekStartDate={mealPlan.weekStartDate}
            onRecipeClick={setSelectedRecipe}
          />
        ) : (
          <ReadOnlyMealPlanCalendar
            items={mealPlan.items}
            recipes={recipes}
            weekStartDate={mealPlan.weekStartDate}
            onRecipeClick={setSelectedRecipe}
          />
        )}
      </div>

      {/* Recipe list */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 border-t">
        <h2 className="text-lg font-semibold mb-4">Recipes in this plan</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {recipes.map(recipe => (
            <Card
              key={recipe.id}
              className="group overflow-hidden cursor-pointer hover:shadow-md transition-all"
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="aspect-[4/3] overflow-hidden">
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/70">
                    <UtensilsCrossed className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-semibold text-sm line-clamp-1">{recipe.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  {recipe.totalTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {recipe.totalTime}m
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {recipe.servings}
                  </span>
                </div>
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {recipe.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="hidden sm:block min-w-0">
            <p className="font-medium truncate">{ctaText.label === 'Done!' ? 'Meal plan cloned!' : ctaText.label}</p>
            <p className="text-sm text-muted-foreground truncate">{ctaText.sub}</p>
          </div>
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2"
            onClick={handleGetPlan}
            disabled={isCloning || cloneComplete}
          >
            {isCloning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cloning...
              </>
            ) : cloneComplete ? (
              <>
                <Check className="h-4 w-4" />
                Done!
              </>
            ) : !user ? (
              <>
                <Lock className="h-4 w-4" />
                {ctaText.label}
              </>
            ) : isFollowing ? (
              <>
                <Calendar className="h-4 w-4" />
                {ctaText.label}
              </>
            ) : (
              ctaText.label
            )}
          </Button>
        </div>
      </div>

      {/* Week picker Dialog */}
      <Dialog open={weekPickerOpen} onOpenChange={setWeekPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Choose a week
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Which week should this meal plan be added to?
          </p>
          <div className="flex items-center justify-center gap-3 py-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCloneWeekOffset(prev => Math.max(0, prev - 1))}
              disabled={cloneWeekOffset === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[180px]">
              {(() => {
                const weekStart = startOfWeek(addWeeks(new Date(), cloneWeekOffset), { weekStartsOn: 1 });
                return (
                  <>
                    <div className="text-sm font-medium">
                      {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
                    </div>
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {cloneWeekOffset === 0 ? 'This week' : cloneWeekOffset === 1 ? 'Next week' : `In ${cloneWeekOffset} weeks`}
                    </Badge>
                  </>
                );
              })()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCloneWeekOffset(prev => prev + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            className="w-full gap-2"
            onClick={handleConfirmClone}
            disabled={isCloning}
          >
            {isCloning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding to your plan...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Add to this week
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Recipe detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] p-0 overflow-hidden">
          {selectedRecipe && (
            <div className="overflow-y-auto max-h-[80vh]">
              {selectedRecipe.imageUrl && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 space-y-4">
                <DialogHeader>
                  <DialogTitle>{selectedRecipe.title}</DialogTitle>
                </DialogHeader>

                {selectedRecipe.description && (
                  <p className="text-muted-foreground text-sm">{selectedRecipe.description}</p>
                )}

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {selectedRecipe.totalTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /> {selectedRecipe.totalTime} min
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> {selectedRecipe.servings} servings
                  </span>
                </div>

                {selectedRecipe.ingredients?.filter(ing => ing.item?.trim()).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Ingredients</h3>
                    <ul className="space-y-1 text-sm">
                      {selectedRecipe.ingredients.filter(ing => ing.item?.trim()).map((ing, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>
                            {ing.quantity && <span className="font-medium">{ing.quantity} </span>}
                            {ing.unit && <span>{ing.unit} </span>}
                            {ing.item ? (ing.item.charAt(0).toUpperCase() + ing.item.slice(1)) : ((ing as any).name || '')}
                            {ing.notes && <span className="text-muted-foreground"> ({ing.notes})</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedRecipe.instructions?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Instructions</h3>
                    <ol className="space-y-2 text-sm list-decimal list-inside">
                      {selectedRecipe.instructions.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => selectedRecipe && saveIndividualRecipe(selectedRecipe)}
                    disabled={isSavingRecipe || (selectedRecipe ? savedRecipeIds.has(selectedRecipe.id) : false)}
                  >
                    {selectedRecipe && savedRecipeIds.has(selectedRecipe.id) ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved to My Recipes
                      </>
                    ) : isSavingRecipe ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="h-4 w-4" />
                        Save This Recipe
                      </>
                    )}
                  </Button>
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      setSelectedRecipe(null);
                      handleGetPlan();
                    }}
                    disabled={isCloning || cloneComplete}
                  >
                    {!user ? (
                      <>
                        <Lock className="h-4 w-4" />
                        Get Full Meal Plan
                      </>
                    ) : (
                      'Get Full Meal Plan'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
