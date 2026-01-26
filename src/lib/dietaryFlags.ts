// Dietary restriction and allergen mappings for shopping list highlighting

export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'soy-free'
  | 'egg-free'
  | 'shellfish-free'
  | 'fish-free';

export type Allergen =
  | 'peanuts'
  | 'tree nuts'
  | 'milk'
  | 'eggs'
  | 'wheat'
  | 'soy'
  | 'fish'
  | 'shellfish'
  | 'sesame';

export const DIETARY_RESTRICTION_LABELS: Record<DietaryRestriction, string> = {
  'vegetarian': 'Vegetarian',
  'vegan': 'Vegan',
  'gluten-free': 'Gluten-Free',
  'dairy-free': 'Dairy-Free',
  'nut-free': 'Nut-Free',
  'soy-free': 'Soy-Free',
  'egg-free': 'Egg-Free',
  'shellfish-free': 'Shellfish-Free',
  'fish-free': 'Fish-Free',
};

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  'peanuts': 'Peanuts',
  'tree nuts': 'Tree Nuts',
  'milk': 'Milk',
  'eggs': 'Eggs',
  'wheat': 'Wheat',
  'soy': 'Soy',
  'fish': 'Fish',
  'shellfish': 'Shellfish',
  'sesame': 'Sesame',
};

// Ingredients that conflict with dietary restrictions
const RESTRICTION_CONFLICTS: Record<DietaryRestriction, string[]> = {
  'vegetarian': [
    'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'bacon', 'ham', 'sausage',
    'steak', 'mince', 'ground beef', 'ground turkey', 'ground pork', 'ground chicken',
    'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'trout', 'halibut', 'anchovy',
    'shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'mussel', 'clam', 'oyster',
    'veal', 'venison', 'bison', 'goat', 'rabbit', 'liver', 'kidney',
    'gelatin', 'lard', 'tallow', 'bone broth', 'chicken broth', 'beef broth',
    'fish sauce', 'worcestershire sauce', 'caesar dressing',
  ],
  'vegan': [
    // All vegetarian conflicts plus...
    'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'bacon', 'ham', 'sausage',
    'steak', 'mince', 'ground beef', 'ground turkey', 'ground pork', 'ground chicken',
    'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'trout', 'halibut', 'anchovy',
    'shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'mussel', 'clam', 'oyster',
    'veal', 'venison', 'bison', 'goat', 'rabbit', 'liver', 'kidney',
    'gelatin', 'lard', 'tallow', 'bone broth', 'chicken broth', 'beef broth',
    'fish sauce', 'worcestershire sauce', 'caesar dressing',
    // Animal products
    'egg', 'eggs', 'milk', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt',
    'sour cream', 'cream cheese', 'cottage cheese', 'ricotta', 'parmesan',
    'mozzarella', 'cheddar', 'feta', 'brie', 'goat cheese', 'blue cheese',
    'whey', 'casein', 'lactose', 'ghee', 'mayo', 'mayonnaise',
    'honey', 'beeswax',
  ],
  'gluten-free': [
    'flour', 'all-purpose flour', 'bread flour', 'cake flour', 'whole wheat flour',
    'wheat', 'bread', 'pasta', 'spaghetti', 'noodle', 'noodles', 'macaroni',
    'penne', 'fettuccine', 'linguine', 'lasagna', 'couscous', 'bulgur',
    'barley', 'rye', 'triticale', 'semolina', 'durum',
    'soy sauce', 'teriyaki sauce', 'hoisin sauce',
    'beer', 'malt', 'malted',
    'seitan', 'vital wheat gluten',
    'cracker', 'crackers', 'breadcrumb', 'breadcrumbs', 'panko',
    'tortilla', 'pita', 'naan', 'bagel', 'croissant', 'biscuit',
    'cereal', 'oat', 'oats', // Note: oats are often cross-contaminated
  ],
  'dairy-free': [
    'milk', 'cream', 'half and half', 'half-and-half', 'buttermilk',
    'butter', 'ghee', 'cheese', 'cheddar', 'mozzarella', 'parmesan',
    'feta', 'brie', 'ricotta', 'cottage cheese', 'cream cheese',
    'goat cheese', 'blue cheese', 'swiss cheese', 'provolone',
    'yogurt', 'yoghurt', 'sour cream', 'whipped cream',
    'ice cream', 'gelato', 'custard',
    'whey', 'casein', 'lactose',
  ],
  'nut-free': [
    'almond', 'almonds', 'cashew', 'cashews', 'walnut', 'walnuts',
    'pecan', 'pecans', 'pistachio', 'pistachios', 'hazelnut', 'hazelnuts',
    'macadamia', 'brazil nut', 'brazil nuts', 'pine nut', 'pine nuts',
    'chestnut', 'chestnuts',
    'almond milk', 'almond butter', 'almond flour',
    'cashew milk', 'cashew butter',
    'hazelnut spread', 'nutella',
    'marzipan', 'praline', 'nougat',
    'peanut', 'peanuts', 'peanut butter', 'peanut oil', // Peanuts are legumes but often grouped
  ],
  'soy-free': [
    'soy', 'soybean', 'soybeans', 'edamame',
    'tofu', 'tempeh', 'miso', 'soy sauce', 'tamari',
    'soy milk', 'soy protein', 'soy lecithin',
    'teriyaki sauce', 'hoisin sauce',
  ],
  'egg-free': [
    'egg', 'eggs', 'egg white', 'egg yolk',
    'mayo', 'mayonnaise', 'aioli',
    'meringue', 'custard', 'hollandaise',
  ],
  'shellfish-free': [
    'shrimp', 'prawn', 'prawns', 'crab', 'lobster',
    'scallop', 'scallops', 'mussel', 'mussels',
    'clam', 'clams', 'oyster', 'oysters',
    'crayfish', 'crawfish', 'langoustine',
    'squid', 'calamari', 'octopus',
  ],
  'fish-free': [
    'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'trout', 'halibut',
    'sardine', 'sardines', 'anchovy', 'anchovies', 'mackerel',
    'herring', 'bass', 'snapper', 'catfish', 'swordfish',
    'fish sauce', 'worcestershire sauce',
  ],
};

