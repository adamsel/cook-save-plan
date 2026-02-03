import { Ingredient } from '@/types/recipe';

export type FoodGroup = 'produce' | 'protein' | 'grains' | 'dairy' | 'fats' | 'other';

export interface FoodGroupInfo {
  id: FoodGroup;
  label: string;
  emoji: string;
  color: string;
}

export const FOOD_GROUP_INFO: Record<FoodGroup, FoodGroupInfo> = {
  produce: { id: 'produce', label: 'Produce', emoji: '🥬', color: 'text-green-600' },
  protein: { id: 'protein', label: 'Protein', emoji: '🥩', color: 'text-red-600' },
  grains: { id: 'grains', label: 'Grains', emoji: '🌾', color: 'text-amber-600' },
  dairy: { id: 'dairy', label: 'Dairy', emoji: '🥛', color: 'text-blue-500' },
  fats: { id: 'fats', label: 'Fats', emoji: '🫒', color: 'text-yellow-600' },
  other: { id: 'other', label: 'Other', emoji: '🧂', color: 'text-gray-500' },
};

// Keywords for categorizing ingredients into food groups
const FOOD_GROUP_KEYWORDS: Record<FoodGroup, string[]> = {
  produce: [
    // Vegetables
    'spinach', 'lettuce', 'kale', 'arugula', 'cabbage', 'broccoli', 'cauliflower',
    'carrot', 'celery', 'onion', 'garlic', 'tomato', 'pepper', 'bell pepper',
    'zucchini', 'squash', 'cucumber', 'eggplant', 'mushroom', 'asparagus',
    'green bean', 'pea', 'corn', 'potato', 'sweet potato', 'beet', 'radish',
    'turnip', 'parsnip', 'leek', 'scallion', 'shallot', 'ginger', 'fennel',
    'artichoke', 'brussels sprout', 'bok choy', 'watercress', 'sprout',
    // Fruits
    'apple', 'banana', 'orange', 'lemon', 'lime', 'grapefruit', 'berry',
    'strawberry', 'blueberry', 'raspberry', 'blackberry', 'grape', 'cherry',
    'peach', 'plum', 'apricot', 'nectarine', 'mango', 'pineapple', 'papaya',
    'melon', 'watermelon', 'cantaloupe', 'honeydew', 'kiwi', 'pear', 'fig',
    'date', 'pomegranate', 'passion fruit', 'coconut', 'avocado',
    // Herbs
    'basil', 'parsley', 'cilantro', 'mint', 'dill', 'thyme', 'rosemary',
    'oregano', 'sage', 'chive', 'tarragon',
  ],
  protein: [
    // Meat
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal', 'venison',
    'steak', 'ground beef', 'ground turkey', 'ground pork', 'bacon', 'ham',
    'sausage', 'prosciutto', 'pancetta', 'chorizo', 'salami',
    // Seafood
    'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'trout', 'bass',
    'snapper', 'mahi', 'swordfish', 'sardine', 'anchovy', 'mackerel',
    'shrimp', 'prawn', 'lobster', 'crab', 'scallop', 'mussel', 'clam',
    'oyster', 'calamari', 'squid', 'octopus',
    // Eggs & Plant protein
    'egg', 'tofu', 'tempeh', 'seitan', 'edamame',
    // Legumes
    'bean', 'black bean', 'kidney bean', 'pinto bean', 'navy bean', 'chickpea',
    'lentil', 'split pea', 'hummus',
  ],
  grains: [
    'rice', 'white rice', 'brown rice', 'jasmine rice', 'basmati rice',
    'wild rice', 'arborio', 'risotto',
    'pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'macaroni',
    'rigatoni', 'lasagna', 'noodle', 'ramen', 'udon', 'soba',
    'bread', 'baguette', 'ciabatta', 'sourdough', 'pita', 'naan', 'tortilla',
    'wrap', 'roll', 'bun', 'bagel', 'croissant', 'muffin', 'biscuit',
    'flour', 'all-purpose flour', 'bread flour', 'whole wheat flour',
    'oat', 'oatmeal', 'granola', 'cereal', 'barley', 'farro', 'bulgur',
    'quinoa', 'couscous', 'polenta', 'cornmeal', 'grits',
    'cracker', 'breadcrumb', 'panko',
  ],
  dairy: [
    'milk', 'whole milk', 'skim milk', 'cream', 'heavy cream', 'half and half',
    'sour cream', 'buttermilk', 'evaporated milk', 'condensed milk',
    'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'gouda', 'brie',
    'swiss', 'provolone', 'ricotta', 'cottage cheese', 'cream cheese',
    'goat cheese', 'blue cheese', 'gorgonzola', 'gruyere', 'manchego',
    'yogurt', 'greek yogurt', 'kefir',
    'butter', 'ghee', 'margarine',
    'ice cream', 'gelato', 'whipped cream',
  ],
  fats: [
    'oil', 'olive oil', 'vegetable oil', 'canola oil', 'coconut oil',
    'sesame oil', 'peanut oil', 'avocado oil', 'sunflower oil', 'corn oil',
    'nut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut',
    'macadamia', 'pine nut', 'peanut',
    'seed', 'sunflower seed', 'pumpkin seed', 'sesame seed', 'chia seed',
    'flax seed', 'hemp seed',
    'peanut butter', 'almond butter', 'tahini',
    'mayonnaise', 'aioli',
  ],
  other: [], // Catch-all for unmatched ingredients
};

