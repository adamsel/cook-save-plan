import { Ingredient, RecipeNutrition } from '@/types/recipe';

export type ImportMethod = 'schema' | 'dom' | 'text' | 'manual';
export type ParsingConfidence = 'high' | 'medium' | 'low';

export interface ParsedRecipe {
  title: string;
  description?: string;
  imageUrl?: string;
  author?: string;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  ingredients: Ingredient[];
  instructions: string[];
  sourceUrl?: string;
  importMethod: ImportMethod;
  confidence: ParsingConfidence;
  rawImportSnapshot?: string;
  nutrition?: RecipeNutrition;
}

// Parse ISO 8601 duration (PT30M, PT1H30M, etc.) to minutes
function parseIsoDuration(duration: string | undefined): number | undefined {
  if (!duration) return undefined;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return undefined;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 60 + minutes + Math.ceil(seconds / 60);
}

// Parse yield/servings from various formats
function parseServings(yield_: string | number | undefined): number | undefined {
  if (!yield_) return undefined;
  if (typeof yield_ === 'number') return yield_;
  
  const match = yield_.match(/(\d+)/);
  return match ? parseInt(match[1]) : undefined;
}

// Parse an ingredient string into structured format
export function parseIngredientLine(line: string, index: number): Ingredient {
  const trimmed = line.trim();
  
  // Common patterns: "2 cups flour", "1/2 tsp salt", "200g chicken"
  const quantityPattern = /^([\d\/\.\,\s]+(?:[\-–][\d\/\.\,\s]+)?)\s*([a-zA-Z]+\.?)?\s+(.+)$/;
  const match = trimmed.match(quantityPattern);
  
  if (match) {
    const quantityStr = match[1].trim().replace(',', '.');
    // Handle fractions like "1/2"
    let quantity: number | null = null;
    if (quantityStr.includes('/')) {
      const parts = quantityStr.split('/');
      quantity = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
      quantity = parseFloat(quantityStr);
    }
    
    const unit = match[2]?.toLowerCase() || '';
    const item = match[3].trim();
    
    // Check for notes in parentheses
    const notesMatch = item.match(/^(.+?)\s*\((.+?)\)\s*$/);
    
    return {
      id: `ing-${index}-${Date.now()}`,
      quantity: isNaN(quantity) ? null : quantity,
      unit,
      item: notesMatch ? notesMatch[1].trim() : item,
      notes: notesMatch ? notesMatch[2].trim() : undefined,
    };
  }
  
  return {
    id: `ing-${index}-${Date.now()}`,
    quantity: null,
    unit: '',
    item: trimmed,
    notes: undefined,
  };
}

// Filter out ingredients with empty names (parser sometimes produces blank items)
function filterValidIngredients(ingredients: Ingredient[]): Ingredient[] {
  return ingredients.filter(ing => ing.item && ing.item.trim().length > 0);
}

// Parse instruction step from various formats
function parseInstructionStep(step: any): string {
  if (typeof step === 'string') {
    return step.trim();
  }
  // Handle HowToStep objects from schema.org
  if (step && typeof step === 'object') {
    return step.text || step.name || '';
  }
  return '';
}

// Extract JSON-LD Recipe schema from HTML
function extractJsonLdRecipe(html: string): any | null {
  const scriptMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  
  if (!scriptMatches) return null;
  
  for (const script of scriptMatches) {
    const jsonMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!jsonMatch) continue;
    
    try {
      let data = JSON.parse(jsonMatch[1]);
      
      // Handle @graph arrays
      if (data['@graph']) {
        data = data['@graph'];
      }
      
      // Handle arrays
      if (Array.isArray(data)) {
        const recipe = data.find(item => 
          item['@type'] === 'Recipe' || 
          (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
        );
        if (recipe) return recipe;
      } else if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
        return data;
      }
    } catch (e) {
      // Invalid JSON, continue to next script
    }
  }
  
  return null;
}

