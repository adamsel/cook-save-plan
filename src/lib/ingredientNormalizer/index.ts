// Main ingredient normalization module
// Combines alias mapping, unit conversion, and smart merging

import { INGREDIENT_ALIASES, DESCRIPTORS_TO_REMOVE } from './aliases';
import {
  normalizeUnit,
  toBaseUnits,
  areUnitsCompatible,
  formatQuantity,
  formatQuantityString,
  getUnitInfo,
  convertVolumeToWeight,
  shouldPreferWeight,
  type NormalizedQuantity
} from './unitConversion';

export { normalizeUnit, formatQuantityString } from './unitConversion';

// Pluralization rules for singularizing ingredients
const PLURAL_RULES: Array<{ plural: RegExp; singular: string }> = [
  { plural: /ies$/i, singular: 'y' },
  { plural: /ves$/i, singular: 'fe' },
  { plural: /oes$/i, singular: 'o' },
  { plural: /es$/i, singular: '' },
  { plural: /s$/i, singular: '' },
];

/**
 * Remove descriptive words that don't affect shopping
 */
function removeDescriptors(ingredient: string): string {
  let result = ingredient.toLowerCase();
  
  // Remove parenthetical content
  result = result.replace(/\([^)]*\)/g, '');
  
  // Remove descriptors (as whole words)
  for (const descriptor of DESCRIPTORS_TO_REMOVE) {
    const regex = new RegExp(`\\b${descriptor}\\b`, 'gi');
    result = result.replace(regex, '');
  }
  
  // Clean up extra spaces and commas
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/,\s*$/g, '');
  result = result.replace(/^\s*,/g, '');
  result = result.replace(/\s+/g, ' ');
  
  return result.trim();
}

/**
 * Singularize a word using basic rules
 */
function singularize(word: string): string {
  for (const rule of PLURAL_RULES) {
    if (rule.plural.test(word)) {
      return word.replace(rule.plural, rule.singular);
    }
  }
  return word;
}

/**
 * Get the canonical form of an ingredient name
 */
export function normalizeIngredient(ingredient: string): string {
  // First remove descriptors
  let normalized = removeDescriptors(ingredient);
  
  // Check for exact alias match
  if (INGREDIENT_ALIASES[normalized]) {
    return INGREDIENT_ALIASES[normalized];
  }
  
  // Try singularized version
  const singularized = singularize(normalized);
  if (INGREDIENT_ALIASES[singularized]) {
    return INGREDIENT_ALIASES[singularized];
  }
  
  // Try each word singularized
  const words = normalized.split(' ');
  const singularizedWords = words.map(w => singularize(w));
  const singularizedPhrase = singularizedWords.join(' ');
  
  if (INGREDIENT_ALIASES[singularizedPhrase]) {
    return INGREDIENT_ALIASES[singularizedPhrase];
  }
  
  // Return the cleaned, singularized form
  return singularizedPhrase || normalized || ingredient.toLowerCase().trim();
}

/**
 * Get a key for grouping ingredients (used for merging)
 */
export function getIngredientKey(ingredient: string): string {
  return normalizeIngredient(ingredient);
}

/**
 * Get a display-friendly name for a normalized ingredient
 */