/**
 * Categorize a single ingredient into a food group
 */
export function categorizeIngredient(ingredient: string): FoodGroup {
  const lowerIngredient = ingredient.toLowerCase().trim();

  for (const [group, keywords] of Object.entries(FOOD_GROUP_KEYWORDS)) {
    if (group === 'other') continue;

    for (const keyword of keywords) {
      if (lowerIngredient.includes(keyword) || keyword.includes(lowerIngredient)) {
        return group as FoodGroup;
      }
    }
  }

  return 'other';
}

/**
 * Analyze ingredients and return diversity metrics
 */
export interface DiversityAnalysis {
  totalUniqueIngredients: number;
  byFoodGroup: Record<FoodGroup, string[]>;
  foodGroupCounts: Record<FoodGroup, number>;
  coveredGroups: FoodGroup[];
  missingGroups: FoodGroup[];
  diversityScore: number; // 0-100
}

export function analyzeIngredientDiversity(ingredients: Ingredient[]): DiversityAnalysis {
  const uniqueIngredients = new Set<string>();
  const byFoodGroup: Record<FoodGroup, Set<string>> = {
    produce: new Set(),
    protein: new Set(),
    grains: new Set(),
    dairy: new Set(),
    fats: new Set(),
    other: new Set(),
  };

  // Categorize each ingredient
  for (const ing of ingredients) {
    const item = ing.item.toLowerCase().trim();
    if (!item) continue;

    uniqueIngredients.add(item);
    const group = categorizeIngredient(item);
    byFoodGroup[group].add(item);
  }

  // Convert sets to arrays and count
  const byFoodGroupArrays: Record<FoodGroup, string[]> = {
    produce: Array.from(byFoodGroup.produce),
    protein: Array.from(byFoodGroup.protein),
    grains: Array.from(byFoodGroup.grains),
    dairy: Array.from(byFoodGroup.dairy),
    fats: Array.from(byFoodGroup.fats),
    other: Array.from(byFoodGroup.other),
  };

  const foodGroupCounts: Record<FoodGroup, number> = {
    produce: byFoodGroup.produce.size,
    protein: byFoodGroup.protein.size,
    grains: byFoodGroup.grains.size,
    dairy: byFoodGroup.dairy.size,
    fats: byFoodGroup.fats.size,
    other: byFoodGroup.other.size,
  };

  // Determine covered/missing groups (excluding 'other')
  const mainGroups: FoodGroup[] = ['produce', 'protein', 'grains', 'dairy', 'fats'];
  const coveredGroups = mainGroups.filter(g => foodGroupCounts[g] > 0);
  const missingGroups = mainGroups.filter(g => foodGroupCounts[g] === 0);

  // Calculate diversity score
  // Formula: (covered groups / 5) * 60 + (min(unique ingredients, 30) / 30) * 40
  const groupCoverage = (coveredGroups.length / 5) * 60;
  const ingredientVariety = (Math.min(uniqueIngredients.size, 30) / 30) * 40;
  const diversityScore = Math.round(groupCoverage + ingredientVariety);

  return {
    totalUniqueIngredients: uniqueIngredients.size,
    byFoodGroup: byFoodGroupArrays,
    foodGroupCounts,
    coveredGroups,
    missingGroups,
    diversityScore,
  };
}
