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

// Types for merged shopping list items
export interface MergedIngredient {
  key: string;
  displayName: string;
  originalNames: string[];
  quantities: MergedQuantity[];
  totalDisplay: string;
  recipeIds: string[];
  category: string;
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
  }>();
  
  for (const input of inputs) {
    const key = getIngredientKey(input.item);
    const multiplier = input.servingsMultiplier ?? 1;
    
    if (!groups.has(key)) {
      groups.set(key, {
        originalNames: new Set(),
        quantities: new Map(),
        recipeIds: new Set(),
      });
    }
    
    const group = groups.get(key)!;
    group.originalNames.add(input.item);
    group.recipeIds.add(input.recipeId);
    
    if (input.quantity !== null) {
      const normalizedUnit = normalizeUnit(input.unit);
      const quantity = toBaseUnits(input.quantity * multiplier, normalizedUnit);
      const unitInfo = getUnitInfo(normalizedUnit);
      
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
    const displayParts: string[] = [];
    
    for (const [, q] of group.quantities) {
      if (q.type === 'unknown' || q.baseValue === 0) {
        // No specific quantity
        continue;
      }
      
      // Format the quantity for display - pass ingredient name for herb detection
      const formatted = formatQuantity(q.baseValue, q.type, q.unit, key);
      quantities.push({
        value: formatted.value,
        unit: formatted.unit,
        type: q.type,
      });
      
      const displayStr = formatQuantityString(formatted.value, formatted.unit);
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
    
    results.push({
      key,
      displayName,
      originalNames,
      quantities,
      totalDisplay,
      recipeIds: Array.from(group.recipeIds),
      category: categorizeIngredient(key),
    });
  }
  
  return results;
}

/**
 * Categorize an ingredient into a shopping aisle
 */
function categorizeIngredient(ingredient: string): string {
  const lower = ingredient.toLowerCase();
  
  // Proteins
  if (/chicken|beef|pork|lamb|turkey|duck|fish|salmon|tuna|shrimp|prawn|crab|lobster|bacon|ham|sausage|ground meat|mince/.test(lower)) {
    return 'Meat & Seafood';
  }
  
  // Dairy
  if (/milk|cream|butter|cheese|yogurt|yoghurt|egg|sour cream|cottage cheese|ricotta|mascarpone/.test(lower)) {
    return 'Dairy';
  }
  
  // Produce
  if (/lettuce|tomato|onion|garlic|pepper|cucumber|broccoli|spinach|carrot|celery|potato|zucchini|squash|eggplant|mushroom|cabbage|kale|arugula|basil|cilantro|parsley|mint|dill|thyme|rosemary|oregano|lemon|lime|orange|apple|banana|berry|grape|melon|avocado|ginger|scallion|green onion|leek|shallot/.test(lower)) {
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
  
  // Spices & Seasonings
  if (/salt|pepper|oregano|basil|cumin|paprika|cinnamon|nutmeg|cayenne|chili powder|curry|turmeric|coriander|cardamom|clove|allspice|bay leaf|thyme|rosemary|sage|dill|tarragon/.test(lower)) {
    return 'Spices & Seasonings';
  }
  
  // Condiments & Sauces
  if (/sauce|ketchup|mustard|mayo|mayonnaise|vinegar|oil|dressing|relish|salsa|hot sauce|soy sauce|fish sauce|oyster sauce|hoisin|teriyaki|worcestershire|sriracha/.test(lower)) {
    return 'Condiments';
  }
  
  // Canned goods
  if (/canned|can of|tinned/.test(lower)) {
    return 'Canned Goods';
  }
  
  // Beverages
  if (/water|juice|soda|coffee|tea|wine|beer|broth|stock/.test(lower)) {
    return 'Beverages';
  }
  
  // Pasta & Grains
  if (/pasta|spaghetti|penne|rigatoni|fettuccine|linguine|rice|quinoa|couscous|orzo|noodle|macaroni/.test(lower)) {
    return 'Pasta & Grains';
  }
  
  // Baking
  if (/flour|sugar|baking powder|baking soda|yeast|vanilla|chocolate|cocoa|honey|maple syrup|molasses/.test(lower)) {
    return 'Baking';
  }
  
  // Default
  return 'Pantry';
}
