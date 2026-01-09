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
}

interface AggregatedIngredient {
  item: string;
  quantities: { quantity: number | null; unit: string }[];
}

export function WeeklySummary({ recipes, mealPlanItems, pantryStaples }: WeeklySummaryProps) {
  const summary = useMemo(() => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalPrepTime = 0;
    let totalCookTime = 0;
    let mealsPlanned = 0;
    const ingredientsMap = new Map<string, AggregatedIngredient>();
    const recipesUsed = new Set<string>();

    mealPlanItems.forEach(item => {
      const recipe = recipes.find(r => r.id === item.recipeId);
      if (!recipe) return;

      recipesUsed.add(recipe.id);
      mealsPlanned++;

      // Nutrition
      if (recipe.nutrition) {
        const multiplier = item.servingsMultiplier;
        totalCalories += recipe.nutrition.perServing.calories * recipe.servings * multiplier;
        totalProtein += recipe.nutrition.perServing.protein * recipe.servings * multiplier;
        totalCarbs += recipe.nutrition.perServing.carbs * recipe.servings * multiplier;
        totalFat += recipe.nutrition.perServing.fat * recipe.servings * multiplier;
      }

      // Prep time (only count once per unique recipe)
      if (!recipesUsed.has(recipe.id + '_time')) {
        recipesUsed.add(recipe.id + '_time');
        totalPrepTime += recipe.prepTime || 0;
        totalCookTime += recipe.cookTime || 0;
      }

      // Ingredients
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

    return {
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      totalPrepTime,
      totalCookTime,
      mealsPlanned,
      uniqueRecipes: recipesUsed.size / 2, // Divided by 2 because we also add _time entries
      shoppingList,
      avgCaloriesPerDay: Math.round(totalCalories / 7),
    };
  }, [recipes, mealPlanItems, pantryStaples]);

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
            <span className="text-xs font-medium">Meals Planned</span>
          </div>
          <div className="text-2xl font-bold text-primary">{summary.mealsPlanned}</div>
          <div className="text-xs text-muted-foreground">{Math.round(summary.uniqueRecipes)} recipes</div>
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

      {/* Nutrition Breakdown */}
      <div className="mb-5">
        <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Nutrition Totals
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
            subtext={`~${Math.round(summary.totalProtein / 7)}g/day`}
            colorClass="text-red-500"
          />
          <NutritionCard
            icon={Wheat}
            label="Carbs"
            value={`${summary.totalCarbs}g`}
            subtext={`~${Math.round(summary.totalCarbs / 7)}g/day`}
            colorClass="text-amber-500"
          />
          <NutritionCard
            icon={Droplets}
            label="Fat"
            value={`${summary.totalFat}g`}
            subtext={`~${Math.round(summary.totalFat / 7)}g/day`}
            colorClass="text-blue-500"
          />
        </div>
      </div>

      {/* Shopping List Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Shopping List
          </h4>
          <Badge variant="secondary" className="text-xs">
            {summary.shoppingList.length} items
          </Badge>
        </div>
        
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
