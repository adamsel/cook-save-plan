import { useMemo } from 'react';
import { Recipe, MealPlanItem, DAYS_OF_WEEK, MEAL_SLOTS, Ingredient } from '@/types/recipe';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Flame, 
  Beef, 
  Wheat, 
  Droplets, 
  Clock, 
  ShoppingCart,
  ChefHat,
  TrendingUp,
  Utensils
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

        // Add primary meal nutrition to its day
        if (dailyNutrition[item.day]) {
          dailyNutrition[item.day].calories += caloriesPerMeal;
          dailyNutrition[item.day].protein += proteinPerMeal;
          dailyNutrition[item.day].carbs += carbsPerMeal;
          dailyNutrition[item.day].fat += fatPerMeal;
        }

        // Add leftover meals nutrition to their respective days
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
            dailyNutrition[targetDay].calories += caloriesPerMeal;
            dailyNutrition[targetDay].protein += proteinPerMeal;
            dailyNutrition[targetDay].carbs += carbsPerMeal;
            dailyNutrition[targetDay].fat += fatPerMeal;
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

    // Calculate per-person values by dividing by household size
    const perPersonCalories = Math.round(totalCalories / householdSize);
    const perPersonProtein = Math.round(totalProtein / householdSize);
    const perPersonCarbs = Math.round(totalCarbs / householdSize);
    const perPersonFat = Math.round(totalFat / householdSize);

    // Daily average based on days that have meals (more accurate than dividing by 7)
    const avgDivisor = daysWithMeals > 0 ? daysWithMeals : 7;

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
      uniqueRecipes: recipesUsed.size / 2,
      shoppingList,
      avgCaloriesPerDay: Math.round(perPersonCalories / avgDivisor),
      avgProteinPerDay: Math.round(perPersonProtein / avgDivisor),
      avgCarbsPerDay: Math.round(perPersonCarbs / avgDivisor),
      avgFatPerDay: Math.round(perPersonFat / avgDivisor),
      mealSummaryText: getMealSummaryText(),
      mealSlotCounts,
      daysWithMeals,
    };
  }, [recipes, mealPlanItems, pantryStaples, householdSize]);

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
    <Card className="p-5 bg-card border-border/50 shadow-sm">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Weekly Summary
      </h3>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Utensils className="h-4 w-4" />
            <span className="text-xs font-medium">Total Meals</span>
          </div>
          <div className="text-2xl font-bold text-primary">{summary.totalMealsIncludingLeftovers}</div>
          <div className="text-xs text-muted-foreground">
            {summary.mealsPlanned} cooked{summary.leftoverMealsCount > 0 && ` + ${summary.leftoverMealsCount} leftovers`}
          </div>
        </div>
        
        <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
          <div className="flex items-center gap-2 text-accent-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Total Prep Time</span>
          </div>
          <div className="text-2xl font-bold">{Math.round((summary.totalPrepTime + summary.totalCookTime) / 60)}h</div>
          <div className="text-xs text-muted-foreground">{summary.totalPrepTime + summary.totalCookTime} min total</div>
        </div>
      </div>

      {/* Meal Summary Text */}
      {summary.mealSummaryText && (
        <div className="mb-5 p-3 rounded-lg bg-muted/30 border border-border/30">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">This week:</span>{' '}
            {summary.mealSummaryText}
          </p>
        </div>
      )}

      {/* Nutrition Breakdown */}
      <div className="mb-5">
        <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Nutrition (Per Person)
        </h4>
        <div className="grid grid-cols-4 gap-2">
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
      </div>

      {/* Shopping List Preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Shopping List
          </h4>
          <Badge variant="secondary" className="text-xs">
            {summary.shoppingList.length} items
          </Badge>
        </div>
        
        {/* Calculation basis */}
        <p className="text-xs text-muted-foreground mb-3 italic">
          Based on {summary.mealSummaryText || 'your planned meals'}
        </p>
        
        <ScrollArea className="h-[180px]">
          <div className="space-y-1 pr-3">
            {summary.shoppingList.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm capitalize">{item.item}</span>
                <span className="text-xs text-muted-foreground font-medium">{item.display}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
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
