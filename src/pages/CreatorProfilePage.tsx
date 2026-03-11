import { useState, useEffect, useRef } from 'react';
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
import { Loader2, Calendar, UtensilsCrossed, ChefHat, Clock, Users, UserPlus, UserCheck, Settings, Lock, Eye, Copy, MoreVertical, EyeOff, Camera, Instagram, Youtube, Globe, ExternalLink } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useMealPlansData } from '@/hooks/useMealPlansData';
import { useRecipesData } from '@/hooks/useRecipesData';
import { useToast } from '@/hooks/use-toast';
import { PublicNav } from '@/components/layout/PublicNav';
import { Navigation } from '@/components/layout/Navigation';
import { format, parseISO } from 'date-fns';
import { AvatarCropDialog } from '@/components/settings/AvatarCropDialog';
import { Recipe } from '@/types/recipe';

// TikTok icon (not in lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.78 1.54V6.84a4.84 4.84 0 0 1-1.02-.15z"/>
    </svg>
  );
}

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

export default function CreatorProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, updateProfile: updateAuthProfile } = useAuth();
  const { profile, sharedMealPlans, publicRecipes, isLoading, error, removeMealPlan, removeRecipe } = useCreatorProfile(username);
  const { isFollowing, followerCount, isAuthenticated, follow, unfollow, isLoading: followLoading } = useFollowCreator(profile?.userId);

  const [unfollowHover, setUnfollowHover] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [engagementStats, setEngagementStats] = useState<{ views: number; clones: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'meal-plan' | 'recipe'; id: string; title: string } | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
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

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_AVATAR_SIZE) {
      toast({ title: 'File too large', description: 'Profile photo must be under 2MB.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result as string);
    reader.readAsDataURL(file);

    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleCroppedUpload = async (blob: Blob) => {
    if (!user) return;

    setIsUploadingAvatar(true);
    const path = `${user.id}/avatar.png`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/png' });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setIsUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlWithCacheBust })
      .eq('user_id', user.id);

    if (dbError) {
      toast({ title: 'Failed to save', description: dbError.message, variant: 'destructive' });
      setIsUploadingAvatar(false);
      return;
    }

    await updateAuthProfile({ avatar_url: urlWithCacheBust });
    toast({ title: 'Profile photo updated' });
    setIsUploadingAvatar(false);
  };

  const saveRecipeToPersonal = async (recipe: Recipe) => {
    if (!user) {
      setShowAuthDialog(true);
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

  const socialLinks = profile ? [
    profile.instagramHandle && { icon: Instagram, href: `https://instagram.com/${profile.instagramHandle}`, label: 'Instagram' },
    profile.tiktokHandle && { icon: TikTokIcon, href: `https://tiktok.com/@${profile.tiktokHandle}`, label: 'TikTok' },
    profile.youtubeHandle && { icon: Youtube, href: `https://youtube.com/@${profile.youtubeHandle}`, label: 'YouTube' },
    profile.websiteUrl && { icon: Globe, href: profile.websiteUrl.startsWith('http') ? profile.websiteUrl : `https://${profile.websiteUrl}`, label: 'Website' },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; href: string; label: string }[] : [];

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
      {/* Show main nav for logged-in users, public nav for visitors */}
      {user ? <Navigation /> : <PublicNav />}

      {/* Profile header */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar with upload overlay for own profile */}
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
              <AvatarImage src={profile.avatarUrl || undefined} alt={profile.displayName || profile.username} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl sm:text-2xl font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 hover:bg-black/40 transition-colors group cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold leading-tight truncate">
                  {profile.displayName || profile.username}
                </h1>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>

              {/* Follow / Edit button */}
              {isOwnProfile ? (
                <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="gap-1.5 shrink-0">
                  <Settings className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
              ) : isFollowing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFollowClick}
                  disabled={followLoading}
                  onMouseEnter={() => setUnfollowHover(true)}
                  onMouseLeave={() => setUnfollowHover(false)}
                  className={`gap-1.5 min-w-[100px] shrink-0 transition-colors ${unfollowHover ? 'border-red-400 text-red-400 hover:bg-red-50/50 hover:text-red-400' : ''}`}
                >
                  {unfollowHover ? (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Following
                    </>
                  )}
                </Button>
              ) : (
                <Button size="sm" onClick={handleFollowClick} disabled={followLoading} className="gap-1.5 shrink-0 bg-[#2D6A4F] hover:bg-[#245A42] text-white">
                  <UserPlus className="h-3.5 w-3.5" />
                  Follow
                </Button>
              )}
            </div>

            {/* Bio */}
            {profile.bio ? (
              <div className="mt-2">
                <p className={`text-sm text-muted-foreground ${!bioExpanded ? 'line-clamp-2' : ''}`}>
                  {profile.bio}
                </p>
                {profile.bio.length > 100 && (
                  <button
                    onClick={() => setBioExpanded(!bioExpanded)}
                    className="text-primary text-xs mt-0.5 hover:underline"
                  >
                    {bioExpanded ? 'Show less' : 'more'}
                  </button>
                )}
              </div>
            ) : isOwnProfile ? (
              <p className="mt-2 text-sm text-muted-foreground italic">
                No bio yet.{' '}
                <Link to="/settings" className="text-primary hover:underline not-italic">
                  Add one
                </Link>
              </p>
            ) : null}

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {socialLinks.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
            {isOwnProfile && socialLinks.length === 0 && (
              <Link to="/settings" className="inline-flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-primary">
                <ExternalLink className="h-3 w-3" />
                Add social links
              </Link>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-x-4 gap-y-1 mt-4 pb-4 border-b text-sm overflow-x-auto">
          <span className="text-muted-foreground whitespace-nowrap">
            <span className="font-semibold text-foreground">{publicRecipes.length}</span>{' '}
            {publicRecipes.length === 1 ? 'Recipe' : 'Recipes'}
          </span>
          <span className="text-muted-foreground whitespace-nowrap">
            <span className="font-semibold text-foreground">{sharedMealPlans.length}</span>{' '}
            {sharedMealPlans.length === 1 ? 'Plan' : 'Plans'}
          </span>
          <span className="text-muted-foreground whitespace-nowrap">
            <span className="font-semibold text-foreground">{followerCount}</span>{' '}
            {followerCount === 1 ? 'Follower' : 'Followers'}
          </span>
          {isOwnProfile && engagementStats && (
            <>
              <span className="text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                <Eye className="h-3 w-3" />
                <span className="font-semibold text-foreground">{engagementStats.views}</span>{' '}
                Views
              </span>
              <span className="text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                <Copy className="h-3 w-3" />
                <span className="font-semibold text-foreground">{engagementStats.clones}</span>{' '}
                Saves
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content sections */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* Shared meal plans */}
        {sharedMealPlans.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meal Plans
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-2 snap-x sm:grid sm:grid-cols-2 sm:overflow-visible">
              {sharedMealPlans.map(plan => (
                <div key={plan.id} className="relative snap-start shrink-0 w-[280px] sm:w-auto">
                  <Link to={`/plan/${plan.shareSlug}`}>
                    <div
                      className="relative h-[180px] rounded-xl overflow-hidden hover:scale-[1.02] transition-transform"
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
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meal Plans
            </h2>
            <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
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
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Recipes
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {visibleRecipes.map(recipe => (
                  <Card key={recipe.id} className="overflow-hidden relative group cursor-pointer" onClick={() => setSelectedRecipe(recipe)}>
                    {recipe.imageUrl ? (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                        <UtensilsCrossed className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    {recipe.sourceUrl && (
                      <a
                        href={recipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{recipe.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
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
                  <div className="col-span-full bg-muted/40 rounded-lg p-3 flex items-center justify-between gap-3">
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
                      {recipe.imageUrl ? (
                        <div className="aspect-[4/3] overflow-hidden">
                          <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-muted" />
                      )}
                      <CardContent className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-2">{recipe.title}</h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            --m
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            --
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

      {/* Recipe detail dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 overflow-hidden">
          {selectedRecipe && (
            <div className="overflow-y-auto max-h-[85vh]">
              {selectedRecipe.imageUrl && (
                <div className="aspect-video overflow-hidden">
                  <img src={selectedRecipe.imageUrl} alt={selectedRecipe.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-6 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedRecipe.title}</DialogTitle>
                  {selectedRecipe.description && (
                    <DialogDescription>{selectedRecipe.description}</DialogDescription>
                  )}
                </DialogHeader>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {selectedRecipe.totalTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {selectedRecipe.totalTime} min
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {selectedRecipe.servings} servings
                  </span>
                </div>

                {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Ingredients</h3>
                    <ul className="space-y-1">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>
                            {ing.quantity && <span className="font-medium">{ing.quantity} </span>}
                            {ing.unit && <span>{ing.unit} </span>}
                            {ing.item || (ing as any).name || ''}
                            {ing.notes && <span className="text-muted-foreground"> ({ing.notes})</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Instructions</h3>
                    <ol className="space-y-2">
                      {selectedRecipe.instructions.map((step, i) => (
                        <li key={i} className="text-sm flex gap-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">{i + 1}</span>
                          <span className="pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {!isOwnProfile && (
                  <div className="pt-2">
                    <Button
                      onClick={() => saveRecipeToPersonal(selectedRecipe)}
                      disabled={isSavingRecipe || savedRecipeIds.has(selectedRecipe.id)}
                      className="w-full"
                    >
                      {savedRecipeIds.has(selectedRecipe.id) ? (
                        'Saved to My Recipes'
                      ) : isSavingRecipe ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save to My Recipes'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Avatar crop dialog */}
      {cropImageSrc && (
        <AvatarCropDialog
          open={!!cropImageSrc}
          onOpenChange={(open) => !open && setCropImageSrc(null)}
          imageSrc={cropImageSrc}
          onCropComplete={handleCroppedUpload}
        />
      )}
    </div>
  );
}
