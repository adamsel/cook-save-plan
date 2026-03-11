import { useState, useRef, useCallback } from 'react';
import { Recipe, ParsingConfidence } from '@/types/recipe';
import { parseRecipeFromUrl } from '@/lib/recipeParser';
import { suggestCategorization } from '@/lib/recipeSuggestions';
import { parseCsvFile } from '@/lib/csvRecipeParser';
import { useRecipes } from '@/context/RecipeContext';
import { useToast } from '@/hooks/use-toast';

export type BulkImportStep = 'input' | 'processing' | 'preview' | 'saving' | 'complete';

export interface BulkImportItem {
  id: string;
  source: string;
  status: 'pending' | 'parsing' | 'parsed' | 'error' | 'duplicate' | 'skipped' | 'saving' | 'saved';
  recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> | null;
  error?: string;
  selected: boolean;
  confidence?: ParsingConfidence;
}

const MAX_URLS = 50;

export function useBulkImport() {
  const { addRecipe, recipes } = useRecipes();
  const { toast } = useToast();
  const [step, setStep] = useState<BulkImportStep>('input');
  const [items, setItems] = useState<BulkImportItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    setStep('input');
    setItems([]);
    setCurrentIndex(0);
    setSavedCount(0);
    setErrorCount(0);
    abortRef.current = false;
  }, []);

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  // --- Helpers ---

  const isDuplicateUrl = useCallback((url: string) => {
    return recipes.some(r => r.sourceUrl && r.sourceUrl === url);
  }, [recipes]);

  const processUrl = async (url: string, itemId: string) => {
    const result = await parseRecipeFromUrl(url);

    if (result.recipe) {
      const suggestions = suggestCategorization(
        result.recipe.title,
        result.recipe.description,
        result.recipe.ingredients,
      );

      const recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> = {
        title: result.recipe.title,
        sourceUrl: result.recipe.sourceUrl || url,
        imageUrl: result.recipe.imageUrl,
        description: result.recipe.description,
        category: suggestions.category || '',
        tags: suggestions.tags || [],
        prepTime: result.recipe.prepTime,
        cookTime: result.recipe.cookTime,
        totalTime: result.recipe.totalTime,
        servings: result.recipe.servings || 4,
        ingredients: result.recipe.ingredients,
        instructions: result.recipe.instructions,
        isFavorite: false,
        isArchived: false,
        cuisine: undefined,
        dietary: [],
        mealTypes: suggestions.mealTypes || [],
        author: result.recipe.author,
        nutrition: result.recipe.nutrition,
        importMethod: 'bulk_url',
      };

      // Check for duplicate after parsing
      if (isDuplicateUrl(url)) {
        return { status: 'duplicate' as const, recipe, confidence: result.recipe.confidence };
      }

      return { status: 'parsed' as const, recipe, confidence: result.recipe.confidence };
    }
    return { status: 'error' as const, error: result.error || 'Failed to parse' };
  };

  // --- URL Import ---

  const startUrlImport = useCallback(async (rawText: string) => {
    const urls = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && /^https?:\/\/.+/.test(line));

    // Deduplicate
    const unique = [...new Set(urls)].slice(0, MAX_URLS);

    if (unique.length === 0) {
      toast({ title: 'No valid URLs found', description: 'Paste URLs starting with http:// or https://, one per line.', variant: 'destructive' });
      return;
    }

    const initialItems: BulkImportItem[] = unique.map((url, i) => {
      // Mark duplicates upfront
      if (isDuplicateUrl(url)) {
        return {
          id: `url-${i}`,
          source: url,
          status: 'duplicate' as const,
          recipe: null,
          selected: false,
          error: 'Already in your recipes',
          confidence: undefined,
        };
      }
      return {
        id: `url-${i}`,
        source: url,
        status: 'pending' as const,
        recipe: null,
        selected: true,
        confidence: undefined,
      };
    });

    setItems(initialItems);
    setStep('processing');
    setCurrentIndex(0);
    abortRef.current = false;

    for (let i = 0; i < unique.length; i++) {
      if (abortRef.current) break;

      // Skip duplicates
      if (initialItems[i].status === 'duplicate') continue;

      setCurrentIndex(i);
      setItems(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'parsing' } : item
      ));

      try {
        const result = await processUrl(unique[i], `url-${i}`);
        if (result.status === 'parsed' || result.status === 'duplicate') {
          setItems(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: result.status, recipe: result.recipe, confidence: result.confidence, selected: result.status === 'parsed' } : item
          ));
        } else {
          setItems(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error', error: result.error, selected: false } : item
          ));
        }
      } catch (err) {
        console.error('Bulk import parse error:', err);
        setItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'error', error: err instanceof Error ? err.message : 'Unexpected error', selected: false } : item
        ));
      }

      // Delay between requests — respect Gemini API rate limits (~10 RPM free tier)
      if (i < unique.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    setStep('preview');
  }, [toast, isDuplicateUrl]);

  // --- Retry Failed ---

  const retryFailed = useCallback(async () => {
    const failedIndices = items
      .map((item, idx) => item.status === 'error' ? idx : -1)
      .filter(idx => idx !== -1);

    if (failedIndices.length === 0) return;

    setStep('processing');
    abortRef.current = false;

    for (const i of failedIndices) {
      if (abortRef.current) break;

      const item = items[i];
      setCurrentIndex(i);
      setItems(prev => prev.map((it, idx) =>
        idx === i ? { ...it, status: 'parsing', error: undefined } : it
      ));

      try {
        const result = await processUrl(item.source, item.id);
        if (result.status === 'parsed' || result.status === 'duplicate') {
          setItems(prev => prev.map((it, idx) =>
            idx === i ? { ...it, status: result.status, recipe: result.recipe, confidence: result.confidence, selected: result.status === 'parsed' } : it
          ));
        } else {
          setItems(prev => prev.map((it, idx) =>
            idx === i ? { ...it, status: 'error', error: result.error, selected: false } : it
          ));
        }
      } catch (err) {
        console.error('Bulk import retry error:', err);
        setItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'error', error: err instanceof Error ? err.message : 'Retry failed', selected: false } : it
        ));
      }

      if (!abortRef.current) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    setStep('preview');
  }, [items]);

  // --- CSV Import ---

  const startCsvImport = useCallback(async (file: File) => {
    setStep('processing');

    const result = await parseCsvFile(file);

    if (result.warnings.length > 0 && result.validRows === 0) {
      toast({ title: 'Could not parse CSV', description: result.warnings[0], variant: 'destructive' });
      setStep('input');
      return;
    }

    const importItems: BulkImportItem[] = result.items.map(item => ({
      id: item.id,
      source: item.source,
      status: item.recipe ? 'parsed' as const : 'error' as const,
      recipe: item.recipe,
      error: item.error,
      selected: !!item.recipe,
      confidence: item.recipe ? 'high' as const : undefined,
    }));

    setItems(importItems);
    setStep('preview');

    if (result.warnings.length > 0) {
      toast({
        title: `${result.warnings.length} row${result.warnings.length !== 1 ? 's' : ''} skipped`,
        description: result.warnings[0],
      });
    }
  }, [toast]);

  // --- Selection ---

  const toggleItem = useCallback((id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id && item.recipe ? { ...item, selected: !item.selected } : item
    ));
  }, []);

  const selectAll = useCallback(() => {
    setItems(prev => prev.map(item =>
      item.recipe ? { ...item, selected: true } : item
    ));
  }, []);

  const deselectAll = useCallback(() => {
    setItems(prev => prev.map(item => ({ ...item, selected: false })));
  }, []);

  // --- Save ---

  const saveSelected = useCallback(async () => {
    const toSave = items.filter(i => i.selected && i.recipe);
    if (toSave.length === 0) return;

    setStep('saving');
    setSavedCount(0);
    setErrorCount(0);
    abortRef.current = false;

    for (let i = 0; i < toSave.length; i++) {
      if (abortRef.current) break;

      const item = toSave[i];
      setItems(prev => prev.map(it =>
        it.id === item.id ? { ...it, status: 'saving' } : it
      ));

      const result = await addRecipe(item.recipe!);

      if (result) {
        setItems(prev => prev.map(it =>
          it.id === item.id ? { ...it, status: 'saved' } : it
        ));
        setSavedCount(c => c + 1);
      } else {
        setItems(prev => prev.map(it =>
          it.id === item.id ? { ...it, status: 'error', error: 'Failed to save' } : it
        ));
        setErrorCount(c => c + 1);
      }
    }

    setStep('complete');
  }, [items, addRecipe]);

  // --- Derived state ---

  const selectedCount = items.filter(i => i.selected && i.recipe).length;
  const parsedCount = items.filter(i => i.status === 'parsed' || i.status === 'saved').length;
  const failedCount = items.filter(i => i.status === 'error').length;
  const duplicateCount = items.filter(i => i.status === 'duplicate').length;
  const totalCount = items.length;

  return {
    step,
    items,
    currentIndex,
    savedCount,
    errorCount,
    selectedCount,
    parsedCount,
    failedCount,
    duplicateCount,
    totalCount,
    // Actions
    startUrlImport,
    startCsvImport,
    toggleItem,
    selectAll,
    deselectAll,
    saveSelected,
    retryFailed,
    cancel,
    reset,
  };
}
