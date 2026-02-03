import { Ingredient } from '@/types/recipe';

// Keywords that suggest certain categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Side Dish': ['side', 'rice', 'potatoes', 'vegetables', 'beans', 'coleslaw', 'slaw'],
  'Appetizer': ['appetizer', 'starter', 'dip', 'spread', 'bruschetta', 'crostini', 'bite', 'finger food'],
  'Salad': ['salad', 'slaw', 'greens', 'vinaigrette'],
  'Soup': ['soup', 'stew', 'chowder', 'bisque', 'broth', 'chili'],
  'Breakfast': ['breakfast', 'brunch', 'eggs', 'pancake', 'waffle', 'oatmeal', 'omelet', 'french toast', 'muffin', 'smoothie', 'granola'],
  'Dessert': ['dessert', 'cake', 'cookie', 'brownie', 'pie', 'tart', 'ice cream', 'pudding', 'chocolate', 'sweet', 'cheesecake', 'cupcake', 'pastry'],
  'Beverage': ['drink', 'beverage', 'cocktail', 'smoothie', 'juice', 'tea', 'coffee', 'lemonade', 'mocktail'],
  'Snack': ['snack', 'popcorn', 'chips', 'nuts', 'trail mix', 'energy bar', 'crackers'],
};

// Keywords that suggest certain tags
const TAG_KEYWORDS: Record<string, string[]> = {
  'Quick': ['quick', 'easy', 'fast', 'simple', 'minute', '15-minute', '20-minute', '30-minute'],
  'Healthy': ['healthy', 'light', 'low-calorie', 'nutritious', 'clean', 'lean'],
  'Vegetarian': ['vegetarian', 'veggie', 'meatless', 'plant-based'],
  'Vegan': ['vegan', 'plant-based', 'dairy-free'],
  'Comfort Food': ['comfort', 'classic', 'homestyle', 'cozy', 'hearty', 'homemade'],
  'Italian': ['italian', 'pasta', 'pizza', 'risotto', 'lasagna', 'gnocchi', 'marinara', 'parmigiana', 'bolognese'],
  'Mexican': ['mexican', 'taco', 'burrito', 'enchilada', 'quesadilla', 'salsa', 'guacamole', 'fajita'],
  'Asian': ['asian', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'wok', 'stir-fry', 'soy sauce', 'teriyaki', 'sushi'],
  'Mediterranean': ['mediterranean', 'greek', 'hummus', 'falafel', 'tzatziki', 'olive oil'],
  'Indian': ['indian', 'curry', 'masala', 'tikka', 'naan', 'biryani', 'tandoori', 'dal'],
  'Gluten-Free': ['gluten-free', 'gf', 'celiac'],
  'Dairy-Free': ['dairy-free', 'non-dairy', 'lactose-free'],
  'Keto': ['keto', 'ketogenic', 'low-carb', 'low carb'],
  'Spicy': ['spicy', 'hot', 'chili', 'jalapeño', 'habanero', 'cayenne', 'sriracha'],
  'Grilled': ['grilled', 'bbq', 'barbecue', 'grill'],
  'Baked': ['baked', 'roasted', 'oven'],
  'One-Pot': ['one-pot', 'one pot', 'one-pan', 'one pan', 'sheet pan', 'instant pot'],
  'Slow Cooker': ['slow cooker', 'crockpot', 'crock pot'],
  'Chicken': ['chicken'],
  'Beef': ['beef', 'steak', 'ground beef'],
  'Seafood': ['seafood', 'fish', 'shrimp', 'salmon', 'tuna', 'lobster', 'crab'],
  'Pasta': ['pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'noodle'],
  'Soup': ['soup', 'stew', 'chowder'],
  'Salad': ['salad'],
  'Dessert': ['dessert', 'cake', 'cookie', 'sweet'],
};

// Meal type suggestions based on recipe characteristics
const MEAL_TYPE_KEYWORDS: Record<string, string[]> = {
  'Breakfast': ['breakfast', 'brunch', 'morning', 'eggs', 'pancake', 'waffle', 'oatmeal', 'granola', 'muffin', 'bagel'],
  'Lunch': ['lunch', 'sandwich', 'wrap', 'salad', 'quick', 'light'],
  'Dinner': ['dinner', 'supper', 'main course', 'entree', 'roast', 'steak', 'casserole'],
  'Snack': ['snack', 'appetizer', 'bite-sized', 'finger food', 'dip'],
};

interface RecipeSuggestions {
  category: string | null;
  tags: string[];
  mealTypes: string[];
}

export function suggestCategorization(
  title: string,
  description: string | undefined,
  ingredients: Ingredient[]
): RecipeSuggestions {
  // Combine all text for analysis
  const allText = [
    title,
    description || '',
    ...ingredients.map(i => i.item),
  ].join(' ').toLowerCase();
  
  // Suggest category
  let suggestedCategory: string | null = null;
  let highestCategoryScore = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => allText.includes(kw.toLowerCase())).length;
    if (score > highestCategoryScore) {
      highestCategoryScore = score;
      suggestedCategory = category;
    }
  }
  
  // Suggest tags (can have multiple)
  const suggestedTags: string[] = [];
  
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    const hasMatch = keywords.some(kw => allText.includes(kw.toLowerCase()));
    if (hasMatch) {
      suggestedTags.push(tag);
    }
  }
  
  // Limit to most relevant tags (max 5)
  const limitedTags = suggestedTags.slice(0, 5);
  
  // Suggest meal types
  const suggestedMealTypes: string[] = [];
  
  for (const [mealType, keywords] of Object.entries(MEAL_TYPE_KEYWORDS)) {
    const hasMatch = keywords.some(kw => allText.includes(kw.toLowerCase()));
    if (hasMatch) {
      suggestedMealTypes.push(mealType);
    }
  }
  
  return {
    category: suggestedCategory,
    tags: limitedTags,
    mealTypes: suggestedMealTypes,
  };
}

// Get all available suggestion tags (for the UI)
export function getAllSuggestionTags(): string[] {
  return Object.keys(TAG_KEYWORDS).sort();
}
