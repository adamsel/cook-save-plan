// Unit conversion system for ingredient quantities

// Standard unit aliases
export const UNIT_ALIASES: Record<string, string> = {
  // Volume - cups
  'cup': 'cup',
  'cups': 'cup',
  'c': 'cup',
  'c.': 'cup',
  
  // Volume - tablespoons
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'tbsp': 'tbsp',
  'tbsp.': 'tbsp',
  'tbs': 'tbsp',
  'tbs.': 'tbsp',
  't': 'tbsp',
  'tb': 'tbsp',
  
  // Volume - teaspoons
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'tsp': 'tsp',
  'tsp.': 'tsp',
  't.': 'tsp',
  
  // Volume - fluid ounces
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  'fl oz': 'fl oz',
  'fl. oz.': 'fl oz',
  'floz': 'fl oz',
  
  // Volume - milliliters
  'milliliter': 'ml',
  'milliliters': 'ml',
  'millilitre': 'ml',
  'millilitres': 'ml',
  'ml': 'ml',
  'mL': 'ml',
  
  // Volume - liters
  'liter': 'l',
  'liters': 'l',
  'litre': 'l',
  'litres': 'l',
  'l': 'l',
  'L': 'l',
  
  // Volume - pints/quarts/gallons
  'pint': 'pint',
  'pints': 'pint',
  'pt': 'pint',
  'pt.': 'pint',
  'quart': 'quart',
  'quarts': 'quart',
  'qt': 'quart',
  'qt.': 'quart',
  'gallon': 'gallon',
  'gallons': 'gallon',
  'gal': 'gallon',
  
  // Weight - ounces
  'ounce': 'oz',
  'ounces': 'oz',
  'oz': 'oz',
  'oz.': 'oz',
  
  // Weight - pounds
  'pound': 'lb',
  'pounds': 'lb',
  'lb': 'lb',
  'lb.': 'lb',
  'lbs': 'lb',
  'lbs.': 'lb',
  
  // Weight - grams
  'gram': 'g',
  'grams': 'g',
  'g': 'g',
  'g.': 'g',
  'gr': 'g',
  
  // Weight - kilograms
  'kilogram': 'kg',
  'kilograms': 'kg',
  'kg': 'kg',
  'kg.': 'kg',
  'kilo': 'kg',
  'kilos': 'kg',
  
  // Count units
  'piece': 'piece',
  'pieces': 'piece',
  'pc': 'piece',
  'pcs': 'piece',
  'each': 'piece',
  'ea': 'piece',
  
  // Cans/containers
  'can': 'can',
  'cans': 'can',
  'tin': 'can',
  'tins': 'can',
  
  'jar': 'jar',
  'jars': 'jar',
  
  'bottle': 'bottle',
  'bottles': 'bottle',
  
  'package': 'package',
  'packages': 'package',
  'pkg': 'package',
  'pkg.': 'package',
  'pack': 'package',
  'packs': 'package',
  'packet': 'package',
  'packets': 'package',
  
  'box': 'box',
  'boxes': 'box',
  
  'bag': 'bag',
  'bags': 'bag',
  
  'bunch': 'bunch',
  'bunches': 'bunch',
  
  'head': 'head',
  'heads': 'head',
  
  'stalk': 'stalk',
  'stalks': 'stalk',
  
  'sprig': 'sprig',
  'sprigs': 'sprig',
  
  'clove': 'clove',
  'cloves': 'clove',
  
  'slice': 'slice',
  'slices': 'slice',
  
  'strip': 'strip',
  'strips': 'strip',
  'rasher': 'strip',
  'rashers': 'strip',
  
  'pinch': 'pinch',
  'pinches': 'pinch',
  
  'dash': 'dash',
  'dashes': 'dash',
  
  'handful': 'handful',
  'handfuls': 'handful',
  
  // Empty/unknown
  '': '',
  'some': '',
  'to taste': '',
  'as needed': '',
};

// Conversion factors to base units
// Volume: base = ml
// Weight: base = g
interface ConversionFactor {
  toBase: number;
  type: 'volume' | 'weight' | 'count' | 'container' | 'unknown';
}