// Parse recipe from JSON-LD schema
function parseFromSchema(schemaData: any, sourceUrl: string): ParsedRecipe | null {
  if (!schemaData) return null;
  
  const ingredients: Ingredient[] = [];
  const instructions: string[] = [];
  
  // Parse ingredients
  const recipeIngredients = schemaData.recipeIngredient || schemaData.ingredients || [];
  if (Array.isArray(recipeIngredients)) {
    recipeIngredients.forEach((ing: string, index: number) => {
      if (typeof ing === 'string' && ing.trim()) {
        ingredients.push(parseIngredientLine(ing, index));
      }
    });
  }
  
  // Parse instructions
  const recipeInstructions = schemaData.recipeInstructions || [];
  if (Array.isArray(recipeInstructions)) {
    recipeInstructions.forEach((step: any) => {
      if (step['@type'] === 'HowToSection' && Array.isArray(step.itemListElement)) {
        // Handle sectioned instructions
        step.itemListElement.forEach((subStep: any) => {
          const parsed = parseInstructionStep(subStep);
          if (parsed) instructions.push(parsed);
        });
      } else {
        const parsed = parseInstructionStep(step);
        if (parsed) instructions.push(parsed);
      }
    });
  } else if (typeof recipeInstructions === 'string') {
    // Some sites have instructions as a single string
    const steps = recipeInstructions.split(/\n|(?:\d+\.\s+)/);
    steps.forEach(step => {
      const trimmed = step.trim();
      if (trimmed) instructions.push(trimmed);
    });
  }
  
  // Get image URL
  let imageUrl: string | undefined;
  if (schemaData.image) {
    if (typeof schemaData.image === 'string') {
      imageUrl = schemaData.image;
    } else if (Array.isArray(schemaData.image)) {
      imageUrl = schemaData.image[0];
    } else if (schemaData.image.url) {
      imageUrl = schemaData.image.url;
    }
  }
  
  // Extract nutrition from schema.org NutritionInformation
  let nutrition: RecipeNutrition | undefined;
  if (schemaData.nutrition) {
    const n = schemaData.nutrition;
    const parseNutrientValue = (val: string | number | undefined): number | undefined => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'number') return val;
      const match = String(val).match(/[\d.]+/);
      return match ? parseFloat(match[0]) : undefined;
    };

    const calories = parseNutrientValue(n.calories);
    const protein = parseNutrientValue(n.proteinContent);
    const carbs = parseNutrientValue(n.carbohydrateContent);
    const fat = parseNutrientValue(n.fatContent);

    if (calories !== undefined || protein !== undefined) {
      nutrition = {
        perServing: {
          calories: Math.round(calories || 0),
          protein: Math.round(protein || 0),
          carbs: Math.round(carbs || 0),
          fat: Math.round(fat || 0),
          fiber: parseNutrientValue(n.fiberContent) !== undefined ? Math.round(parseNutrientValue(n.fiberContent)!) : undefined,
          sugar: parseNutrientValue(n.sugarContent) !== undefined ? Math.round(parseNutrientValue(n.sugarContent)!) : undefined,
          sodium: parseNutrientValue(n.sodiumContent) !== undefined ? Math.round(parseNutrientValue(n.sodiumContent)!) : undefined,
          saturatedFat: parseNutrientValue(n.saturatedFatContent) !== undefined ? Math.round(parseNutrientValue(n.saturatedFatContent)!) : undefined,
          cholesterol: parseNutrientValue(n.cholesterolContent) !== undefined ? Math.round(parseNutrientValue(n.cholesterolContent)!) : undefined,
        },
        source: 'provided_by_site',
        confidence: 'High',
        notes: 'Nutrition data from recipe website.',
      };
    }
  }

  return {
    title: schemaData.name || 'Untitled Recipe',
    description: schemaData.description,
    imageUrl,
    author: typeof schemaData.author === 'string' ? schemaData.author : schemaData.author?.name,
    prepTime: parseIsoDuration(schemaData.prepTime),
    cookTime: parseIsoDuration(schemaData.cookTime),
    totalTime: parseIsoDuration(schemaData.totalTime),
    servings: parseServings(schemaData.recipeYield || schemaData.yield),
    ingredients: filterValidIngredients(ingredients),
    instructions,
    sourceUrl,
    importMethod: 'schema',
    confidence: 'high',
    nutrition,
  };
}

// Parse recipe using DOM heuristics
function parseFromDom(html: string, sourceUrl: string): ParsedRecipe | null {
  // Create a temporary DOM element
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Try to extract title
  let title = '';
  const h1 = doc.querySelector('h1');
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const metaTitle = doc.querySelector('title')?.textContent;
  title = h1?.textContent?.trim() || ogTitle || metaTitle || 'Untitled Recipe';
  
  // Try to extract image
  let imageUrl: string | undefined;
  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (ogImage) {
    imageUrl = ogImage;
  }
  
  // Try to extract description
  const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
  
  // Find ingredients section
  const ingredients: Ingredient[] = [];
  const ingredientHeaders = Array.from(doc.querySelectorAll('h2, h3, h4, strong, b'))
    .filter(el => /ingredient/i.test(el.textContent || ''));
  
  for (const header of ingredientHeaders) {
    let current = header.nextElementSibling;
    while (current && !['H1', 'H2', 'H3', 'H4'].includes(current.tagName)) {
      if (current.tagName === 'UL' || current.tagName === 'OL') {
        const items = current.querySelectorAll('li');
        items.forEach((li, index) => {
          const text = li.textContent?.trim();
          if (text) {
            ingredients.push(parseIngredientLine(text, index));
          }
        });
        break;
      }
      current = current.nextElementSibling;
    }
    if (ingredients.length > 0) break;
  }
  
  // Find instructions section
  const instructions: string[] = [];
  const instructionHeaders = Array.from(doc.querySelectorAll('h2, h3, h4, strong, b'))
    .filter(el => /instruction|direction|method|step|preparation/i.test(el.textContent || ''));
  
  for (const header of instructionHeaders) {
    let current = header.nextElementSibling;
    while (current && !['H1', 'H2', 'H3', 'H4'].includes(current.tagName)) {
      if (current.tagName === 'OL' || current.tagName === 'UL') {
        const items = current.querySelectorAll('li');
        items.forEach(li => {
          const text = li.textContent?.trim();
          if (text) {
            instructions.push(text);
          }
        });
        break;
      } else if (current.tagName === 'P') {
        const text = current.textContent?.trim();
        if (text && text.length > 20) {
          instructions.push(text);
        }
      }
      current = current.nextElementSibling;
    }
    if (instructions.length > 0) break;
  }
  
  if (ingredients.length === 0 && instructions.length === 0) {
    return null;
  }
  
  return {
    title,
    description: description || undefined,
    imageUrl,
    ingredients: filterValidIngredients(ingredients),
    instructions,
    sourceUrl,
    importMethod: 'dom',
    confidence: ingredients.length > 3 && instructions.length > 2 ? 'medium' : 'low',
  };
}

