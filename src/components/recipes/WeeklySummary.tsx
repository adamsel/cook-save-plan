import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Recipe, MealPlanItem, DAYS_OF_WEEK, Ingredient } from '@/types/recipe';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Flame,
  Beef,
  Wheat,
  Droplets,
  Clock,
  ChefHat,
  TrendingUp,
  Utensils,
  Sparkles,
  Target,
  CheckCircle2,
  Lightbulb,
  AlertTriangle,
  Loader2,
  Leaf,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzeIngredientDiversity, FOOD_GROUP_INFO, FoodGroup } from '@/lib/ingredientCategories';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface NutritionGoals {
  primaryGoal?: 'weight_loss' | 'muscle_gain' | 'balanced' | 'none';
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

interface AIInsight {
  type: 'positive' | 'suggestion' | 'warning';
  title: string;
  description: string;
  actionable?: string;
}

interface WeeklySummaryProps {
  recipes: Recipe[];
  mealPlanItems: MealPlanItem[];
  pantryStaples: string[];
  householdSize: number;
}

interface AggregatedIngredient {
  item: string;
  quantities: { quantity: number | null; unit: string }[];
}

export function WeeklySummary({ recipes, mealPlanItems, pantryStaples, householdSize }: WeeklySummaryProps) {
  const { user } = useAuth();

  // Load nutrition goals from localStorage (stored inside householdSettings)
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>({});
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const lastFetchRef = useRef<string>('');

  // Cache settings: 10 minute TTL, stored in localStorage
  const INSIGHTS_CACHE_KEY = 'aiInsightsCache';
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  // Mobile detection and collapsible state
  const [isMobile, setIsMobile] = useState(false);
  const [nutritionOpen, setNutritionOpen] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [foodGroupOpen, setFoodGroupOpen] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Default to collapsed on mobile
      if (mobile) {
        setNutritionOpen(false);
        setInsightsOpen(false);
        setFoodGroupOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('householdSettings');
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.nutritionGoals) {
          setNutritionGoals(settings.nutritionGoals);
        }
      }
    } catch (e) {
      console.error('Failed to load nutrition goals:', e);
    }
  }, []);

  // Fetch AI insights function with caching
  const fetchAIInsights = useCallback(async (
    avgCalories: number,
    avgProtein: number,
    avgCarbs: number,
    avgFat: number,
    totalMeals: number,
    daysWithMeals: number,
    forceRefresh: boolean = false
  ) => {
    // Skip if user not logged in (prevents 401 errors)
    if (!user) {
      return;
    }

    // Skip if no meals planned
    if (totalMeals === 0) {
      setAiInsights([]);
      return;
    }

    // Create a hash of the nutrition data (rounded to reduce sensitivity)
    const requestHash = `${Math.round(avgCalories/10)*10}-${Math.round(avgProtein)}-${Math.round(avgCarbs)}-${Math.round(avgFat)}-${totalMeals}-${daysWithMeals}`;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(INSIGHTS_CACHE_KEY);
        if (cached) {
          const { hash, insights, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          // Use cache if same hash OR cache is less than 10 minutes old
          if (hash === requestHash || age < CACHE_TTL_MS) {
            setAiInsights(insights);
            lastFetchRef.current = requestHash;
            // If hash changed but cache is recent, show cached data (don't fetch)
            if (hash !== requestHash && age < CACHE_TTL_MS) {
              console.log('Using recent cached insights (data changed slightly)');
            }
            return;
          }
        }
      } catch (e) {
        console.error('Failed to read insights cache:', e);
      }
    }

    // Skip if we already fetched this exact data
    if (requestHash === lastFetchRef.current && !forceRefresh) {
      return;
    }

    setIsLoadingInsights(true);
    setInsightsError(null);

    try {
      const { data, error } = await supabase.functions.invoke('meal-plan-analysis', {
        body: {
          nutrition: {
            avgDailyCalories: avgCalories,
            avgDailyProtein: avgProtein,
            avgDailyCarbs: avgCarbs,
            avgDailyFat: avgFat,
            totalMeals,
            daysPlanned: daysWithMeals,
          },
          householdSize,
          userGoals: nutritionGoals.primaryGoal && nutritionGoals.primaryGoal !== 'none' ? {
            primaryGoal: nutritionGoals.primaryGoal,
            targetCalories: nutritionGoals.targetCalories,
            targetProtein: nutritionGoals.targetProtein,
            targetCarbs: nutritionGoals.targetCarbs,
            targetFat: nutritionGoals.targetFat,
          } : undefined,
        },
      });

      if (error) {
        console.error('AI insights error:', error);
        const errorMessage = error.message || 'Unable to connect to AI service';
        setInsightsError(errorMessage.includes('rate') ? 'Rate limit reached. Try again later.' : 'AI insights temporarily unavailable');
        return;
      }

      if (data?.insights) {
        setAiInsights(data.insights);
        lastFetchRef.current = requestHash;
        // Save to cache
        try {
          localStorage.setItem(INSIGHTS_CACHE_KEY, JSON.stringify({
            hash: requestHash,
            insights: data.insights,
            timestamp: Date.now(),
          }));
        } catch (e) {
          console.error('Failed to cache insights:', e);
        }
      } else if (data?.error) {
        console.error('AI insights API error:', data.error);
        if (data.error.includes('429') || data.error.includes('rate')) {
          setInsightsError('AI rate limit reached. Please try again in a few minutes.');
        } else {
          setInsightsError('AI insights temporarily unavailable');
        }
      }
    } catch (e) {
      console.error('AI insights fetch failed:', e);
      setInsightsError('AI insights temporarily unavailable');
    } finally {
      setIsLoadingInsights(false);
    }
  }, [user, householdSize, nutritionGoals]);

  const summary = useMemo(() => {
    // Track per-day nutrition for accurate daily averages
    const dailyNutrition: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    DAYS_OF_WEEK.forEach(day => {
      dailyNutrition[day] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    });

    let totalPrepTime = 0;
    let totalCookTime = 0;
    let mealsPlanned = 0;
    let totalMealsIncludingLeftovers = 0;
    let leftoverMealsCount = 0;
    const mealSlotCounts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    const ingredientsMap = new Map<string, AggregatedIngredient>();
    const recipesUsed = new Set<string>();

    mealPlanItems.forEach(item => {
      const recipe = recipes.find(r => r.id === item.recipeId);
      if (!recipe) return;

      recipesUsed.add(recipe.id);
      mealsPlanned++;

      // Count total meals including leftovers
      const leftoverCount = item.leftoverMeals || 0;
      totalMealsIncludingLeftovers += 1 + leftoverCount;
      leftoverMealsCount += leftoverCount;

      // Track by meal slot
      if (item.mealSlot in mealSlotCounts) {
        mealSlotCounts[item.mealSlot as keyof typeof mealSlotCounts]++;
      }

      // Calculate nutrition per meal (split across primary + leftovers)
      if (recipe.nutrition) {
        const multiplier = item.servingsMultiplier;
        const totalMeals = 1 + leftoverCount;

        // Total nutrition for this cooking session
        const sessionCalories = recipe.nutrition.perServing.calories * recipe.servings * multiplier;
        const sessionProtein = recipe.nutrition.perServing.protein * recipe.servings * multiplier;
        const sessionCarbs = recipe.nutrition.perServing.carbs * recipe.servings * multiplier;
        const sessionFat = recipe.nutrition.perServing.fat * recipe.servings * multiplier;

        // Nutrition per meal (split evenly across primary + leftovers)
        const caloriesPerMeal = sessionCalories / totalMeals;
        const proteinPerMeal = sessionProtein / totalMeals;
        const carbsPerMeal = sessionCarbs / totalMeals;
        const fatPerMeal = sessionFat / totalMeals;

        // Use guestCount for events, householdSize for regular meals
        const eaters = item.eventType && item.guestCount ? item.guestCount : householdSize;

        // Add primary meal nutrition to its day (per-person)
        if (dailyNutrition[item.day]) {
          dailyNutrition[item.day].calories += caloriesPerMeal / eaters;
          dailyNutrition[item.day].protein += proteinPerMeal / eaters;
          dailyNutrition[item.day].carbs += carbsPerMeal / eaters;
          dailyNutrition[item.day].fat += fatPerMeal / eaters;
        }

        // Add leftover meals nutrition to their respective days (leftovers use householdSize)
        const dayIndex = DAYS_OF_WEEK.indexOf(item.day as typeof DAYS_OF_WEEK[number]);
        for (let i = 0; i < leftoverCount; i++) {
          const customPos = item.leftoverPositions?.find(lp => lp.index === i);

          let targetDay: string;
          if (customPos) {
            // Use custom position
            targetDay = customPos.day;
          } else {
            // Default: next day(s)
            const targetDayIndex = dayIndex + 1 + i;
            if (targetDayIndex >= DAYS_OF_WEEK.length) continue; // Skip if beyond week
            targetDay = DAYS_OF_WEEK[targetDayIndex];
          }

          if (dailyNutrition[targetDay]) {
            // Leftovers are eaten by household, not event guests
            dailyNutrition[targetDay].calories += caloriesPerMeal / householdSize;
            dailyNutrition[targetDay].protein += proteinPerMeal / householdSize;
            dailyNutrition[targetDay].carbs += carbsPerMeal / householdSize;
            dailyNutrition[targetDay].fat += fatPerMeal / householdSize;
          }
        }
      }

      // Prep time (only count once per unique recipe)
      if (!recipesUsed.has(recipe.id + '_time')) {
        recipesUsed.add(recipe.id + '_time');
        totalPrepTime += recipe.prepTime || 0;
        totalCookTime += recipe.cookTime || 0;
      }

      // Ingredients - scale by servingsMultiplier
      recipe.ingredients.forEach(ing => {
        const normalizedItem = ing.item.toLowerCase().trim();

        // Skip pantry staples
        if (pantryStaples.some(staple => normalizedItem.includes(staple.toLowerCase()))) {
          return;
        }

        const key = normalizedItem;
        const scaledQty = ing.quantity ? ing.quantity * item.servingsMultiplier : null;

        if (ingredientsMap.has(key)) {
          ingredientsMap.get(key)!.quantities.push({ quantity: scaledQty, unit: ing.unit });
        } else {
          ingredientsMap.set(key, {
            item: ing.item,
            quantities: [{ quantity: scaledQty, unit: ing.unit }]
          });
        }
      });
    });

    // Sum up all daily nutrition
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let daysWithMeals = 0;

    DAYS_OF_WEEK.forEach(day => {
      totalCalories += dailyNutrition[day].calories;
      totalProtein += dailyNutrition[day].protein;
      totalCarbs += dailyNutrition[day].carbs;
      totalFat += dailyNutrition[day].fat;
      if (dailyNutrition[day].calories > 0) daysWithMeals++;
    });

    // Aggregate quantities by unit
    const shoppingList = Array.from(ingredientsMap.entries()).map(([key, data]) => {
      const unitGroups = new Map<string, number>();

      data.quantities.forEach(q => {
        const unit = q.unit || '';
        if (q.quantity !== null) {
          unitGroups.set(unit, (unitGroups.get(unit) || 0) + q.quantity);
        } else {
          unitGroups.set(unit, unitGroups.get(unit) || 0);
        }
      });

      const displayQuantities = Array.from(unitGroups.entries())
        .map(([unit, qty]) => qty > 0 ? `${qty.toFixed(qty % 1 === 0 ? 0 : 1)}${unit ? ' ' + unit : ''}` : '')
        .filter(Boolean)
        .join(' + ');

      return {
        item: data.item,
        display: displayQuantities || 'as needed'
      };
    }).sort((a, b) => a.item.localeCompare(b.item));

    // Generate meal planning insight
    const getMealSummaryText = () => {
      const parts: string[] = [];
      if (mealSlotCounts.dinner > 0) {
        parts.push(`${mealSlotCounts.dinner} dinner${mealSlotCounts.dinner > 1 ? 's' : ''}`);
      }
      if (mealSlotCounts.lunch > 0) {
        parts.push(`${mealSlotCounts.lunch} lunch${mealSlotCounts.lunch > 1 ? 'es' : ''}`);
      }
      if (mealSlotCounts.breakfast > 0) {
        parts.push(`${mealSlotCounts.breakfast} breakfast${mealSlotCounts.breakfast > 1 ? 's' : ''}`);
      }
      if (mealSlotCounts.snack > 0) {
        parts.push(`${mealSlotCounts.snack} snack${mealSlotCounts.snack > 1 ? 's' : ''}`);
      }
      if (leftoverMealsCount > 0) {
        parts.push(`${leftoverMealsCount} leftover meal${leftoverMealsCount > 1 ? 's' : ''}`);
      }
      return parts.join(', ');
    };

    // Already calculated per-person values above (divided per-item by eaters)
    const perPersonCalories = Math.round(totalCalories);
    const perPersonProtein = Math.round(totalProtein);
    const perPersonCarbs = Math.round(totalCarbs);
    const perPersonFat = Math.round(totalFat);

    // Daily average based on days that have meals (more accurate than dividing by 7)
    const avgDivisor = daysWithMeals > 0 ? daysWithMeals : 7;

    // Calculate ingredient diversity (replaces recipe variety)
    const allIngredients: Ingredient[] = [];
    mealPlanItems.forEach(item => {
      const recipe = recipes.find(r => r.id === item.recipeId);
      if (recipe) {
        allIngredients.push(...recipe.ingredients);
      }
    });
    const diversityAnalysis = analyzeIngredientDiversity(allIngredients);

    const uniqueRecipeCount = recipesUsed.size / 2;

    // Calculate daily nutrition breakdown for display
    const dailyBreakdown = DAYS_OF_WEEK.map(day => ({
      day,
      calories: Math.round(dailyNutrition[day].calories),
      protein: Math.round(dailyNutrition[day].protein),
      carbs: Math.round(dailyNutrition[day].carbs),
      fat: Math.round(dailyNutrition[day].fat),
      hasMeals: dailyNutrition[day].calories > 0,
    }));

    return {
      totalCalories: perPersonCalories,
      totalProtein: perPersonProtein,
      totalCarbs: perPersonCarbs,
      totalFat: perPersonFat,
      totalPrepTime,
      totalCookTime,
      mealsPlanned,
      totalMealsIncludingLeftovers,
      leftoverMealsCount,
      uniqueRecipes: uniqueRecipeCount,
      shoppingList,
      avgCaloriesPerDay: Math.round(perPersonCalories / avgDivisor),
      avgProteinPerDay: Math.round(perPersonProtein / avgDivisor),
      avgCarbsPerDay: Math.round(perPersonCarbs / avgDivisor),
      avgFatPerDay: Math.round(perPersonFat / avgDivisor),
      mealSummaryText: getMealSummaryText(),
      mealSlotCounts,
      daysWithMeals,
      dailyBreakdown,
      // Ingredient diversity
      diversityScore: diversityAnalysis.diversityScore,
      totalUniqueIngredients: diversityAnalysis.totalUniqueIngredients,
      foodGroupCounts: diversityAnalysis.foodGroupCounts,
      coveredGroups: diversityAnalysis.coveredGroups,
      missingGroups: diversityAnalysis.missingGroups,
    };
  }, [recipes, mealPlanItems, pantryStaples, householdSize]);

  // Fetch AI insights - uses cache first, then debounced API calls
  const hasInitiallyFetched = useRef(false);

  useEffect(() => {
    if (summary.mealsPlanned === 0) {
      setAiInsights([]);
      hasInitiallyFetched.current = false;
      return;
    }

    // On first load: check cache immediately (no API call if cached)
    if (!hasInitiallyFetched.current) {
      hasInitiallyFetched.current = true;
      fetchAIInsights(
        summary.avgCaloriesPerDay,
        summary.avgProteinPerDay,
        summary.avgCarbsPerDay,
        summary.avgFatPerDay,
        summary.totalMealsIncludingLeftovers,
        summary.daysWithMeals,
        false // Use cache if available
      );
      return;
    }

    // Debounce subsequent changes (60 seconds - reduces API calls significantly)
    const timer = setTimeout(() => {
      fetchAIInsights(
        summary.avgCaloriesPerDay,
        summary.avgProteinPerDay,
        summary.avgCarbsPerDay,
        summary.avgFatPerDay,
        summary.totalMealsIncludingLeftovers,
        summary.daysWithMeals,
        false
      );
    }, 60000); // 60 seconds debounce

    return () => clearTimeout(timer);
  }, [
    summary.mealsPlanned,
    summary.avgCaloriesPerDay,
    summary.avgProteinPerDay,
    summary.avgCarbsPerDay,
    summary.avgFatPerDay,
    summary.totalMealsIncludingLeftovers,
    summary.daysWithMeals,
    fetchAIInsights
  ]);

  const hasData = summary.mealsPlanned > 0;

  if (!hasData) {
    return (
      <Card className="p-6 bg-card border-border/50">
        <div className="text-center py-8">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-muted-foreground">No meals planned</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Drag recipes to the calendar to see your weekly summary
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "bg-card border-border/50 shadow-sm",
      isMobile ? "p-3" : "p-5"
    )}>
      <h3 className={cn(
        "font-semibold flex items-center gap-2",
        isMobile ? "text-base mb-3" : "text-lg mb-4"
      )}>
        <TrendingUp className={cn(isMobile ? "h-4 w-4" : "h-5 w-5", "text-primary")} />
        Weekly Summary
      </h3>

      {/* Stats Overview - Compact on mobile */}
      <div className={cn(
        "grid gap-2 mb-4",
        isMobile ? "grid-cols-3" : "grid-cols-3 gap-3 mb-5"
      )}>
        <div className={cn(
          "rounded-xl bg-violet-500/10 border border-violet-500/20",
          isMobile ? "p-3 text-center" : "p-4"
        )}>
          {isMobile ? (
            <>
              <Utensils className="h-4 w-4 mx-auto text-violet-600 dark:text-violet-400 mb-1" />
              <div className="text-xl font-bold text-violet-600 dark:text-violet-400">{summary.totalMealsIncludingLeftovers}</div>
              <div className="text-[10px] text-muted-foreground">meals</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
                <Utensils className="h-5 w-5" />
                <span className="text-sm font-semibold">Total Meals</span>
              </div>
              <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">{summary.totalMealsIncludingLeftovers}</div>
              <div className="text-sm text-muted-foreground">
                {summary.mealsPlanned} cooked{summary.leftoverMealsCount > 0 && ` + ${summary.leftoverMealsCount} leftovers`}
              </div>
            </>
          )}
        </div>

        <div className={cn(
          "rounded-xl bg-blue-500/10 border border-blue-500/20",
          isMobile ? "p-3 text-center" : "p-4"
        )}>
          {isMobile ? (
            <>
              <Clock className="h-4 w-4 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{Math.round((summary.totalPrepTime + summary.totalCookTime) / 60)}h</div>
              <div className="text-[10px] text-muted-foreground">prep</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-semibold">Prep Time</span>
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{Math.round((summary.totalPrepTime + summary.totalCookTime) / 60)}h</div>
              <div className="text-sm text-muted-foreground">{summary.totalPrepTime + summary.totalCookTime} min</div>
            </>
          )}
        </div>

        <div className={cn(
          "rounded-xl bg-emerald-500/10 border border-emerald-500/20",
          isMobile ? "p-3 text-center" : "p-4"
        )}>
          {isMobile ? (
            <>
              <Leaf className="h-4 w-4 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{summary.diversityScore}%</div>
              <div className="text-[10px] text-muted-foreground">diversity</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <Leaf className="h-5 w-5" />
                <span className="text-sm font-semibold">Diversity</span>
              </div>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{summary.diversityScore}%</div>
              <div className="text-sm text-muted-foreground">{summary.totalUniqueIngredients} ingredients</div>
            </>
          )}
        </div>
      </div>

      {/* Ingredient Diversity Details - Collapsible on mobile */}
      {summary.totalUniqueIngredients > 0 && (
        <Collapsible open={foodGroupOpen} onOpenChange={setFoodGroupOpen} className="mb-4">
          <div className="rounded-lg bg-muted/30 border border-border/30 overflow-hidden">
            <CollapsibleTrigger className="w-full p-3 min-h-[48px] flex items-center justify-between hover:bg-muted/50 transition-colors">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Food Group Coverage
              </h4>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                foodGroupOpen && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3">
                <div className="grid grid-cols-5 gap-2">
                  {(['produce', 'protein', 'grains', 'dairy', 'fats'] as FoodGroup[]).map((group) => {
                    const info = FOOD_GROUP_INFO[group];
                    const count = summary.foodGroupCounts[group] || 0;
                    const isCovered = count > 0;
                    return (
                      <div
                        key={group}
                        className={cn(
                          "text-center p-2 rounded-lg transition-colors",
                          isCovered ? "bg-background" : "bg-muted/50 opacity-60"
                        )}
                      >
                        <div className="text-xl mb-0.5">{info.emoji}</div>
                        <div className={cn("text-sm font-semibold", isCovered ? info.color : "text-muted-foreground")}>
                          {count}
                        </div>
                        <div className="text-xs text-muted-foreground">{info.label}</div>
                      </div>
                    );
                  })}
                </div>
                {summary.missingGroups.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-3 italic">
                    Missing: {summary.missingGroups.map(g => FOOD_GROUP_INFO[g].label).join(', ')}
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Meal Summary Text - Hidden on mobile */}
      {summary.mealSummaryText && !isMobile && (
        <div className="mb-5 p-4 rounded-lg bg-muted/30 border border-border/30">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">This week:</span>{' '}
            {summary.mealSummaryText}
          </p>
        </div>
      )}

      {/* Nutrition with Progress Bars - Collapsible on mobile */}
      <Collapsible open={nutritionOpen} onOpenChange={setNutritionOpen} className="mb-4">
        <div className="rounded-lg bg-muted/30 border border-border/30 overflow-hidden">
          <CollapsibleTrigger className="w-full p-3 min-h-[48px] flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Nutrition Goals
              </h4>
              {(nutritionGoals.targetCalories || nutritionGoals.targetProtein || nutritionGoals.targetCarbs || nutritionGoals.targetFat) && (
                <Badge variant="secondary" className="text-xs ml-2">
                  {summary.daysWithMeals} days
                </Badge>
              )}
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              nutritionOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3">
              {(nutritionGoals.targetCalories || nutritionGoals.targetProtein || nutritionGoals.targetCarbs || nutritionGoals.targetFat) ? (
                <div className="space-y-4">
                  {nutritionGoals.targetCalories && (
                    <NutritionProgressBar
                      icon={Flame}
                      label="Calories"
                      current={summary.avgCaloriesPerDay}
                      goal={nutritionGoals.targetCalories}
                      unit=""
                      colorClass="bg-orange-500"
                    />
                  )}
                  {nutritionGoals.targetProtein && (
                    <NutritionProgressBar
                      icon={Beef}
                      label="Protein"
                      current={summary.avgProteinPerDay}
                      goal={nutritionGoals.targetProtein}
                      unit="g"
                      colorClass="bg-red-500"
                    />
                  )}
                  {nutritionGoals.targetCarbs && (
                    <NutritionProgressBar
                      icon={Wheat}
                      label="Carbs"
                      current={summary.avgCarbsPerDay}
                      goal={nutritionGoals.targetCarbs}
                      unit="g"
                      colorClass="bg-amber-500"
                    />
                  )}
                  {nutritionGoals.targetFat && (
                    <NutritionProgressBar
                      icon={Droplets}
                      label="Fat"
                      current={summary.avgFatPerDay}
                      goal={nutritionGoals.targetFat}
                      unit="g"
                      colorClass="bg-blue-500"
                    />
                  )}
                </div>
              ) : (
                // Fallback to simple cards when no goals are set
                <div className={cn(
                  "grid gap-2",
                  isMobile ? "grid-cols-2" : "grid-cols-4"
                )}>
                  <NutritionCard
                    icon={Flame}
                    label="Calories"
                    value={summary.totalCalories.toLocaleString()}
                    subtext={`~${summary.avgCaloriesPerDay}/day`}
                    colorClass="text-orange-500"
                  />
                  <NutritionCard
                    icon={Beef}
                    label="Protein"
                    value={`${summary.totalProtein}g`}
                    subtext={`~${summary.avgProteinPerDay}g/day`}
                    colorClass="text-red-500"
                  />
                  <NutritionCard
                    icon={Wheat}
                    label="Carbs"
                    value={`${summary.totalCarbs}g`}
                    subtext={`~${summary.avgCarbsPerDay}g/day`}
                    colorClass="text-amber-500"
                  />
                  <NutritionCard
                    icon={Droplets}
                    label="Fat"
                    value={`${summary.totalFat}g`}
                    subtext={`~${summary.avgFatPerDay}g/day`}
                    colorClass="text-blue-500"
                  />
                </div>
              )}

              {/* Set Goals Prompt */}
              {(!nutritionGoals.targetCalories && !nutritionGoals.targetProtein && !nutritionGoals.targetCarbs && !nutritionGoals.targetFat) && (
                <p className="text-xs text-muted-foreground mt-3 italic">
                  Set nutrition goals in Settings to track your progress
                </p>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* AI Insights Section - Collapsible on mobile */}
      <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
        <div className="rounded-lg bg-muted/30 border border-border/30 overflow-hidden">
          <CollapsibleTrigger className="w-full p-3 min-h-[48px] flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                AI Insights
              </h4>
              {isLoadingInsights && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
              )}
              {aiInsights.length > 0 && !isLoadingInsights && (
                <Badge variant="secondary" className="text-xs ml-2">
                  {aiInsights.length}
                </Badge>
              )}
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              insightsOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3">
              {insightsError ? (
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground">{insightsError}</p>
                </div>
              ) : aiInsights.length > 0 ? (
                <div className="space-y-2">
                  {aiInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border",
                        insight.type === 'positive' && "bg-green-500/10 border-green-500/30",
                        insight.type === 'suggestion' && "bg-blue-500/10 border-blue-500/30",
                        insight.type === 'warning' && "bg-amber-500/10 border-amber-500/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {insight.type === 'positive' && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />}
                        {insight.type === 'suggestion' && <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />}
                        {insight.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-semibold", isMobile ? "text-sm" : "text-base")}>{insight.title}</p>
                          <p className={cn("text-muted-foreground mt-0.5", isMobile ? "text-xs" : "text-sm")}>{insight.description}</p>
                          {insight.actionable && (
                            <p className={cn("font-medium mt-1 text-primary", isMobile ? "text-xs" : "text-sm")}>{insight.actionable}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isLoadingInsights ? (
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-sm text-muted-foreground">
                    Loading insights...
                  </p>
                </div>
              ) : null}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

    </Card>
  );
}

interface NutritionCardProps {
  icon: typeof Flame;
  label: string;
  value: string;
  subtext: string;
  colorClass: string;
}

function NutritionCard({ icon: Icon, label, value, subtext, colorClass }: NutritionCardProps) {
  return (
    <div className="p-2 rounded-lg bg-muted/50 text-center">
      <Icon className={cn("h-4 w-4 mx-auto mb-1", colorClass)} />
      <div className="font-bold text-sm">{value}</div>
      <div className="text-[10px] text-muted-foreground">{subtext}</div>
    </div>
  );
}

interface NutritionProgressBarProps {
  icon: typeof Flame;
  label: string;
  current: number;
  goal: number;
  unit: string;
  colorClass: string;
}

function NutritionProgressBar({ icon: Icon, label, current, goal, unit, colorClass }: NutritionProgressBarProps) {
  const percentage = Math.min(Math.round((current / goal) * 100), 150);

  // Calories: stricter threshold (90-100% is on track, over 100% is "over")
  // Protein/Carbs/Fat: more lenient (90-110% is on track)
  const isCalories = label === 'Calories';
  const onTrackMax = isCalories ? 100 : 110;
  const isOnTarget = percentage >= 90 && percentage <= onTrackMax;
  const isOver = percentage > onTrackMax;
  const isUnder = percentage < 90;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", colorClass.replace('bg-', 'text-'))} />
          <span className="text-base font-semibold">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base">
            <span className="font-bold">{current.toLocaleString()}{unit}</span>
            <span className="text-muted-foreground"> / {goal.toLocaleString()}{unit}</span>
          </span>
          {isOnTarget && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
        </div>
      </div>
      <div className="relative">
        <Progress
          value={Math.min(percentage, 100)}
          className="h-3"
        />
        {/* Custom color overlay */}
        <div
          className={cn("absolute inset-0 h-3 rounded-full transition-all", colorClass)}
          style={{ width: `${Math.min(percentage, 100)}%`, opacity: 0.9 }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{percentage}% of daily goal</span>
        {isOnTarget && <span className="text-green-600 font-medium">On track!</span>}
        {isOver && <span className="text-amber-600 font-medium">Over target</span>}
        {isUnder && <span className="text-muted-foreground/70">{100 - percentage}% to go</span>}
      </div>
    </div>
  );
}
