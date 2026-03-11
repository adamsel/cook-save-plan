import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCreatorDashboard } from '@/hooks/useCreatorDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Users, Eye, BookmarkPlus, Copy, UtensilsCrossed, Calendar,
  TrendingUp, ArrowUpRight, ChefHat, Settings,
} from 'lucide-react';

export default function CreatorDashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { overview, recipeStats, planStats, isLoading } = useCreatorDashboard();

  // Show setup prompt if not a creator
  if (!isLoading && profile && !profile.is_creator) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-16">
        <div className="flex flex-col items-center text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Become a Creator</h1>
          <p className="text-muted-foreground">
            Set up your creator profile to share recipes and meal plans with your followers, and track how your content performs.
          </p>
          <Button onClick={() => navigate('/settings')} className="gap-2">
            <Settings className="h-4 w-4" />
            Set Up Creator Profile
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !overview) {
    return (
      <div className="flex items-center justify-center pt-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const overviewCards = [
    { label: 'Followers', value: overview.followerCount, change: overview.newFollowers30d, icon: Users },
    { label: 'Recipe Saves', value: overview.recipeSaves, icon: BookmarkPlus },
    { label: 'Recipe Views', value: overview.recipeViews, icon: Eye },
    { label: 'Plan Saves', value: overview.planClones, icon: Copy },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Creator Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            See how your shared content is performing.
          </p>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{card.value.toLocaleString()}</p>
                {card.change !== undefined && card.change > 0 && (
                  <p className="text-xs text-green-600 flex items-center gap-0.5 mt-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +{card.change} this month
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 px-5 flex items-center gap-3">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-semibold">{overview.publicRecipeCount}</p>
                <p className="text-xs text-muted-foreground">Public Recipes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 px-5 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-semibold">{overview.sharedPlanCount}</p>
                <p className="text-xs text-muted-foreground">Shared Plans</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipe stats table */}
        {recipeStats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Recipe Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-medium text-muted-foreground px-4 py-2">Recipe</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2">Views</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2">Saves</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2">Plan Adds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipeStats.map((recipe) => (
                      <tr key={recipe.recipeId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            {recipe.imageUrl ? (
                              <img
                                src={recipe.imageUrl}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <UtensilsCrossed className="h-4 w-4 text-muted-foreground/30" />
                              </div>
                            )}
                            <span className="font-medium line-clamp-1">{recipe.title}</span>
                          </div>
                        </td>
                        <td className="text-right px-4 py-2.5 tabular-nums">{recipe.viewCount}</td>
                        <td className="text-right px-4 py-2.5 tabular-nums">{recipe.saveCount}</td>
                        <td className="text-right px-4 py-2.5 tabular-nums">{recipe.planAddCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan stats table */}
        {planStats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Meal Plan Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-medium text-muted-foreground px-4 py-2">Plan</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2">Views</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2">Saves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planStats.map((plan) => (
                      <tr key={plan.planId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#2D6A4F] flex items-center justify-center shrink-0">
                              <Calendar className="h-4 w-4 text-white/60" />
                            </div>
                            <span className="font-medium line-clamp-1">{plan.title}</span>
                          </div>
                        </td>
                        <td className="text-right px-4 py-2.5 tabular-nums">{plan.viewCount}</td>
                        <td className="text-right px-4 py-2.5 tabular-nums">{plan.cloneCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