// Parse recipe from pasted text
export function parseFromText(text: string): ParsedRecipe {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  const ingredients: Ingredient[] = [];
  const instructions: string[] = [];
  let title = '';
  let description = '';
  
  let section: 'unknown' | 'ingredients' | 'instructions' = 'unknown';
  let potentialTitle = '';
  
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    
    // Detect section headers
    if (/^(ingredients?|what you('ll)? need):?$/i.test(line)) {
      section = 'ingredients';
      return;
    }
    if (/^(instructions?|directions?|method|steps?|preparation|how to (make|cook)|to make):?$/i.test(line)) {
      section = 'instructions';
      return;
    }
    
    // First non-empty line could be title
    if (!potentialTitle && !lowerLine.includes('ingredient') && !lowerLine.includes('instruction')) {
      potentialTitle = line;
      return;
    }
    
    // If we're in a known section
    if (section === 'ingredients') {
      ingredients.push(parseIngredientLine(line, index));
      return;
    }
    
    if (section === 'instructions') {
      // Remove leading numbers like "1." or "Step 1:"
      const cleanedLine = line.replace(/^(\d+\.?|step\s*\d+:?)\s*/i, '');
      if (cleanedLine) {
        instructions.push(cleanedLine);
      }
      return;
    }
    
    // Heuristics for unknown section
    // Ingredient-like: starts with quantity or contains measurement words
    const isIngredientLike = /^[\d\/\.\,]/.test(line) || 
      /\b(cups?|tbsp?|tsp?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|kg|ml|liters?|cloves?|pieces?|pinch)\b/i.test(line);
    
    // Instruction-like: starts with number, or contains action verbs
    const isInstructionLike = /^\d+\.?\s+/.test(line) ||
      /^(add|mix|stir|cook|bake|heat|combine|pour|whisk|fold|serve|let|place|transfer|remove|preheat|chop|dice|slice|cut)/i.test(line);
    
    if (isIngredientLike && !isInstructionLike) {
      ingredients.push(parseIngredientLine(line, index));
    } else if (isInstructionLike || (section === 'unknown' && ingredients.length > 0 && !isIngredientLike && line.length > 30)) {
      section = 'instructions';
      const cleanedLine = line.replace(/^(\d+\.?|step\s*\d+:?)\s*/i, '');
      if (cleanedLine) {
        instructions.push(cleanedLine);
      }
    } else if (ingredients.length === 0 && instructions.length === 0) {
      // Could be description
      if (!description && potentialTitle && line !== potentialTitle) {
        description = line;
      }
    }
  });
  
  title = potentialTitle || 'Untitled Recipe';
  
  // Determine confidence
  let confidence: ParsingConfidence = 'low';
  if (ingredients.length >= 3 && instructions.length >= 2) {
    confidence = 'medium';
  }
  if (ingredients.length >= 5 && instructions.length >= 3) {
    confidence = 'high';
  }
  
  return {
    title,
    description: description || undefined,
    ingredients: filterValidIngredients(ingredients),
    instructions,
    importMethod: 'text',
    confidence,
    rawImportSnapshot: text.slice(0, 5000),
  };
}

// Main function to parse recipe from URL
export async function parseRecipeFromUrl(url: string): Promise<{ recipe: ParsedRecipe | null; error?: string }> {
  try {
    // Try to fetch the page
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html',
      },
    });
    
    if (!response.ok) {
      return { recipe: null, error: `Failed to fetch URL: ${response.status}` };
    }
    
    const html = await response.text();
    
    // Step A: Try JSON-LD schema first
    const schemaData = extractJsonLdRecipe(html);
    if (schemaData) {
      const parsed = parseFromSchema(schemaData, url);
      if (parsed && (parsed.ingredients.length > 0 || parsed.instructions.length > 0)) {
        parsed.rawImportSnapshot = html.slice(0, 5000);
        return { recipe: parsed };
      }
    }
    
    // Step B: Try DOM heuristics
    const domParsed = parseFromDom(html, url);
    if (domParsed) {
      domParsed.rawImportSnapshot = html.slice(0, 5000);
      return { recipe: domParsed };
    }
    
    return { recipe: null, error: 'Could not extract recipe from page' };
  } catch (error) {
    // CORS or network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { recipe: null, error: 'CORS_BLOCKED' };
    }
    return { recipe: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
