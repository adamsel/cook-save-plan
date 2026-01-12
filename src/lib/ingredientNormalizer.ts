// Ingredient normalization utilities for smart merging

// Mapping of ingredient variations to their canonical form
const INGREDIENT_ALIASES: Record<string, string> = {
  // Eggs
  'eggs': 'egg',
  'large eggs': 'egg',
  'large egg': 'egg',
  'medium eggs': 'egg',
  'medium egg': 'egg',
  'whole eggs': 'egg',
  'whole egg': 'egg',
  
  // Flour variations
  'all-purpose flour': 'flour',
  'all purpose flour': 'flour',
  'ap flour': 'flour',
  'plain flour': 'flour',
  'white flour': 'flour',
  
  // Butter variations
  'unsalted butter': 'butter',
  'salted butter': 'butter',
  'softened butter': 'butter',
  'melted butter': 'butter',
  'cold butter': 'butter',
  
  // Sugar variations
  'granulated sugar': 'sugar',
  'white sugar': 'sugar',
  'caster sugar': 'sugar',
  'superfine sugar': 'sugar',
  
  // Milk variations
  'whole milk': 'milk',
  'skim milk': 'milk',
  '2% milk': 'milk',
  'low-fat milk': 'milk',
  
  // Onion variations
  'onions': 'onion',
  'yellow onion': 'onion',
  'yellow onions': 'onion',
  'white onion': 'onion',
  'white onions': 'onion',
  'sweet onion': 'onion',
  'sweet onions': 'onion',
  
  // Garlic variations
  'garlic cloves': 'garlic',
  'garlic clove': 'garlic',
  'cloves garlic': 'garlic',
  'clove garlic': 'garlic',
  'minced garlic': 'garlic',
  'fresh garlic': 'garlic',
  
  // Tomato variations
  'tomatoes': 'tomato',
  'roma tomatoes': 'tomato',
  'roma tomato': 'tomato',
  'cherry tomatoes': 'cherry tomato',
  'grape tomatoes': 'cherry tomato',
  
  // Pepper variations
  'bell pepper': 'bell pepper',
  'bell peppers': 'bell pepper',
  'red bell pepper': 'red bell pepper',
  'red bell peppers': 'red bell pepper',
  'green bell pepper': 'green bell pepper',
  'green bell peppers': 'green bell pepper',
  
  // Potato variations
  'potatoes': 'potato',
  'russet potatoes': 'potato',
  'russet potato': 'potato',
  'yukon gold potatoes': 'potato',
  'yukon gold potato': 'potato',
  
  // Carrot variations
  'carrots': 'carrot',
  'large carrots': 'carrot',
  'large carrot': 'carrot',
  'baby carrots': 'carrot',
  
  // Celery variations
  'celery stalks': 'celery',
  'celery stalk': 'celery',
  'stalks celery': 'celery',
  'stalk celery': 'celery',
  
  // Lemon/Lime
  'lemons': 'lemon',
  'fresh lemon': 'lemon',
  'lemon juice': 'lemon juice',
  'fresh lemon juice': 'lemon juice',
  'limes': 'lime',
  'fresh lime': 'lime',
  'lime juice': 'lime juice',
  'fresh lime juice': 'lime juice',
  
  // Oil variations
  'olive oil': 'olive oil',
  'extra virgin olive oil': 'olive oil',
  'extra-virgin olive oil': 'olive oil',
  'evoo': 'olive oil',
  'vegetable oil': 'vegetable oil',
  'canola oil': 'vegetable oil',
  
  // Chicken variations
  'chicken breasts': 'chicken breast',
  'boneless chicken breasts': 'chicken breast',
  'boneless skinless chicken breasts': 'chicken breast',
  'boneless, skinless chicken breasts': 'chicken breast',
  'chicken thighs': 'chicken thigh',
  'boneless chicken thighs': 'chicken thigh',
  'boneless skinless chicken thighs': 'chicken thigh',
  
  // Cheese variations
  'parmesan cheese': 'parmesan',
  'parmigiano reggiano': 'parmesan',
  'parmigiano-reggiano': 'parmesan',
  'grated parmesan': 'parmesan',
  'shredded parmesan': 'parmesan',
  'cheddar cheese': 'cheddar',
  'shredded cheddar': 'cheddar',
  'shredded cheddar cheese': 'cheddar',
  'mozzarella cheese': 'mozzarella',
  'shredded mozzarella': 'mozzarella',
  
  // Cream variations
  'heavy cream': 'heavy cream',
  'heavy whipping cream': 'heavy cream',
  'whipping cream': 'heavy cream',
  
  // Broth/Stock
  'chicken broth': 'chicken broth',
  'chicken stock': 'chicken broth',
  'beef broth': 'beef broth',
  'beef stock': 'beef broth',
  'vegetable broth': 'vegetable broth',
  'vegetable stock': 'vegetable broth',
  
  // Herbs
  'fresh parsley': 'parsley',
  'chopped parsley': 'parsley',
  'flat-leaf parsley': 'parsley',
  'italian parsley': 'parsley',
  'fresh cilantro': 'cilantro',
  'chopped cilantro': 'cilantro',
  'fresh basil': 'basil',
  'basil leaves': 'basil',
  'fresh basil leaves': 'basil',
  'fresh thyme': 'thyme',
  'thyme leaves': 'thyme',
  'fresh rosemary': 'rosemary',
  'rosemary leaves': 'rosemary',
  
  // Salt/Pepper
  'kosher salt': 'salt',
  'sea salt': 'salt',
  'table salt': 'salt',
  'fine salt': 'salt',
  'black pepper': 'pepper',
  'ground black pepper': 'pepper',
  'freshly ground black pepper': 'pepper',
  'ground pepper': 'pepper',
  
  // Pasta
  'spaghetti noodles': 'spaghetti',
  'penne pasta': 'penne',
  'rigatoni pasta': 'rigatoni',
  'fettuccine noodles': 'fettuccine',
  
  // Rice
  'white rice': 'rice',
  'long grain rice': 'rice',
  'long-grain rice': 'rice',
  'jasmine rice': 'rice',
  'basmati rice': 'basmati rice',
  
  // Bread
  'bread crumbs': 'breadcrumbs',
  'panko bread crumbs': 'panko breadcrumbs',
  'panko breadcrumbs': 'panko breadcrumbs',
};

