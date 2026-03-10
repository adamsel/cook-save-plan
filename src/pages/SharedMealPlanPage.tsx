import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSharedMealPlan } from '@/hooks/useSharedMealPlan';
import { useCloneMealPlan } from '@/hooks/useCloneMealPlan';
import { useFollowCreator } from '@/hooks/useFollowCreator';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ReadOnlyMealPlanCalendar } from '@/components/recipes/ReadOnlyMealPlanCalendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Calendar, UtensilsCrossed, Clock, Users, ChefHat, Check, Lock, UserPlus, UserCheck } from 'lucide-react';
import { PublicNav } from '@/components/layout/PublicNav';
import { format, parseISO } from 'date-fns';
import { Recipe } from '@/types/recipe';

export default function SharedMealPlanPage() {
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mealPlan, recipes, creator, isLoading, error } = useSharedMealPlan(shareSlug);
  const { cloneMealPlan, isCloning, getDefaultTargetWeek } = useCloneMealPlan();
  const { isFollowing, follow, unfollow, isLoading: followLoading } = useFollowCreator(creator?.userId);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cloneComplete, setCloneComplete] = useState(false);

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
      handleClone();
    }
  }, [user, mealPlan]);

  const handleClone = async () => {
    if (!mealPlan) return;

    const targetWeek = getDefaultTargetWeek();
    const result = await cloneMealPlan(mealPlan.items, recipes, targetWeek, {
      id: mealPlan.id,
      creatorUserId: creator?.userId || '',
      title: mealPlan.title,
    });
    if (result) {
      setCloneComplete(true);
      setTimeout(() => navigate('/meal-plan'), 1500);
    }
  };

  const handleGetPlan = () => {
    if (user) {
      handleClone();
    } else {
      // Store pending action and redirect to auth
      localStorage.setItem('pendingMealPlanClone', shareSlug || '');
      navigate(`/auth?redirect=/plan/${shareSlug}`);
    }
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
      <PublicNav />

      {/* Creator attribution */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6">
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

        {/* Fix 2c: Plan title and metadata */}
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

      {/* Calendar */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <ReadOnlyMealPlanCalendar
          items={mealPlan.items}
          recipes={recipes}
          weekStartDate={mealPlan.weekStartDate}
          onRecipeClick={setSelectedRecipe}
        />
      </div>

      {/* Recipe list */}
      <div className="max-w-6xl mx-auto px-4 py-6 border-t">
        <h2 className="text-lg font-semibold mb-4">Recipes in this plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map(recipe => (
            <Card
              key={recipe.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedRecipe(recipe)}
            >
              {recipe.imageUrl && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-1">{recipe.title}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {recipe.totalTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {recipe.totalTime} min
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {recipe.servings} servings
                  </span>
                </div>
                {recipe.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Fix 2e: 3-state CTA */}
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

      {/* Fix 2f: Recipe detail modal with CTA */}
      {selectedRecipe && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedRecipe(null)}
        >
          <Card className="max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              {selectedRecipe.imageUrl && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h2 className="text-xl font-bold">{selectedRecipe.title}</h2>
              {selectedRecipe.description && (
                <p className="text-muted-foreground">{selectedRecipe.description}</p>
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

              {selectedRecipe.ingredients.filter(ing => ing.item?.trim()).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Ingredients</h3>
                  <ul className="space-y-1 text-sm">
                    {selectedRecipe.ingredients.filter(ing => ing.item?.trim()).map((ing, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground min-w-[60px]">
                          {ing.quantity} {ing.unit}
                        </span>
                        <span>{ing.item.charAt(0).toUpperCase() + ing.item.slice(1)}{ing.notes ? ` (${ing.notes})` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecipe.instructions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Instructions</h3>
                  <ol className="space-y-2 text-sm list-decimal list-inside">
                    {selectedRecipe.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* CTA inside recipe modal */}
              <Button
                className="w-full gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRecipe(null);
                  handleGetPlan();
                }}
                disabled={isCloning || cloneComplete}
              >
                {!user ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Get this plan to save all recipes
                  </>
                ) : (
                  'Get this plan to save all recipes'
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedRecipe(null)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
