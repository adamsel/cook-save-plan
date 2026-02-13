// Main ingredient normalization module
// Combines alias mapping, unit conversion, and smart merging

import { INGREDIENT_ALIASES, DESCRIPTORS_TO_REMOVE } from './aliases';
import { fuzzyMatchIngredient } from './fuzzyMatcher';
import { INGREDIENT_CATEGORIES } from './categories';
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
  // Guard against null/undefined input
  if (!ingredient) {
    return '';
  }

  // Clean up the input first (lowercase, trim, remove parenthetical content)
  const cleaned = ingredient.toLowerCase().trim().replace(/\([^)]*\)/g, '').trim();

  // === STEP 1: Check alias BEFORE removing descriptors ===
  // This preserves important terms like "ground" in "ground beef"
  if (INGREDIENT_ALIASES[cleaned]) {
    return INGREDIENT_ALIASES[cleaned];
  }

  // Try singularized version of cleaned input
  const cleanedSingular = singularize(cleaned);
  if (INGREDIENT_ALIASES[cleanedSingular]) {
    return INGREDIENT_ALIASES[cleanedSingular];
  }

  // Try each word singularized on cleaned input
  const cleanedWords = cleaned.split(' ');
  const cleanedSingularized = cleanedWords.map(w => singularize(w)).join(' ');
  if (INGREDIENT_ALIASES[cleanedSingularized]) {
    return INGREDIENT_ALIASES[cleanedSingularized];
  }

  // === STEP 2: Remove descriptors and try again ===
  // This handles cases like "fresh ground beef" → "ground beef" → alias match
  const normalized = removeDescriptors(ingredient);

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

  // === STEP 3: Fuzzy match fallback for typos and variations ===
  const fuzzyMatch = fuzzyMatchIngredient(singularizedPhrase);
  if (fuzzyMatch) {
    return fuzzyMatch;
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
  // Guard against null/undefined input
  if (!item) {
    return { primary: '', alternatives: [] };
  }

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

  // Filter out inputs with null/undefined items
  const validInputs = inputs.filter(input => input.item && input.item.trim());

  // First pass: collect all normalized keys (to check if alternatives are already on list)
  const allKeys = new Set<string>();
  for (const input of validInputs) {
    const { primary } = parseAlternatives(input.item);
    if (primary) {
      allKeys.add(getIngredientKey(primary));
    }
  }

  for (const input of validInputs) {
    // Parse "or" alternatives from the ingredient name
    const { primary, alternatives } = parseAlternatives(input.item);
    if (!primary) continue; // Skip empty items
    const key = getIngredientKey(primary);
    if (!key) continue; // Skip if normalization returns empty
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
 * Uses a 3-layer approach:
 * 1. Direct lookup in INGREDIENT_CATEGORIES (most reliable)
 * 2. Check each word of multi-word ingredients
 * 3. Fall back to regex with word boundaries
 */
function categorizeIngredient(ingredient: string): string {
  // First, normalize the ingredient to get the canonical form
  const normalized = normalizeIngredient(ingredient);
  const lower = normalized.toLowerCase();

  // === LAYER 1: Direct lookup (most reliable) ===
  if (INGREDIENT_CATEGORIES[normalized]) {
    return INGREDIENT_CATEGORIES[normalized];
  }
  if (INGREDIENT_CATEGORIES[lower]) {
    return INGREDIENT_CATEGORIES[lower];
  }

  // === LAYER 2: Check each word of multi-word ingredients ===
  const words = lower.split(' ');
  for (const word of words) {
    if (INGREDIENT_CATEGORIES[word]) {
      return INGREDIENT_CATEGORIES[word];
    }
  }

  // === LAYER 3: Fallback regex with WORD BOUNDARIES ===
  // This catches ingredients not in the lookup table
  // Using \b prevents "buttery" from matching "butter"

  // Condiments & Sauces
  if (/\b(sauce|ketchup|mustard|mayo|mayonnaise|vinegar|dressing|relish|salsa|sriracha|hoisin|teriyaki|worcestershire)\b/.test(lower)) {
    return 'Condiments';
  }

  // Beverages & Broths
  if (/\b(broth|stock|juice|soda|coffee|tea|wine|beer)\b/.test(lower)) {
    return 'Beverages';
  }

  // Spices & Seasonings
  if (/\b(seasoning|spice|powder|paprika|cumin|cinnamon|nutmeg|oregano|thyme|basil|rosemary)\b/.test(lower)) {
    return 'Spices & Seasonings';
  }

  // Meat & Seafood
  if (/\b(chicken|beef|steak|pork|lamb|turkey|duck|salmon|tuna|shrimp|crab|lobster|bacon|ham|sausage|cod|tilapia|halibut|fish)\b/.test(lower)) {
    return 'Meat & Seafood';
  }

  // Dairy - use word boundaries to prevent "buttery" matching "butter"
  if (/\b(milk|cream|butter|cheese|yogurt|yoghurt|egg)\b/.test(lower)) {
    return 'Dairy';
  }

  // Baking
  if (/\b(flour|sugar|starch|honey|syrup|molasses|baking|yeast|vanilla|chocolate|cocoa)\b/.test(lower)) {
    return 'Baking';
  }

  // Produce
  if (/\b(lettuce|tomato|onion|garlic|pepper|cucumber|broccoli|spinach|carrot|celery|potato|zucchini|squash|eggplant|mushroom|cabbage|kale|arugula|lemon|lime|orange|apple|banana|berry|grape|melon|avocado|ginger|leek|shallot|radish|beet|turnip|parsnip|asparagus|artichoke|corn|pea|olive|basil|cilantro|parsley|mint|dill)\b/.test(lower)) {
    return 'Produce';
  }

  // Bakery
  if (/\b(bread|bagel|tortilla|roll|bun|pita|naan|croissant|muffin|baguette)\b/.test(lower)) {
    return 'Bakery';
  }

  // Frozen
  if (/\bfrozen\b/.test(lower)) {
    return 'Frozen';
  }

  // Canned goods
  if (/\b(canned|tinned)\b/.test(lower)) {
    return 'Canned Goods';
  }

  // Pasta & Grains
  if (/\b(pasta|spaghetti|penne|rigatoni|fettuccine|linguine|rice|quinoa|couscous|orzo|noodle|macaroni|oats|barley|farro)\b/.test(lower)) {
    return 'Pasta & Grains';
  }

  // Oils
  if (/\boil\b/.test(lower)) {
    return 'Condiments';
  }

  // Default
  return 'Pantry';
}
