import { Link } from 'react-router-dom';
import { useRecipes } from '@/context/RecipeContext';
import { useAuth } from '@/context/AuthContext';
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
import { DAYS_OF_WEEK, MEAL_SLOTS } from '@/types/recipe';

interface DashboardProps {
  onAddRecipe: () => void;
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

export default function Dashboard({ onAddRecipe }: DashboardProps) {
  const { recipes, getCurrentMealPlan } = useRecipes();
  const { profile } = useAuth();

  const mealPlan = getCurrentMealPlan();
  const activeRecipes = recipes.filter(r => !r.isArchived);
  const isNewUser = activeRecipes.length === 0;
  const hasWeeklyPlan = mealPlan.items.length > 0;

  const firstName = profile?.display_name?.split(' ')[0];
  const greeting = getTimeOfDayGreeting();

  // Today's data
  const todayKey = format(new Date(), 'EEEE').toLowerCase();
  const todaysMeals = mealPlan.items.filter(item => item.day === todayKey);

  // Group today's meals by slot
  const todayBySlot = MEAL_SLOTS.map(slot => ({
    slot,
    label: SLOT_LABELS[slot],
    items: todaysMeals.filter(item => item.mealSlot === slot),
  }));

  // Week summary
  const mealsByDay = DAYS_OF_WEEK.map((day, i) => ({
    day,
    label: DAY_LABELS[i],
    count: mealPlan.items.filter(item => item.day === day).length,
    isToday: day === todayKey,
  }));

  const favoriteRecipes = activeRecipes.filter(r => r.isFavorite).slice(0, 4);
  const recentRecipes = activeRecipes
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);
  const plannedMealsCount = mealPlan.items.length;

  // Subtitle logic
  const getSubtitle = () => {
    if (isNewUser) return 'Save recipes, plan meals, and generate shopping lists — all in one place.';
    if (todaysMeals.length > 0) return `You have ${todaysMeals.length} meal${todaysMeals.length !== 1 ? 's' : ''} planned for today.`;
    if (hasWeeklyPlan) return 'No meals planned for today.';
    return 'Ready to plan your week?';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 md:py-16">
        <div className="container relative z-10">
          <div className="max-w-2xl">
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3 text-balance">
              {greeting}{firstName ? ', ' : ''}
              {firstName && <span className="text-primary">{firstName}</span>}
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              {getSubtitle()}
            </p>
            <div className="flex flex-wrap gap-3">
              {isNewUser ? (
                <>
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
                </>
              ) : !hasWeeklyPlan ? (
                <>
                  <Button size="lg" asChild className="gap-2">
                    <Link to="/meal-plan">
                      <Calendar className="h-5 w-5" />
                      Plan Your Week
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" onClick={onAddRecipe} className="gap-2">
                    <Plus className="h-5 w-5" />
                    Add Recipe
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" asChild className="gap-2">
                    <Link to="/meal-plan">
                      <Calendar className="h-5 w-5" />
                      View Meal Plan
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/shopping-list">
                      <ShoppingCart className="h-5 w-5 mr-1" />
                      Shopping List
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </section>

      {/* Today's Meals */}
      {!isNewUser && hasWeeklyPlan && (
        <section className="container py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold">Today's Meals</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/meal-plan">
                Full plan
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {todayBySlot.map(({ slot, label, items }) => {
              if (items.length === 0) {
                return (
                  <div
                    key={slot}
                    className="rounded-xl border border-dashed border-border/50 p-4 text-center"
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm text-muted-foreground/60">No {label.toLowerCase()} planned</p>
                  </div>
                );
              }
              return items.map(item => {
                const recipe = recipes.find(r => r.id === item.recipeId);
                if (!recipe) return null;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/50 bg-card overflow-hidden hover:shadow-card transition-all"
                  >
                    <div className="aspect-[16/9] overflow-hidden bg-muted">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🍳
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-primary mb-0.5">{label}</p>
                      <h3 className="text-sm font-medium line-clamp-1">{recipe.title}</h3>
                      {recipe.totalTime && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {recipe.totalTime}m
                        </span>
                      )}
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </section>
      )}

      {/* Week at a Glance */}
      {!isNewUser && hasWeeklyPlan && (
        <section className="container pb-8">
          <Link to="/meal-plan" className="block">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-xl font-semibold">This Week</h2>
              <span className="text-sm text-muted-foreground">{plannedMealsCount} meals planned</span>
            </div>
            <div className="flex gap-2">
              {mealsByDay.map(({ day, label, count, isToday }) => (
                <div
                  key={day}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-3 rounded-lg transition-colors",
                    isToday
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "bg-card border border-border/50"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )}>
                    {label}
                  </span>
                  <span className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold",
                    count > 0
                      ? isToday ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      : "text-muted-foreground/40"
                  )}>
                    {count || '·'}
                  </span>
                </div>
              ))}
            </div>
          </Link>
        </section>
      )}

      {/* Quick Actions */}
      <section className="container py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/meal-plan"
            className="group p-5 rounded-2xl bg-card border border-border/50 hover:shadow-card transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10 text-accent">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Plan meals</p>
                <p className="text-sm text-muted-foreground">{plannedMealsCount} meals this week</p>
              </div>
            </div>
          </Link>

          <Link
            to="/shopping-list"
            className="group p-5 rounded-2xl bg-card border border-border/50 hover:shadow-card transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10 text-success">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Shopping list</p>
                <p className="text-sm text-muted-foreground">Auto-generated</p>
              </div>
            </div>
          </Link>

          <button
            onClick={onAddRecipe}
            className="group p-5 rounded-2xl bg-card border border-border/50 hover:shadow-card transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Add recipe</p>
                <p className="text-sm text-muted-foreground">{activeRecipes.length} recipes saved</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Favorites Section */}
      {favoriteRecipes.length > 0 && (
        <section className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent fill-accent" />
              <h2 className="font-serif text-xl font-semibold">Your Favorites</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
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

      {/* Recently Added */}
      {!isNewUser && recentRecipes.length > 0 && (
        <section className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl font-semibold">Recently Added</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/recipes">
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentRecipes.map(recipe => (
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

      {/* How It Works — new users only */}
      {isNewUser && (
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
      )}
    </div>
  );
}