export function getDisplayName(normalizedKey: string, originalNames: string[]): string {
  if (originalNames.length === 0) return normalizedKey;
  
  // Prefer the shortest, simplest name
  const sorted = [...originalNames].sort((a, b) => {
    // Prefer names without parentheses
    const aHasParens = a.includes('(');
    const bHasParens = b.includes('(');
    if (aHasParens !== bHasParens) return aHasParens ? 1 : -1;
    
    // Then prefer shorter names
    return a.length - b.length;
  });
  
  // Capitalize first letter
  const name = sorted[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Source tracking for recipe attribution
export interface IngredientSource {
  recipeId: string;
  amount: string; // e.g., "2 cups", "100g"
}

// Types for merged shopping list items
export interface MergedIngredient {
  key: string;
  displayName: string;
  originalNames: string[];
  quantities: MergedQuantity[];
  totalDisplay: string;
  recipeIds: string[];
  sources: IngredientSource[]; // Track amount from each recipe
  category: string;
  alternatives: string[];  // e.g., ["almond butter"] for "peanut butter or almond butter"
  alternativeNote?: string; // e.g., "butter already on list" for "coconut oil or butter"
}

/**
 * Parse "or" alternatives from ingredient strings
 * Examples:
 *   "peanut butter or almond butter" → { primary: "peanut butter", alternatives: ["almond butter"] }
 *   "coconut oil (or butter)" → { primary: "coconut oil", alternatives: ["butter"] }
 */
function parseAlternatives(item: string): { primary: string; alternatives: string[] } {
  // Match patterns like "X or Y" or "X (or Y)"
  const orMatch = item.match(/^(.+?)\s+(?:\()?or\s+(.+?)(?:\))?$/i);
  if (orMatch) {
    return {
      primary: orMatch[1].trim(),
      alternatives: [orMatch[2].trim()]
    };
  }
  return { primary: item, alternatives: [] };
}

export interface MergedQuantity {
  value: number;
  unit: string;
  type: 'volume' | 'weight' | 'count' | 'container' | 'unknown';
}

export interface RawIngredientInput {
  item: string;
  quantity: number | null;
  unit: string;
  recipeId: string;
  servingsMultiplier?: number;
}

/**
 * Merge multiple ingredients into a combined shopping list
 */
export function mergeIngredients(inputs: RawIngredientInput[]): MergedIngredient[] {
  // Group by normalized ingredient name
  const groups = new Map<string, {
    originalNames: Set<string>;
    quantities: Map<string, NormalizedQuantity & { count: number }>;
    recipeIds: Set<string>;
    sources: IngredientSource[];
    alternatives: Set<string>;
  }>();

  // First pass: collect all normalized keys (to check if alternatives are already on list)
  const allKeys = new Set<string>();
  for (const input of inputs) {
    const { primary } = parseAlternatives(input.item);
    allKeys.add(getIngredientKey(primary));
  }

  for (const input of inputs) {
    // Parse "or" alternatives from the ingredient name
    const { primary, alternatives } = parseAlternatives(input.item);
    const key = getIngredientKey(primary);
    const multiplier = input.servingsMultiplier ?? 1;

    if (!groups.has(key)) {
      groups.set(key, {
        originalNames: new Set(),
        quantities: new Map(),
        recipeIds: new Set(),
        sources: [],
        alternatives: new Set(),
      });
    }

    const group = groups.get(key)!;
    group.originalNames.add(primary); // Store primary name, not the full "X or Y" string
    group.recipeIds.add(input.recipeId);

    // Track source with amount for attribution
    const adjustedQty = input.quantity !== null ? input.quantity * multiplier : null;
    const amountStr = adjustedQty !== null
      ? `${formatQuantityString(adjustedQty, input.unit)}`
      : '';
    group.sources.push({ recipeId: input.recipeId, amount: amountStr });

    // Track alternatives
    for (const alt of alternatives) {
      group.alternatives.add(alt);
    }
    
    if (input.quantity !== null) {
      const normalizedUnit = normalizeUnit(input.unit);
      let quantity = toBaseUnits(input.quantity * multiplier, normalizedUnit);
      let unitInfo = getUnitInfo(normalizedUnit);

      // Convert volume to weight for ingredients like butter (for better consolidation)
      if (unitInfo.type === 'volume' && shouldPreferWeight(key)) {
        const weightInGrams = convertVolumeToWeight(quantity.baseValue, key);
        if (weightInGrams !== null) {
          quantity = {
            value: weightInGrams,
            unit: 'g',
            type: 'weight',
            baseValue: weightInGrams,
          };
          unitInfo = { toBase: 1, type: 'weight' };
        }
      }

      // Group by unit type for merging
      const typeKey = unitInfo.type;
      const existing = group.quantities.get(typeKey);
      
      if (existing && areUnitsCompatible(existing.unit, normalizedUnit)) {
        existing.baseValue += quantity.baseValue;
        existing.count += 1;
      } else if (!existing) {
        group.quantities.set(typeKey, {
          ...quantity,
          count: 1,
        });
      } else {
        // Incompatible units - keep separate
        const altKey = `${typeKey}_${normalizedUnit}`;
        const altExisting = group.quantities.get(altKey);
        if (altExisting) {
          altExisting.baseValue += quantity.baseValue;
          altExisting.count += 1;
        } else {
          group.quantities.set(altKey, {
            ...quantity,
            count: 1,
          });
        }
      }
    } else {
      // No quantity - just mark as needed
      const existing = group.quantities.get('unknown');
      if (existing) {
        existing.count += 1;
      } else {
        group.quantities.set('unknown', {
          value: 0,
          unit: '',
          type: 'unknown',
          baseValue: 0,
          count: 1,
        });
      }
    }
  }
  
  // Convert groups to merged ingredients
  const results: MergedIngredient[] = [];
  
  for (const [key, group] of groups) {
    const originalNames = Array.from(group.originalNames);
    const displayName = getDisplayName(key, originalNames);
    
    const quantities: MergedQuantity[] = [];

    // First pass: format each quantity and group by display unit to SUM values
    const unitTotals = new Map<string, { value: number; type: 'volume' | 'weight' | 'count' | 'container' | 'unknown' }>();

    for (const [, q] of group.quantities) {
      if (q.type === 'unknown' || q.baseValue === 0) {
        // No specific quantity
        continue;
      }

      // Format the quantity for display - pass ingredient name for herb detection
      const formatted = formatQuantity(q.baseValue, q.type, q.unit, key);

      // Sum by display unit (so "50g + 10g + 60g" becomes "120g")
      const existing = unitTotals.get(formatted.unit);
      if (existing) {
        existing.value += formatted.value;
      } else {
        unitTotals.set(formatted.unit, {
          value: formatted.value,
          type: q.type,
        });
      }
    }

    // Build quantities array and display parts from summed totals
    const displayParts: string[] = [];
    for (const [unit, total] of unitTotals) {
      quantities.push({
        value: total.value,
        unit: unit,
        type: total.type,
      });

      const displayStr = formatQuantityString(total.value, unit);
      if (displayStr) {
        displayParts.push(displayStr);
      }
    }

    // Create total display string
    let totalDisplay = '';
    if (displayParts.length > 0) {
      // If we have container counts like cans, show that nicely
      const containerQty = quantities.find(q => q.type === 'container');
      if (containerQty && containerQty.value > 0) {
        const count = Math.ceil(containerQty.value);
        totalDisplay = `${count} ${containerQty.unit}${count !== 1 ? 's' : ''}`;
      } else {
        totalDisplay = displayParts.join(' + ');
      }
    }
    
    // Process alternatives and check if any are already on the shopping list
    const alternatives = Array.from(group.alternatives);
    let alternativeNote: string | undefined;

    // Check if any alternative is already in allKeys (on the shopping list)
    for (const alt of alternatives) {
      const altKey = getIngredientKey(alt);
      if (allKeys.has(altKey) && altKey !== key) {
        alternativeNote = `${alt} already on list`;
        break;
      }
    }

    results.push({
      key,
      displayName,
      originalNames,
      quantities,
      totalDisplay,
      recipeIds: Array.from(group.recipeIds),
      sources: group.sources,
      category: categorizeIngredient(key),
      alternatives,
      alternativeNote,
    });
  }

  return results;
}

/**
 * Categorize an ingredient into a shopping aisle
 * Order matters: check SPECIFIC patterns before GENERIC ones
 */
function categorizeIngredient(ingredient: string): string {
  const lower = ingredient.toLowerCase();

  // === SPECIFIC PATTERNS FIRST (to avoid false matches) ===

  // Condiments & Sauces (check BEFORE "fish" matches Meat)
  if (/sauce|ketchup|mustard|mayo|mayonnaise|vinegar|dressing|relish|salsa|hot sauce|soy sauce|fish sauce|oyster sauce|hoisin|teriyaki|worcestershire|sriracha/.test(lower)) {
    return 'Condiments';
  }

  // Beverages & Broths (check BEFORE "beef"/"chicken" matches Meat)
  // Use word boundary for "tea" to avoid matching "steak"
  if (/broth|stock|water|juice|soda|coffee|\btea\b|wine|beer/.test(lower)) {
    return 'Beverages';
  }

  // Spices & Seasonings (check "powder", "ground", "dried" BEFORE Produce)
  if (/powder|ground |dried |salt|pepper|oregano|cumin|paprika|cinnamon|nutmeg|cayenne|chili powder|curry|turmeric|coriander|cardamom|clove|allspice|bay leaf|sage|tarragon|garlic powder|onion powder|ginger powder|seasoning|spice/.test(lower)) {
    return 'Spices & Seasonings';
  }

  // === NOW CHECK GENERIC PATTERNS ===

  // Proteins (safe now that sauces/broths are filtered)
  if (/chicken|beef|steak|pork|lamb|turkey|duck|veal|salmon|tuna|shrimp|prawn|crab|lobster|bacon|ham|sausage|ground meat|mince|fish fillet|cod|tilapia|halibut/.test(lower)) {
    return 'Meat & Seafood';
  }

  // Dairy
  if (/milk|cream|butter|cheese|yogurt|yoghurt|egg|sour cream|cottage cheese|ricotta|mascarpone/.test(lower)) {
    return 'Dairy';
  }

  // Produce (added radish, beet, turnip, parsnip)
  if (/lettuce|tomato|onion|garlic|pepper|cucumber|broccoli|spinach|carrot|celery|potato|zucchini|squash|eggplant|mushroom|cabbage|kale|arugula|lemon|lime|orange|apple|banana|berry|grape|melon|avocado|ginger|scallion|green onion|leek|shallot|radish|beet|turnip|parsnip|asparagus|artichoke|corn|pea|bean sprout/.test(lower)) {
    return 'Produce';
  }

  // Fresh herbs go to Produce (not dried spices)
  if (/fresh basil|fresh cilantro|fresh parsley|fresh mint|fresh dill|fresh thyme|fresh rosemary|fresh oregano|fresh sage|basil leaves|cilantro leaves|parsley leaves|mint leaves/.test(lower)) {
    return 'Produce';
  }

  // Bakery
  if (/bread|bagel|tortilla|roll|bun|pita|naan|croissant|muffin|baguette/.test(lower)) {
    return 'Bakery';
  }

  // Frozen
  if (/frozen/.test(lower)) {
    return 'Frozen';
  }

  // Canned goods
  if (/canned|can of|tinned/.test(lower)) {
    return 'Canned Goods';
  }

  // Pasta & Grains
  if (/pasta|spaghetti|penne|rigatoni|fettuccine|linguine|rice|quinoa|couscous|orzo|noodle|macaroni/.test(lower)) {
    return 'Pasta & Grains';
  }

  // Baking
  if (/flour|sugar|baking powder|baking soda|yeast|vanilla|chocolate|cocoa|honey|maple syrup|molasses/.test(lower)) {
    return 'Baking';
  }

  // Oils (separate from condiments for clearer categorization)
  if (/oil/.test(lower)) {
    return 'Condiments';
  }

  // Default
  return 'Pantry';
}
