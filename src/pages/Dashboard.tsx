import { Link } from 'react-router-dom';
import { useRecipes } from '@/context/RecipeContext';
import { Button } from '@/components/ui/button';
import { 
  UtensilsCrossed, 
  Calendar, 
  ShoppingCart, 
  ChevronRight,
  Plus,
  Heart,
  Clock,
  Sparkles
} from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardProps {
  onAddRecipe: () => void;
}

export default function Dashboard({ onAddRecipe }: DashboardProps) {
  const { recipes, getCurrentMealPlan } = useRecipes();
  
  const mealPlan = getCurrentMealPlan();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  
  const favoriteRecipes = recipes.filter(r => r.isFavorite && !r.isArchived).slice(0, 4);
  const recentRecipes = recipes
    .filter(r => !r.isArchived)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);
  const plannedMealsCount = mealPlan.items.length;

  return (
    <div className="min-h-[calc(100vh-4rem)] animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 md:py-24">
        <div className="container relative z-10">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-balance">
              Welcome to your
              <span className="text-primary"> Recipe Stash</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Save recipes, plan your meals, and generate shopping lists — all in one beautiful place.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={onAddRecipe} className="gap-2">
                <Plus className="h-5 w-5" />
                Add Your First Recipe
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/recipes">
                  Browse Recipes
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </section>

      {/* Quick Stats */}
      <section className="container py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          <Link 
            to="/recipes" 
            className="group p-6 rounded-2xl bg-card border border-border/50 hover:shadow-card transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold">{recipes.filter(r => !r.isArchived).length}</p>
                <p className="text-sm text-muted-foreground">Saved Recipes</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/meal-plan" 
            className="group p-6 rounded-2xl bg-card border border-border/50 hover:shadow-card transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10 text-accent">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold">{plannedMealsCount}</p>
                <p className="text-sm text-muted-foreground">Meals Planned</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/shopping-list" 
            className="group p-6 rounded-2xl bg-card border border-border/50 hover:shadow-card transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10 text-success">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Shopping List</p>
                <p className="text-sm text-muted-foreground">Auto-generated</p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Favorites Section */}
      {favoriteRecipes.length > 0 && (
        <section className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent fill-accent" />
              <h2 className="font-serif text-2xl font-semibold">Your Favorites</h2>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/recipes">
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favoriteRecipes.map(recipe => (
              <div 
                key={recipe.id} 
                className="group rounded-2xl bg-card border border-border/50 overflow-hidden hover:shadow-card transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {recipe.imageUrl ? (
                    <img 
                      src={recipe.imageUrl} 
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🍳
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium line-clamp-1">{recipe.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    {recipe.totalTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {recipe.totalTime}m
                      </span>
                    )}
                    <span>{recipe.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="container py-12">
        <h2 className="font-serif text-2xl font-semibold text-center mb-8">How It Works</h2>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
            <h3 className="font-semibold mb-2">1. Save Recipes</h3>
            <p className="text-sm text-muted-foreground">
              Add recipes from URLs, paste text, or enter them manually. Build your personal collection.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-7 w-7" />
            </div>
            <h3 className="font-semibold mb-2">2. Plan Your Week</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop recipes into your weekly meal plan. Adjust servings as needed.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-success/10 text-success flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="font-semibold mb-2">3. Shop Smart</h3>
            <p className="text-sm text-muted-foreground">
              Get an auto-generated shopping list with quantities combined and organized by aisle.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