// Pluralization rules for common ingredient endings
const PLURAL_RULES: Array<{ plural: RegExp; singular: string }> = [
  { plural: /ies$/i, singular: 'y' },
  { plural: /oes$/i, singular: 'o' },
  { plural: /ves$/i, singular: 'f' },
  { plural: /es$/i, singular: '' },
  { plural: /s$/i, singular: '' },
];

/**
 * Normalizes an ingredient name to its canonical form
 */
export function normalizeIngredient(ingredient: string): string {
  const lower = ingredient.toLowerCase().trim();
  
  // First check exact alias match
  if (INGREDIENT_ALIASES[lower]) {
    return INGREDIENT_ALIASES[lower];
  }
  
  // Try to singularize
  let singularized = lower;
  for (const rule of PLURAL_RULES) {
    if (rule.plural.test(lower)) {
      const potential = lower.replace(rule.plural, rule.singular);
      // Check if singularized version has an alias
      if (INGREDIENT_ALIASES[potential]) {
        return INGREDIENT_ALIASES[potential];
      }
      singularized = potential;
      break;
    }
  }
  
  // Return singularized or original lowercase
  return singularized;
}

/**
 * Gets a normalized key for ingredient grouping
 */
export function getIngredientKey(ingredient: string): string {
  return normalizeIngredient(ingredient);
}

/**
 * Gets the display name for a normalized ingredient
 * Uses the most common/preferred form
 */
export function getDisplayName(normalizedKey: string, originalNames: string[]): string {
  // Prefer shortest name that isn't just a single word if we have modifiers
  if (originalNames.length > 0) {
    // Sort by length and return shortest
    const sorted = [...originalNames].sort((a, b) => a.length - b.length);
    return sorted[0];
  }
  return normalizedKey;
}
