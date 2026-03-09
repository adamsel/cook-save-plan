import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { useFollowCreator } from '@/hooks/useFollowCreator';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Calendar, UtensilsCrossed, ChefHat, Clock, Users, UserPlus, UserCheck, Settings, Lock, ImagePlus, Eye, Copy, MoreVertical, EyeOff } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useMealPlansData } from '@/hooks/useMealPlansData';
import { useRecipesData } from '@/hooks/useRecipesData';
import { useToast } from '@/hooks/use-toast';
import { PublicNav } from '@/components/layout/PublicNav';
import { format, parseISO } from 'date-fns';

export default function CreatorProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, sharedMealPlans, publicRecipes, isLoading, error, removeMealPlan, removeRecipe } = useCreatorProfile(username);
  const { isFollowing, followerCount, isAuthenticated, follow, unfollow, isLoading: followLoading } = useFollowCreator(profile?.userId);

  const [unfollowHover, setUnfollowHover] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [engagementStats, setEngagementStats] = useState<{ views: number; clones: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'meal-plan' | 'recipe'; id: string; title: string } | null>(null);

  const { unshareMealPlan } = useMealPlansData();
  const { makeRecipePublic } = useRecipesData();
  const { toast } = useToast();

  const isOwnProfile = user?.id === profile?.userId;

  // Fetch engagement stats for own profile
  useEffect(() => {
    if (!isOwnProfile || !profile || sharedMealPlans.length === 0) return;

    const planIds = sharedMealPlans.map(p => p.id);
    Promise.all([
      supabase
        .from('plan_engagement')
        .select('*', { count: 'exact', head: true })
        .in('meal_plan_id', planIds)
        .eq('event_type', 'view'),
      supabase
        .from('plan_engagement')
        .select('*', { count: 'exact', head: true })
        .in('meal_plan_id', planIds)
        .eq('event_type', 'clone'),
    ]).then(([viewRes, cloneRes]) => {
      setEngagementStats({
        views: viewRes.count ?? 0,
        clones: cloneRes.count ?? 0,
      });
    });
  }, [isOwnProfile, profile?.userId, sharedMealPlans.length]);

  const getInitials = () => {
    if (profile?.displayName) {
      return profile.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (profile?.username) {
      return profile.username[0].toUpperCase();
    }
    return 'C';
  };

  const handleFollowClick = () => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }
    if (isFollowing) {
      unfollow();
    } else {
      follow();
    }
  };

  const handleMakePrivate = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'meal-plan') {
      const success = await unshareMealPlan(confirmAction.id);
      if (success !== false) {
        removeMealPlan(confirmAction.id);
        toast({ title: 'Meal plan is now private' });
      }
    } else {
      const success = await makeRecipePublic(confirmAction.id, false);
      if (success !== false) {
        removeRecipe(confirmAction.id);
        toast({ title: 'Recipe is now private' });
      }
    }
    setConfirmAction(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <ChefHat className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Creator Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'This creator profile does not exist.'}
            </p>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      {/* Cover photo banner */}
      <div className="relative w-full h-[140px] sm:h-[200px] overflow-hidden">
        {profile.coverImageUrl ? (
          <img
            src={profile.coverImageUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: `center ${profile.coverImagePosition}%` }}
          />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #52B788 50%, #B7E4C7 100%)' }} />
        )}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Fix 3e: Owner cover photo nudge */}
      {isOwnProfile && !profile.coverImageUrl && (
        <div className="bg-muted/60 border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ImagePlus className="h-4 w-4 shrink-0" />
              Add a cover photo to make your profile stand out
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="shrink-0">
              Add Cover
            </Button>
          </div>
        </div>
      )}

      {/* Profile info section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8">
        {/* Avatar + action button row */}
        <div className="flex items-end justify-between">
          {/* Avatar overlapping banner */}
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 -mt-10 sm:-mt-12 ring-[3px] ring-white shadow-lg">
            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.displayName || profile.username} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl sm:text-2xl font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          {/* Follow / Edit button */}
          <div className="pt-3">
            {isOwnProfile ? (
              <Button variant="outline" onClick={() => navigate('/settings')} className="gap-2">
                <Settings className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : isFollowing ? (
              <Button
                variant="outline"
                onClick={handleFollowClick}
                disabled={followLoading}
                onMouseEnter={() => setUnfollowHover(true)}
                onMouseLeave={() => setUnfollowHover(false)}
                className={`gap-2 min-w-[120px] transition-colors ${unfollowHover ? 'border-red-400 text-red-400 hover:bg-red-50/50 hover:text-red-400' : ''}`}
              >
                {unfollowHover ? (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Following
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleFollowClick} disabled={followLoading} className="gap-2 bg-[#2D6A4F] hover:bg-[#245A42] text-white transition-transform hover:scale-105">
                <UserPlus className="h-4 w-4" />
                Follow
              </Button>
            )}
          </div>
        </div>

        {/* Name, handle, bio */}
        <div className="mt-3">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {profile.displayName || profile.username}
          </h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio ? (
            <div className="mt-2 max-w-xl">
              <p className={`text-muted-foreground ${!bioExpanded ? 'line-clamp-3' : ''}`}>
                {profile.bio}
              </p>
              {profile.bio.length > 150 && (
                <button
                  onClick={() => setBioExpanded(!bioExpanded)}
                  className="text-primary text-sm mt-0.5 hover:underline"
                >
                  {bioExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          ) : isOwnProfile ? (
            <p className="mt-2 text-muted-foreground italic">
              No bio yet.{' '}
              <Link to="/settings" className="text-primary hover:underline not-italic">
                Add one in settings
              </Link>
            </p>
          ) : null}

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3">
            <span className="group cursor-default transition-colors hover:text-foreground text-muted-foreground">
              <span className="text-base font-bold text-foreground">{followerCount}</span>{' '}
              <span className="text-sm">{followerCount === 1 ? 'Follower' : 'Followers'}</span>
            </span>
            <span className="hidden sm:inline text-muted-foreground/40">·</span>
            <span className="group cursor-default transition-colors hover:text-foreground text-muted-foreground">
              <span className="text-base font-bold text-foreground">{sharedMealPlans.length}</span>{' '}
              <span className="text-sm">{sharedMealPlans.length === 1 ? 'Meal Plan' : 'Meal Plans'}</span>
            </span>
            <span className="hidden sm:inline text-muted-foreground/40">·</span>
            <span className="group cursor-default transition-colors hover:text-foreground text-muted-foreground">
              <span className="text-base font-bold text-foreground">{publicRecipes.length}</span>{' '}
              <span className="text-sm">{publicRecipes.length === 1 ? 'Recipe' : 'Recipes'}</span>
            </span>
            {isOwnProfile && engagementStats && (
              <>
                <span className="hidden sm:inline text-muted-foreground/40">·</span>
                <span className="group cursor-default transition-colors hover:text-foreground text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span className="text-base font-bold text-foreground">{engagementStats.views}</span>{' '}
                  <span className="text-sm">Views</span>
                </span>
                <span className="hidden sm:inline text-muted-foreground/40">·</span>
                <span className="group cursor-default transition-colors hover:text-foreground text-muted-foreground flex items-center gap-1">
                  <Copy className="h-3.5 w-3.5" />
                  <span className="text-base font-bold text-foreground">{engagementStats.clones}</span>{' '}
                  <span className="text-sm">Saves</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content sections — unchanged */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Shared meal plans */}
        {sharedMealPlans.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meal Plans
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-2 snap-x sm:grid sm:grid-cols-2 sm:overflow-visible">
              {sharedMealPlans.map(plan => (
                <div key={plan.id} className="relative snap-start shrink-0 w-[280px] sm:w-auto">
                  <Link to={`/plan/${plan.shareSlug}`}>
                    <div
                      className="relative h-[160px] rounded-lg overflow-hidden hover:scale-[1.02] transition-transform"
                      style={plan.previewImageUrl
                        ? { backgroundImage: `url(${plan.previewImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { backgroundColor: '#2D6A4F' }
                      }
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute inset-0 p-4 flex flex-col justify-end">
                        <h3 className="font-semibold text-white line-clamp-1">
                          {plan.title || `Week of ${format(parseISO(plan.weekStartDate), 'MMMM d, yyyy')}`}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className="bg-white/20 text-white border-0 text-xs gap-1 backdrop-blur-sm">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(plan.weekStartDate), 'MMM d')}
                          </Badge>
                          <Badge className="bg-white/20 text-white border-0 text-xs gap-1 backdrop-blur-sm">
                            <UtensilsCrossed className="h-3 w-3" />
                            {plan.itemCount} meal{plan.itemCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                  {isOwnProfile && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.preventDefault()}
                          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setConfirmAction({ type: 'meal-plan', id: plan.id, title: plan.title || 'this meal plan' })}>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Make Private
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty meal plan state */}
        {sharedMealPlans.length === 0 && isOwnProfile && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meal Plans
            </h2>
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
              No plans shared yet — share a meal plan from your planner to show it here.
            </div>
          </section>
        )}

        {/* Public recipes */}
        {publicRecipes.length > 0 && (() => {
          const shouldBlur = !isOwnProfile && !isFollowing;
          const visibleCount = shouldBlur ? Math.min(6, publicRecipes.length) : publicRecipes.length;
          const visibleRecipes = publicRecipes.slice(0, visibleCount);
          const blurredRecipes = shouldBlur ? publicRecipes.slice(visibleCount) : [];

          return (
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Recipes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleRecipes.map(recipe => (
                  <Card key={recipe.id} className="overflow-hidden relative">
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
                    </CardContent>
                    {isOwnProfile && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setConfirmAction({ type: 'recipe', id: recipe.id, title: recipe.title })}>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Make Private
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </Card>
                ))}
                {blurredRecipes.length > 0 && (
                  <div className="col-span-full bg-muted/40 rounded-lg p-3 flex items-center justify-between gap-3 -mt-1 mb-1">
                    <p className="text-sm text-muted-foreground">
                      Follow @{profile.username} to see all {publicRecipes.length} recipes
                    </p>
                    <Button
                      size="sm"
                      onClick={handleFollowClick}
                      className="gap-1.5 bg-[#2D6A4F] hover:bg-[#245A42] text-white shrink-0"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Follow
                    </Button>
                  </div>
                )}
                {blurredRecipes.map(recipe => (
                  <div key={recipe.id} className="relative">
                    <Card className="overflow-hidden blur-[6px] pointer-events-none select-none">
                      {recipe.imageUrl && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={recipe.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-1">{recipe.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            -- min
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            -- servings
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 rounded-lg">
                      <Lock className="h-5 w-5 text-muted-foreground mb-1" />
                    </div>
                  </div>
                ))}
              </div>
              {shouldBlur && blurredRecipes.length > 0 && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={handleFollowClick}
                    className="gap-2 bg-[#2D6A4F] hover:bg-[#245A42] text-white transition-transform hover:scale-105"
                  >
                    <Lock className="h-4 w-4" />
                    Follow to unlock all recipes
                  </Button>
                </div>
              )}
            </section>
          );
        })()}

        {sharedMealPlans.length === 0 && publicRecipes.length === 0 && !isOwnProfile && (
          <div className="text-center py-12 text-muted-foreground">
            <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>This creator hasn't shared any content yet.</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make {confirmAction?.type === 'meal-plan' ? 'meal plan' : 'recipe'} private?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'meal-plan'
                ? 'This will remove the meal plan from your public profile. Followers won\'t be able to see or clone it anymore.'
                : 'This will remove the recipe from your public profile. It will still be in your personal collection.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMakePrivate}>Make Private</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fix 3d: Auth dialog for unauthenticated follow */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Follow {profile.displayName || `@${profile.username}`}</DialogTitle>
            <DialogDescription>
              Create a free account to follow creators and get their meal plans.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={() => navigate(`/auth?redirect=/creator/${username}`)}>
              Sign Up
            </Button>
            <Button variant="outline" onClick={() => navigate(`/auth?redirect=/creator/${username}`)}>
              Log In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