export const UNIT_CONVERSIONS: Record<string, ConversionFactor> = {
  // Volume (to ml)
  'ml': { toBase: 1, type: 'volume' },
  'l': { toBase: 1000, type: 'volume' },
  'tsp': { toBase: 4.929, type: 'volume' },
  'tbsp': { toBase: 14.787, type: 'volume' },
  'fl oz': { toBase: 29.574, type: 'volume' },
  'cup': { toBase: 236.588, type: 'volume' },
  'pint': { toBase: 473.176, type: 'volume' },
  'quart': { toBase: 946.353, type: 'volume' },
  'gallon': { toBase: 3785.41, type: 'volume' },
  
  // Weight (to g)
  'g': { toBase: 1, type: 'weight' },
  'kg': { toBase: 1000, type: 'weight' },
  'oz': { toBase: 28.3495, type: 'weight' },
  'lb': { toBase: 453.592, type: 'weight' },
  
  // Count
  'piece': { toBase: 1, type: 'count' },
  'clove': { toBase: 1, type: 'count' },
  'slice': { toBase: 1, type: 'count' },
  'strip': { toBase: 1, type: 'count' },
  'stalk': { toBase: 1, type: 'count' },
  'sprig': { toBase: 1, type: 'count' },
  'head': { toBase: 1, type: 'count' },
  'bunch': { toBase: 1, type: 'count' },
  'handful': { toBase: 1, type: 'count' },
  'pinch': { toBase: 1, type: 'count' },
  'dash': { toBase: 1, type: 'count' },
  
  // Containers
  'can': { toBase: 1, type: 'container' },
  'jar': { toBase: 1, type: 'container' },
  'bottle': { toBase: 1, type: 'container' },
  'package': { toBase: 1, type: 'container' },
  'box': { toBase: 1, type: 'container' },
  'bag': { toBase: 1, type: 'container' },
  
  // Unknown
  '': { toBase: 1, type: 'unknown' },
};

// Unit display preferences (from base units)
export const VOLUME_DISPLAY_THRESHOLDS = [
  { min: 0, max: 15, unit: 'tsp', factor: 1 / 4.929 },
  { min: 15, max: 60, unit: 'tbsp', factor: 1 / 14.787 },
  { min: 60, max: 250, unit: 'ml', factor: 1 },
  { min: 250, max: 1000, unit: 'cup', factor: 1 / 236.588 },
  { min: 1000, max: Infinity, unit: 'l', factor: 1 / 1000 },
];

export const WEIGHT_DISPLAY_THRESHOLDS = [
  { min: 0, max: 100, unit: 'g', factor: 1 },
  { min: 100, max: 500, unit: 'g', factor: 1 },
  { min: 500, max: 1000, unit: 'g', factor: 1 },
  { min: 1000, max: Infinity, unit: 'kg', factor: 1 / 1000 },
];

export interface NormalizedQuantity {
  value: number;
  unit: string;
  type: 'volume' | 'weight' | 'count' | 'container' | 'unknown';
  baseValue: number; // Value in base units (ml or g)
}

/**
 * Normalize a unit string to its canonical form
 */
export function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

/**
 * Get the unit type and conversion info
 */
export function getUnitInfo(unit: string): ConversionFactor {
  const normalized = normalizeUnit(unit);
  return UNIT_CONVERSIONS[normalized] ?? { toBase: 1, type: 'unknown' };
}

/**
 * Convert a quantity to base units for comparison/merging
 */
export function toBaseUnits(quantity: number, unit: string): NormalizedQuantity {
  const normalized = normalizeUnit(unit);
  const info = UNIT_CONVERSIONS[normalized] ?? { toBase: 1, type: 'unknown' };
  
  return {
    value: quantity,
    unit: normalized,
    type: info.type,
    baseValue: quantity * info.toBase,
  };
}

/**
 * Check if two units are compatible for merging
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const info1 = getUnitInfo(unit1);
  const info2 = getUnitInfo(unit2);
  
  // Same type can be merged
  if (info1.type === info2.type) return true;
  
  // Unknown can merge with anything
  if (info1.type === 'unknown' || info2.type === 'unknown') return true;
  
  return false;
}

/**
 * Format a quantity for display with smart unit selection
 * Rounds up to nearest whole number for cleaner shopping lists
 */
