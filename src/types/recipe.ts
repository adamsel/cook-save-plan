export interface Ingredient {
  id: string;
  item: string;
  quantity: number | null;
  unit: string;
  notes?: string;
}

export type ImportMethod = 'schema' | 'dom' | 'text' | 'manual';
export type ParsingConfidence = 'high' | 'medium' | 'low';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type NutritionSource = 'provided_by_site' | 'ai_estimate' | 'manual';
export type NutritionConfidence = 'High' | 'Medium' | 'Low';

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  cholesterol?: number;
}

export interface RecipeNutrition {
  perServing: NutritionInfo;
  source: NutritionSource;
  confidence: NutritionConfidence;
  notes?: string;
  verified?: boolean; // false if calories > 1500/serving (likely inaccurate)
}

export interface Recipe {
  id: string;
  title: string;
  sourceUrl?: string;
  imageUrl?: string;
  description?: string;
  category: string;
  tags: string[];
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  isFavorite: boolean;
  isArchived: boolean;
  isPublic?: boolean; // Whether recipe is publicly viewable
  createdAt: string;
  updatedAt: string;
  // Import tracking
  importMethod?: ImportMethod;
  rawImportSnapshot?: string;
  cuisine?: string;
  dietary?: string[];
  mealTypes?: MealType[];
  author?: string;
  // Nutrition
  nutrition?: RecipeNutrition;
  // Computed: true if data quality issues detected
  dataQualityWarning?: boolean;
}

// Recipe sharing types
export interface RecipeShare {
  id: string;
  shared_with_user_id: string;
  can_edit: boolean;
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
}

export interface PendingShare {
  id: string;
  invited_email: string;
  can_edit: boolean;
  created_at: string;
}

// Recipe linking types ("Goes with" feature)
export type RecipeLinkType = 'goes_with' | 'component' | 'variation' | 'side';

// Ingredient replacement - which ingredient from linked recipe replaces one from main recipe
export interface IngredientReplacement {
  linkedIngredientId: string;    // Ingredient ID from the linked recipe
  replacesIngredientId: string;  // Ingredient ID from the main recipe it replaces
  notes?: string;                // Optional note (e.g., "Homemade version")
}

export interface RecipeLink {
  id: string;
  recipeId: string;
  linkedRecipeId: string;
  linkType: RecipeLinkType;
  createdAt: string;
  userId: string;
  replacements?: IngredientReplacement[];  // Which ingredients the linked recipe replaces
  // Joined data when fetching
  linkedRecipe?: Recipe;
}

// Entry for custom leftover position (stored as JSON in meal_plan_items)
export interface LeftoverPositionEntry {
  index: number; // Which leftover (0 = first, 1 = second, etc.)
  day: string;   // Target day
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'; // Target slot
}

export type EventType = 'potluck' | 'guests' | 'takeaway';

export interface MealPlanItem {
  id: string;
  recipeId: string;
  day: string; // 'monday', 'tuesday', etc.
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servingsMultiplier: number;
  leftoverMeals: number; // Number of additional meals (leftovers) this provides
  notes?: string;
  leftoverPositions?: LeftoverPositionEntry[]; // Custom positions for leftovers
  // Event fields for potlucks, guests, etc.
  eventType?: EventType | null;
  guestCount?: number | null; // Overrides household size for ingredient scaling
  eventNote?: string | null; // e.g., "Desert BBQ"
  // Virtual field for display - not stored in DB
  isLeftover?: boolean;
  sourceItemId?: string; // Links leftover to its source meal
}

// Calculated meal info for display
export interface MealServingsInfo {
  baseServings: number; // Recipe's base servings
  plannedServings: number; // baseServings * multiplier
  leftoverMeals: number;
  totalMeals: number; // 1 (primary) + leftoverMeals
}

// Display item that includes both real items and virtual leftover cards
export interface DisplayMealItem {
  item: MealPlanItem;
  recipe: Recipe;
  isLeftover: boolean;
  sourceItem?: MealPlanItem; // The original item this leftover comes from
  leftoverIndex?: number; // Which leftover this is (0, 1, 2...)
}

export interface MealPlan {
  id: string;
  weekStartDate: string; // ISO date string
  items: MealPlanItem[];
}

export interface ShoppingListItem {
  id: string;
  ingredient: string;
  quantity: number | null;
  unit: string;
  recipeIds: string[];
  checked: boolean;
  category: string;
  isCustom: boolean;
}

export interface AppState {
  recipes: Recipe[];
  mealPlans: MealPlan[];
  categories: string[];
  tags: string[];
  pantryStaples: string[];
  aisleCategories: string[];
}

export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export const MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type MealSlot = typeof MEAL_SLOTS[number];

export const DEFAULT_CATEGORIES = [
  'Side Dish',
  'Appetizer',
  'Salad',
  'Soup',
  'Dessert',
  'Beverage',
  'Other'
];

export const DEFAULT_AISLE_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Pantry',
  'Frozen',
  'Bakery',
  'Spices & Seasonings',
  'Condiments',
  'Beverages',
  'Other'
];

export const DEFAULT_PANTRY_STAPLES = [
  'salt',
  'pepper',
  'olive oil',
  'vegetable oil',
  'neutral oil',
  'butter',
  'garlic',
  'onion',
  'sugar',
  'flour',
  'water',
  'ice',
];
