import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePublicRecipe } from '@/hooks/usePublicRecipe';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2, UtensilsCrossed, Clock, Users, ChefHat, Check, Lock,
  BookmarkPlus, ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PublicNav } from '@/components/layout/PublicNav';

export default function PublicRecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recipe, creator, isLoading, error } = usePublicRecipe(id);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Auto-save if user just signed up/logged in with a pending save
  useEffect(() => {
    if (!user || !recipe || saving || saved) return;

    const pendingSave = localStorage.getItem('pendingRecipeSave');
    if (pendingSave === recipe.id) {
      localStorage.removeItem('pendingRecipeSave');
      handleSave();
    }
  }, [user, recipe]);

  const getCreatorInitials = () => {
    if (creator?.displayName) {
      return creator.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (creator?.username) {
      return creator.username[0].toUpperCase();
    }
    return 'C';
  };

  const handleSave = async () => {
    if (!recipe) return;

    if (!user) {
      localStorage.setItem('pendingRecipeSave', recipe.id);
      navigate(`/auth?redirect=/recipe/${recipe.id}`);
      return;
    }

    setSaving(true);
    try {
      // Import the hook dynamically to avoid provider issues on public page
      const { supabase } = await import('@/integrations/supabase/client');

      const { error: insertError } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: recipe.title,
          source_url: recipe.sourceUrl || null,
          image_url: recipe.imageUrl || null,
          description: recipe.description || null,
          category: recipe.category || 'Other',
          tags: recipe.tags || [],
          prep_time: recipe.prepTime || null,
          cook_time: recipe.cookTime || null,
          total_time: recipe.totalTime || null,
          servings: recipe.servings,
          ingredients: recipe.ingredients as unknown as Record<string, unknown>[],
          instructions: recipe.instructions,
          cuisine: recipe.cuisine || null,
          dietary: recipe.dietary || [],
          meal_types: recipe.mealTypes || [],
          author: recipe.author || creator?.displayName || null,
          nutrition: recipe.nutrition as unknown as Record<string, unknown> || null,
          import_method: 'manual',
        });

      if (insertError) {
        toast({ title: 'Error', description: 'Could not save recipe. Please try again.', variant: 'destructive' });
      } else {
        setSaved(true);
        toast({ title: 'Recipe saved!', description: 'Added to your stash.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Recipe Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'This recipe may have been removed or is no longer shared.'}
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
    <div className="min-h-screen bg-background pb-24">
      <PublicNav />
      {/* Hero image */}
      {recipe.imageUrl && (
        <div className="w-full h-[200px] sm:h-[300px] overflow-hidden bg-muted">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-8">
        {/* Creator attribution */}
        {creator && (
          <div className="flex items-center gap-3 pt-6 pb-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={creator.avatarUrl || undefined} alt={creator.displayName || 'Creator'} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getCreatorInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              {creator.displayName && (
                <p className="text-sm font-medium">
                  {creator.username ? (
                    <Link to={`/creator/${creator.username}`} className="hover:underline">
                      {creator.displayName}
                    </Link>
                  ) : (
                    creator.displayName
                  )}
                </p>
              )}
              {creator.username && (
                <Link
                  to={`/creator/${creator.username}`}
                  className="text-xs text-[#2D6A4F] hover:underline"
                >
                  @{creator.username}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="font-serif text-2xl sm:text-3xl font-bold mt-2">
          {recipe.title}
        </h1>

        {recipe.description && (
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            {recipe.description}
          </p>
        )}

        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {recipe.totalTime && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {recipe.totalTime} min
            </Badge>
          )}
          {recipe.prepTime && !recipe.totalTime && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {recipe.prepTime} min prep
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {recipe.servings} servings
          </Badge>
          {recipe.cuisine && (
            <Badge variant="secondary" className="gap-1">
              <ChefHat className="h-3 w-3" />
              {recipe.cuisine}
            </Badge>
          )}
          {recipe.dietary?.map(d => (
            <Badge key={d} variant="outline">{d}</Badge>
          ))}
        </div>

        {/* Ingredients */}
        {recipe.ingredients.filter(ing => ing.item?.trim()).length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.filter(ing => ing.item?.trim()).map((ing, i) => (
                <li key={i} className="flex gap-3 text-sm py-1 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground min-w-[70px] text-right tabular-nums">
                    {ing.quantity} {ing.unit}
                  </span>
                  <span>
                    {ing.item.charAt(0).toUpperCase() + ing.item.slice(1)}
                    {ing.notes ? <span className="text-muted-foreground"> ({ing.notes})</span> : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {recipe.instructions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Nutrition */}
        {recipe.nutrition && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Nutrition per serving</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Calories', value: `${Math.round(recipe.nutrition.perServing.calories)}` },
                { label: 'Protein', value: `${Math.round(recipe.nutrition.perServing.protein)}g` },
                { label: 'Carbs', value: `${Math.round(recipe.nutrition.perServing.carbs)}g` },
                { label: 'Fat', value: `${Math.round(recipe.nutrition.perServing.fat)}g` },
              ].map(n => (
                <div key={n.label} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-lg font-semibold">{n.value}</p>
                  <p className="text-xs text-muted-foreground">{n.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source link */}
        {recipe.sourceUrl && (
          <div className="mt-6">
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View original recipe
            </a>
          </div>
        )}
      </div>

      {/* Fixed CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="hidden sm:block min-w-0">
            <p className="font-medium truncate">{recipe.title}</p>
            <p className="text-sm text-muted-foreground">
              {saved ? 'Saved to your stash' : user ? 'Save this recipe to your collection' : 'Sign up to save this recipe'}
            </p>
          </div>
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2"
            onClick={saved ? () => navigate('/recipes') : handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                View My Recipes
              </>
            ) : !user ? (
              <>
                <Lock className="h-4 w-4" />
                Save to My Stash
              </>
            ) : (
              <>
                <BookmarkPlus className="h-4 w-4" />
                Save to My Stash
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