export function formatQuantity(
  baseValue: number, 
  type: 'volume' | 'weight' | 'count' | 'container' | 'unknown', 
  preferredUnit?: string,
  ingredientName?: string
): { value: number; unit: string } {
  // Check if this is an herb or similar that shouldn't use ml
  const isHerbOrSpice = ingredientName && /basil|cilantro|parsley|mint|dill|thyme|rosemary|oregano|sage|tarragon|chive|coriander|herb/.test(ingredientName.toLowerCase());
  
  // For counts and containers, round up to nearest whole
  if (type === 'count' || type === 'container' || type === 'unknown') {
    const rounded = Math.ceil(baseValue);
    return { value: rounded, unit: preferredUnit || '' };
  }
  
  // For volume, select appropriate unit based on amount
  if (type === 'volume') {
    // For herbs/spices, prefer tbsp/tsp over ml
    if (isHerbOrSpice) {
      if (baseValue <= 15) {
        // 15ml = 1 tbsp, so use tsp for smaller
        const tspValue = Math.ceil(baseValue / 4.929);
        return { value: tspValue, unit: 'tsp' };
      } else if (baseValue <= 60) {
        const tbspValue = Math.ceil(baseValue / 14.787);
        return { value: tbspValue, unit: 'tbsp' };
      } else {
        // For larger amounts, use bunch or handful
        return { value: 1, unit: 'bunch' };
      }
    }
    
    for (const threshold of VOLUME_DISPLAY_THRESHOLDS) {
      if (baseValue >= threshold.min && baseValue < threshold.max) {
        const rawValue = baseValue * threshold.factor;
        // Round up to nearest whole, or nearest 0.5 for small values
        const value = rawValue < 4 ? Math.ceil(rawValue * 2) / 2 : Math.ceil(rawValue);
        return { value, unit: threshold.unit };
      }
    }
    // Fallback
    return { value: Math.ceil(baseValue / 1000), unit: 'l' };
  }
  
  // For weight, select appropriate unit and round up
  if (type === 'weight') {
    if (baseValue >= 1000) {
      // Round up to nearest 0.5 kg for large amounts
      const kgValue = baseValue / 1000;
      return { value: Math.ceil(kgValue * 2) / 2, unit: 'kg' };
    }
    // Round up to nearest 10g for cleaner numbers
    const rounded = Math.ceil(baseValue / 10) * 10;
    return { value: rounded, unit: 'g' };
  }
  
  return { value: Math.ceil(baseValue), unit: preferredUnit || '' };
}

/**
 * Create a human-readable quantity string
 */
export function formatQuantityString(quantity: number | null, unit: string): string {
  if (quantity === null || quantity === 0) return '';
  
  // Format number nicely
  let numStr: string;
  if (Number.isInteger(quantity)) {
    numStr = quantity.toString();
  } else if (quantity < 1) {
    // Handle fractions like 0.5, 0.25, etc.
    const fractionMap: Record<number, string> = {
      0.125: '⅛',
      0.25: '¼',
      0.333: '⅓',
      0.375: '⅜',
      0.5: '½',
      0.625: '⅝',
      0.666: '⅔',
      0.75: '¾',
      0.875: '⅞',
    };
    const closest = Object.keys(fractionMap)
      .map(Number)
      .reduce((a, b) => Math.abs(b - quantity) < Math.abs(a - quantity) ? b : a);
    if (Math.abs(closest - quantity) < 0.05) {
      numStr = fractionMap[closest];
    } else {
      numStr = quantity.toFixed(1);
    }
  } else {
    // Mixed numbers like 1.5
    const whole = Math.floor(quantity);
    const fraction = quantity - whole;
    if (fraction < 0.1) {
      numStr = whole.toString();
    } else if (Math.abs(fraction - 0.5) < 0.1) {
      numStr = `${whole}½`;
    } else if (Math.abs(fraction - 0.25) < 0.1) {
      numStr = `${whole}¼`;
    } else if (Math.abs(fraction - 0.75) < 0.1) {
      numStr = `${whole}¾`;
    } else if (Math.abs(fraction - 0.333) < 0.1) {
      numStr = `${whole}⅓`;
    } else if (Math.abs(fraction - 0.666) < 0.1) {
      numStr = `${whole}⅔`;
    } else {
      numStr = quantity.toFixed(1);
    }
  }
  
  return unit ? `${numStr} ${unit}` : numStr;
}
