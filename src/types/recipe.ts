export interface Ingredient {
  id: string;
  item: string;
  quantity: number | null;
  unit: string;
  notes?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanItem {
  id: string;
  recipeId: string;
  day: string; // 'monday', 'tuesday', etc.
  mealSlot: 'breakfast' | 'lunch' | 'dinner';
  servingsMultiplier: number;
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

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const;
export type MealSlot = typeof MEAL_SLOTS[number];

export const DEFAULT_CATEGORIES = [
  'Main Course',
  'Side Dish',
  'Appetizer',
  'Salad',
  'Soup',
  'Breakfast',
  'Dessert',
  'Beverage',
  'Snack',
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
  'butter',
  'garlic',
  'onion',
  'sugar',
  'flour',
  'water'
];
