// Fuzzy string matching for ingredient normalization
// Uses Fuse.js to catch typos and variations not covered by static aliases

import Fuse from 'fuse.js';
import { INGREDIENT_ALIASES } from './aliases';

// Build search index from alias keys and canonical names
const aliasKeys = Object.keys(INGREDIENT_ALIASES);
const canonicalNames = [...new Set(Object.values(INGREDIENT_ALIASES))];
const allSearchableNames = [...aliasKeys, ...canonicalNames];

// Create Fuse instance with tuned options for ingredient matching
const fuse = new Fuse(allSearchableNames, {
  threshold: 0.3,        // 0 = exact match only, 1 = match anything (0.3 is fairly strict)
  distance: 100,         // How far from the start a match can be
  minMatchCharLength: 3, // Ignore very short matches to avoid false positives
  includeScore: true,    // Include match score for filtering
});

/**
 * Find best fuzzy match for an ingredient name
 * Returns canonical form if a good match is found, null otherwise
 *
 * @param ingredient - The ingredient name to match (already cleaned/singularized)
 * @returns The canonical ingredient name or null if no good match
 */
export function fuzzyMatchIngredient(ingredient: string): string | null {
  // Skip fuzzy matching for very short ingredients (high false positive risk)
  if (ingredient.length < 4) {
    return null;
  }

  const results = fuse.search(ingredient);

  if (results.length === 0) {
    return null;
  }

  const best = results[0];

  // Only accept if score is good enough (lower score = better match)
  // Score of 0 is perfect match, 1 is complete mismatch
  if (best.score === undefined || best.score > 0.3) {
    return null;
  }

  const matched = best.item;

  // If matched an alias key, return its canonical form
  if (INGREDIENT_ALIASES[matched]) {
    return INGREDIENT_ALIASES[matched];
  }

  // If matched a canonical name directly, return it
  return matched;
}

/**
 * Get all fuzzy matches for debugging/testing
 * Returns up to 5 best matches with their scores
 */
export function getFuzzyMatches(ingredient: string, limit = 5): Array<{ match: string; score: number; canonical: string }> {
  const results = fuse.search(ingredient, { limit });

  return results.map(result => ({
    match: result.item,
    score: result.score ?? 1,
    canonical: INGREDIENT_ALIASES[result.item] ?? result.item,
  }));
}
