import { useState, useRef, useCallback, KeyboardEvent, memo } from 'react';
import { Ingredient } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { GripVertical, Plus, X, Clipboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Generate stable IDs using crypto.randomUUID or fallback
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `ing-${crypto.randomUUID()}`;
  }
  return `ing-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
};

interface IngredientEditorProps {
  ingredients: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
}

// Parse a single line of ingredient text into structured format
const parseIngredientText = (text: string, id: string): Ingredient => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { id, item: '', quantity: null, unit: '', notes: undefined };
  }

  // Pattern: quantity unit item (notes)
  const quantityPattern = /^([\d\/\.\,\s]+(?:[\-–][\d\/\.\,\s]+)?)\s*([a-zA-Z]+\.?)?\s+(.+)$/;
  const match = trimmed.match(quantityPattern);

  if (match) {
    const quantityStr = match[1].trim().replace(',', '.');
    let quantity: number | null = null;
    
    if (quantityStr.includes('/')) {
      const parts = quantityStr.split('/');
      if (parts.length === 2) {
        quantity = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    } else {
      quantity = parseFloat(quantityStr);
    }

    const unit = match[2]?.toLowerCase() || '';
    const item = match[3].trim();

    // Check for notes in parentheses
    const notesMatch = item.match(/^(.+?)\s*\((.+?)\)\s*$/);

    return {
      id,
      quantity: isNaN(quantity!) ? null : quantity,
      unit,
      item: notesMatch ? notesMatch[1].trim() : item,
      notes: notesMatch ? notesMatch[2].trim() : undefined,
    };
  }

  return {
    id,
    quantity: null,
    unit: '',
    item: trimmed,
    notes: undefined,
  };
};

// Parse multiple lines into ingredients
export const parseMultipleIngredients = (text: string): Ingredient[] => {
  const lines = text.split('\n');
  const ingredients: Ingredient[] = [];

  for (const line of lines) {
    // Clean up line - remove bullets, numbers at start
    let cleaned = line.trim();
    cleaned = cleaned.replace(/^[-•*]\s*/, ''); // Remove bullets
    cleaned = cleaned.replace(/^\d+[.)]\s*/, ''); // Remove numbered list markers
    cleaned = cleaned.trim();

    if (cleaned) {
      const id = generateId();
      ingredients.push(parseIngredientText(cleaned, id));
    }
  }

  return ingredients;
};

// Single ingredient row - memoized to prevent re-renders
interface IngredientRowProps {
  ingredient: Ingredient;
  index: number;
  onUpdate: (id: string, updates: Partial<Ingredient>) => void;
  onRemove: (id: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>, id: string, field: string) => void;
  canRemove: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
}

const IngredientRow = memo(function IngredientRow({
  ingredient,
  index,
  onUpdate,
  onRemove,
  onKeyDown,
  canRemove,
  inputRef,
}: IngredientRowProps) {
  return (
    <div className="flex items-center gap-2 group">
      <span className="text-muted-foreground text-sm w-6 flex-shrink-0">{index + 1}.</span>
      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <Input
        placeholder="Qty"
        className="w-16 h-9"
        type="text"
        inputMode="decimal"
        value={ingredient.quantity ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          const num = val ? parseFloat(val) : null;
          onUpdate(ingredient.id, { quantity: val === '' ? null : (isNaN(num!) ? null : num) });
        }}
        onKeyDown={(e) => onKeyDown(e, ingredient.id, 'quantity')}
      />
      <Input
        placeholder="Unit"
        className="w-20 h-9"
        value={ingredient.unit}
        onChange={(e) => onUpdate(ingredient.id, { unit: e.target.value })}
        onKeyDown={(e) => onKeyDown(e, ingredient.id, 'unit')}
      />
      <Input
        ref={inputRef}
        placeholder="Ingredient name"
        className="flex-1 h-9"
        value={ingredient.item}
        onChange={(e) => onUpdate(ingredient.id, { item: e.target.value })}
        onKeyDown={(e) => onKeyDown(e, ingredient.id, 'item')}
      />
      <Input
        placeholder="Notes"
        className="w-28 h-9"
        value={ingredient.notes || ''}
        onChange={(e) => onUpdate(ingredient.id, { notes: e.target.value || undefined })}
        onKeyDown={(e) => onKeyDown(e, ingredient.id, 'notes')}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(ingredient.id)}
        disabled={!canRemove}
        tabIndex={-1}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
});

export function IngredientEditor({ ingredients, onChange }: IngredientEditorProps) {
  const { toast } = useToast();
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Create empty ingredient with stable ID
  const createEmpty = useCallback((): Ingredient => ({
    id: generateId(),
    item: '',
    quantity: null,
    unit: '',
    notes: undefined,
  }), []);

  // Add new row
  const addRow = useCallback(() => {
    const newIng = createEmpty();
    onChange([...ingredients, newIng]);
    // Focus the new row's item input after render
    setTimeout(() => {
      inputRefs.current.get(newIng.id)?.focus();
    }, 0);
  }, [ingredients, onChange, createEmpty]);

  // Remove row
  const removeRow = useCallback((id: string) => {
    if (ingredients.length <= 1) return;
    onChange(ingredients.filter(i => i.id !== id));
  }, [ingredients, onChange]);

  // Update single ingredient field
  const updateRow = useCallback((id: string, updates: Partial<Ingredient>) => {
    onChange(ingredients.map(i => i.id === id ? { ...i, ...updates } : i));
  }, [ingredients, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, id: string, field: string) => {
    const idx = ingredients.findIndex(i => i.id === id);
    if (idx === -1) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      // Add new row after this one
      const newIng = createEmpty();
      const newList = [...ingredients];
      newList.splice(idx + 1, 0, newIng);
      onChange(newList);
      setTimeout(() => {
        inputRefs.current.get(newIng.id)?.focus();
      }, 0);
    } else if (e.key === 'Backspace' && field === 'quantity') {
      const ing = ingredients[idx];
      // If this row is completely empty and not the only row, delete it
      if (!ing.item && !ing.unit && (ing.quantity === null || ing.quantity === undefined) && !ing.notes) {
        if (ingredients.length > 1) {
          e.preventDefault();
          removeRow(id);
          // Focus previous row if exists
          if (idx > 0) {
            const prevId = ingredients[idx - 1].id;
            setTimeout(() => {
              inputRefs.current.get(prevId)?.focus();
            }, 0);
          }
        }
      }
    }
  }, [ingredients, onChange, createEmpty, removeRow]);

  // Handle paste from modal
  const handlePasteSubmit = useCallback(() => {
    if (!pasteText.trim()) return;

    const parsed = parseMultipleIngredients(pasteText);
    if (parsed.length === 0) {
      toast({
        title: 'No ingredients found',
        description: 'Could not parse any ingredients from the pasted text.',
        variant: 'destructive',
      });
      return;
    }

    // Replace empty ingredients or add to existing
    const hasContent = ingredients.some(i => i.item.trim());
    if (hasContent) {
      onChange([...ingredients.filter(i => i.item.trim()), ...parsed]);
    } else {
      onChange(parsed);
    }

    setPasteText('');
    setShowPasteModal(false);
    toast({
      title: 'Ingredients added',
      description: `Added ${parsed.length} ingredient${parsed.length > 1 ? 's' : ''}.`,
    });
  }, [pasteText, ingredients, onChange, toast]);

  // Clipboard paste
  const handleClipboardPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPasteText(text);
    } catch {
      toast({
        title: 'Could not access clipboard',
        description: 'Please paste manually using Ctrl+V or Cmd+V.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Store ref for each row's item input
  const setInputRef = useCallback((id: string) => (el: HTMLInputElement | null) => {
    if (el) {
      inputRefs.current.set(id, el);
    } else {
      inputRefs.current.delete(id);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Ingredients</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPasteModal(true)}
        >
          <Clipboard className="h-4 w-4 mr-2" />
          Paste Ingredients
        </Button>
      </div>

      {/* Ingredient rows */}
      <div className="space-y-2">
        {ingredients.map((ingredient, idx) => (
          <IngredientRow
            key={ingredient.id}
            ingredient={ingredient}
            index={idx}
            onUpdate={updateRow}
            onRemove={removeRow}
            onKeyDown={handleKeyDown}
            canRemove={ingredients.length > 1}
            inputRef={setInputRef(ingredient.id)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-2" />
        Add Ingredient
      </Button>

      {/* Paste modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">Paste Ingredients</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPasteModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste your ingredient list below. Each line will become a separate ingredient.
              Bullet points and numbers will be automatically removed.
            </p>
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={handleClipboardPaste}>
                <Clipboard className="h-4 w-4 mr-2" />
                Paste from clipboard
              </Button>
            </div>
            <Textarea
              placeholder={`Example:
- 2 cups flour
- 1 tsp salt
- 1/2 cup butter, softened
- 3 eggs`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowPasteModal(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handlePasteSubmit} disabled={!pasteText.trim()}>
                Add Ingredients
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
