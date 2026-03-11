import type { Recipe, Ingredient, MealType, ImportMethod } from '@/types/recipe';
import { parseIngredientLine } from '@/lib/recipeParser';
import { suggestCategorization } from '@/lib/recipeSuggestions';

export interface CsvRecipeRow {
  id: string;
  source: string;
  recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> | null;
  error?: string;
}

export interface CsvParseResult {
  items: CsvRecipeRow[];
  warnings: string[];
  totalRows: number;
  validRows: number;
}

// Simple format headers (what we document for influencers)
const SIMPLE_HEADERS = ['title', 'servings', 'ingredients', 'instructions'];

// Full format headers (from Recipe Stash export)
const FULL_FORMAT_MARKER = 'import_method';

function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseIngredientsField(value: string): Ingredient[] {
  if (!value || !value.trim()) return [];

  // Try JSON first
  const json = tryParseJson<Ingredient[]>(value);
  if (Array.isArray(json)) {
    return json.map((ing, i) => ({
      id: ing.id || `ing-${i}-${Date.now()}`,
      item: ing.item || '',
      quantity: ing.quantity ?? null,
      unit: ing.unit || '',
      notes: ing.notes,
    }));
  }

  // Fall back to semicolon or newline separated text
  const lines = value.includes(';')
    ? value.split(';').map(s => s.trim()).filter(Boolean)
    : value.split('\n').map(s => s.trim()).filter(Boolean);

  return lines.map((line, i) => parseIngredientLine(line, i));
}

function parseInstructionsField(value: string): string[] {
  if (!value || !value.trim()) return [];

  // Try JSON first
  const json = tryParseJson<string[]>(value);
  if (Array.isArray(json)) return json;

  // Fall back to semicolon or newline separated text
  const lines = value.includes(';')
    ? value.split(';').map(s => s.trim()).filter(Boolean)
    : value.split('\n').map(s => s.trim()).filter(Boolean);

  return lines.map(line =>
    line.replace(/^(?:step\s*\d+[.:]\s*|\d+[.)]\s*)/i, '').trim()
  ).filter(Boolean);
}

function parseTagsField(value: string): string[] {
  if (!value || !value.trim()) return [];
  const json = tryParseJson<string[]>(value);
  if (Array.isArray(json)) return json;
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function parseMealTypesField(value: string): MealType[] {
  const valid: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const parsed = parseTagsField(value);
  return parsed.filter(t => valid.includes(t as MealType)) as MealType[];
}

function buildRecipeFromRow(
  row: Record<string, string>,
  isFullFormat: boolean,
  rowIndex: number,
): { recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> | null; error?: string } {
  const title = (row.title || '').trim();
  if (!title) {
    return { recipe: null, error: `Row ${rowIndex}: missing title` };
  }

  const ingredients = parseIngredientsField(row.ingredients || '');
  const instructions = parseInstructionsField(row.instructions || '');

  // Use suggestCategorization if category not provided
  const category = (row.category || '').trim();
  const suggestions = !category
    ? suggestCategorization(title, row.description || undefined, ingredients)
    : null;

  const importMethod: ImportMethod = 'bulk_csv';

  const recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> = {
    title,
    sourceUrl: (row.source_url || '').trim() || undefined,
    imageUrl: (row.image_url || '').trim() || undefined,
    description: (row.description || '').trim() || undefined,
    category: category || suggestions?.category || '',
    tags: parseTagsField(row.tags || ''),
    prepTime: row.prep_time ? parseInt(row.prep_time) || undefined : undefined,
    cookTime: row.cook_time ? parseInt(row.cook_time) || undefined : undefined,
    totalTime: row.total_time ? parseInt(row.total_time) || undefined : undefined,
    servings: parseInt(row.servings) || 4,
    ingredients,
    instructions,
    isFavorite: false,
    isArchived: false,
    cuisine: (row.cuisine || '').trim() || undefined,
    dietary: isFullFormat ? parseTagsField(row.dietary || '') : [],
    mealTypes: isFullFormat ? parseMealTypesField(row.meal_types || '') : (suggestions?.mealTypes || []),
    author: (row.author || '').trim() || undefined,
    nutrition: isFullFormat && row.nutrition ? tryParseJson(row.nutrition) || undefined : undefined,
    importMethod,
  };

  return { recipe };
}

export async function parseCsvFile(file: File): Promise<CsvParseResult> {
  const Papa = (await import('papaparse')).default;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;

      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false, // Keep everything as strings, we parse manually
      });

      const headers = parsed.meta.fields || [];
      const isFullFormat = headers.includes(FULL_FORMAT_MARKER);
      const hasRequiredHeaders = SIMPLE_HEADERS.some(h => headers.includes(h));

      if (!hasRequiredHeaders) {
        resolve({
          items: [],
          warnings: ['CSV must have at least a "title" column. Download the template for the expected format.'],
          totalRows: 0,
          validRows: 0,
        });
        return;
      }

      const items: CsvRecipeRow[] = [];
      const warnings: string[] = [];
      let validRows = 0;

      parsed.data.forEach((row, i) => {
        const rowNum = i + 2; // +2 for 1-indexed + header row
        const { recipe, error } = buildRecipeFromRow(row, isFullFormat, rowNum);

        if (recipe) {
          validRows++;
          items.push({
            id: `csv-${rowNum}`,
            source: `Row ${rowNum}`,
            recipe,
          });
        } else if (error) {
          warnings.push(error);
          items.push({
            id: `csv-${rowNum}`,
            source: `Row ${rowNum}`,
            recipe: null,
            error,
          });
        }
      });

      resolve({
        items,
        warnings,
        totalRows: parsed.data.length,
        validRows,
      });
    };

    reader.readAsText(file);
  });
}

export function generateTemplateCsv(): string {
  const headers = 'title,servings,ingredients,instructions,source_url,image_url,prep_time,cook_time,category,tags';
  const example = '"Example Pasta",4,"2 cups pasta; 1 cup marinara sauce; 1/4 cup parmesan","Cook pasta according to package directions; Heat sauce; Toss pasta with sauce; Top with parmesan","https://example.com/pasta","",15,20,"Dinner","quick,pasta"';
  return `${headers}\n${example}`;
}