// Ingredients that contain specific allergens
const ALLERGEN_INGREDIENTS: Record<Allergen, string[]> = {
  'peanuts': [
    'peanut', 'peanuts', 'peanut butter', 'peanut oil', 'groundnut',
  ],
  'tree nuts': [
    'almond', 'almonds', 'cashew', 'cashews', 'walnut', 'walnuts',
    'pecan', 'pecans', 'pistachio', 'pistachios', 'hazelnut', 'hazelnuts',
    'macadamia', 'brazil nut', 'brazil nuts', 'pine nut', 'pine nuts',
    'chestnut', 'chestnuts',
    'almond milk', 'almond butter', 'almond flour',
    'cashew milk', 'cashew butter',
    'hazelnut spread', 'nutella',
    'marzipan', 'praline', 'nougat',
  ],
  'milk': [
    'milk', 'cream', 'half and half', 'half-and-half', 'buttermilk',
    'butter', 'ghee', 'cheese', 'cheddar', 'mozzarella', 'parmesan',
    'feta', 'brie', 'ricotta', 'cottage cheese', 'cream cheese',
    'goat cheese', 'blue cheese', 'swiss cheese', 'provolone',
    'yogurt', 'yoghurt', 'sour cream', 'whipped cream',
    'ice cream', 'gelato', 'custard',
    'whey', 'casein', 'lactose',
  ],
  'eggs': [
    'egg', 'eggs', 'egg white', 'egg yolk',
    'mayo', 'mayonnaise', 'aioli',
    'meringue', 'custard', 'hollandaise',
  ],
  'wheat': [
    'flour', 'all-purpose flour', 'bread flour', 'cake flour', 'whole wheat flour',
    'wheat', 'bread', 'pasta', 'spaghetti', 'noodle', 'noodles', 'macaroni',
    'penne', 'fettuccine', 'linguine', 'lasagna', 'couscous', 'bulgur',
    'semolina', 'durum',
    'cracker', 'crackers', 'breadcrumb', 'breadcrumbs', 'panko',
    'tortilla', 'pita', 'naan', 'bagel', 'croissant', 'biscuit',
    'seitan', 'vital wheat gluten',
  ],
  'soy': [
    'soy', 'soybean', 'soybeans', 'edamame',
    'tofu', 'tempeh', 'miso', 'soy sauce', 'tamari',
    'soy milk', 'soy protein', 'soy lecithin',
  ],
  'fish': [
    'fish', 'salmon', 'tuna', 'cod', 'tilapia', 'trout', 'halibut',
    'sardine', 'sardines', 'anchovy', 'anchovies', 'mackerel',
    'herring', 'bass', 'snapper', 'catfish', 'swordfish',
    'fish sauce', 'worcestershire sauce',
  ],
  'shellfish': [
    'shrimp', 'prawn', 'prawns', 'crab', 'lobster',
    'scallop', 'scallops', 'mussel', 'mussels',
    'clam', 'clams', 'oyster', 'oysters',
    'crayfish', 'crawfish', 'langoustine',
    'squid', 'calamari', 'octopus',
  ],
  'sesame': [
    'sesame', 'sesame seed', 'sesame seeds', 'sesame oil',
    'tahini', 'halva', 'hummus',
  ],
};

export interface DietaryFlag {
  type: 'restriction' | 'allergen';
  name: string;
  label: string;
}

/**
 * Check an ingredient against dietary restrictions and allergens
 * Returns array of flags that apply to this ingredient
 */
export function checkDietaryFlags(
  ingredientName: string,
  restrictions: DietaryRestriction[],
  allergens: Allergen[]
): DietaryFlag[] {
  const flags: DietaryFlag[] = [];
  const lowerName = ingredientName.toLowerCase();

  // Check dietary restrictions
  for (const restriction of restrictions) {
    const conflicts = RESTRICTION_CONFLICTS[restriction];
    if (conflicts) {
      const hasConflict = conflicts.some(conflict =>
        lowerName.includes(conflict.toLowerCase()) ||
        conflict.toLowerCase().includes(lowerName)
      );
      if (hasConflict) {
        flags.push({
          type: 'restriction',
          name: restriction,
          label: DIETARY_RESTRICTION_LABELS[restriction],
        });
      }
    }
  }

  // Check allergens
  for (const allergen of allergens) {
    const ingredients = ALLERGEN_INGREDIENTS[allergen];
    if (ingredients) {
      const hasAllergen = ingredients.some(ing =>
        lowerName.includes(ing.toLowerCase()) ||
        ing.toLowerCase().includes(lowerName)
      );
      if (hasAllergen) {
        flags.push({
          type: 'allergen',
          name: allergen,
          label: ALLERGEN_LABELS[allergen],
        });
      }
    }
  }

  return flags;
}

/**
 * Get all available dietary restrictions
 */
export function getAllDietaryRestrictions(): { value: DietaryRestriction; label: string }[] {
  return Object.entries(DIETARY_RESTRICTION_LABELS).map(([value, label]) => ({
    value: value as DietaryRestriction,
    label,
  }));
}

/**
 * Get all available allergens
 */
export function getAllAllergens(): { value: Allergen; label: string }[] {
  return Object.entries(ALLERGEN_LABELS).map(([value, label]) => ({
    value: value as Allergen,
    label,
  }));
}
