import { useState, useRef, useCallback, KeyboardEvent, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { GripVertical, Plus, X, Clipboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Generate stable IDs
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `step-${crypto.randomUUID()}`;
  }
  return `step-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
};

export interface InstructionStep {
  id: string;
  text: string;
}

interface InstructionEditorProps {
  instructions: InstructionStep[];
  onChange: (instructions: InstructionStep[]) => void;
}

// Parse multiple lines into instruction steps
export const parseMultipleInstructions = (text: string): InstructionStep[] => {
  const lines = text.split('\n');
  const steps: InstructionStep[] = [];

  for (const line of lines) {
    // Clean up line - remove numbers, "Step X:", etc.
    let cleaned = line.trim();
    cleaned = cleaned.replace(/^(\d+[.)]\s*|step\s*\d+:?\s*)/i, '');
    cleaned = cleaned.trim();

    if (cleaned) {
      steps.push({
        id: generateId(),
        text: cleaned,
      });
    }
  }

  return steps;
};

// Single instruction row - memoized
interface InstructionRowProps {
  instruction: InstructionStep;
  index: number;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>, id: string) => void;
  canRemove: boolean;
  textareaRef?: (el: HTMLTextAreaElement | null) => void;
}

const InstructionRow = memo(function InstructionRow({
  instruction,
  index,
  onUpdate,
  onRemove,
  onKeyDown,
  canRemove,
  textareaRef,
}: InstructionRowProps) {
  return (
    <div className="flex items-start gap-2 group">
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium mt-1">
        {index + 1}
      </span>
      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-3" />
      <Textarea
        ref={textareaRef}
        placeholder={`Step ${index + 1}`}
        className="flex-1 min-h-[60px]"
        value={instruction.text}
        onChange={(e) => onUpdate(instruction.id, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, instruction.id)}
        rows={2}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
        onClick={() => onRemove(instruction.id)}
        disabled={!canRemove}
        tabIndex={-1}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
});

export function InstructionEditor({ instructions, onChange }: InstructionEditorProps) {
  const { toast } = useToast();
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Create empty step
  const createEmpty = useCallback((): InstructionStep => ({
    id: generateId(),
    text: '',
  }), []);

  // Add new row
  const addRow = useCallback(() => {
    const newStep = createEmpty();
    onChange([...instructions, newStep]);
    setTimeout(() => {
      textareaRefs.current.get(newStep.id)?.focus();
    }, 0);
  }, [instructions, onChange, createEmpty]);

  // Remove row
  const removeRow = useCallback((id: string) => {
    if (instructions.length <= 1) return;
    onChange(instructions.filter(i => i.id !== id));
  }, [instructions, onChange]);

  // Update step text
  const updateRow = useCallback((id: string, text: string) => {
    onChange(instructions.map(i => i.id === id ? { ...i, text } : i));
  }, [instructions, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>, id: string) => {
    const idx = instructions.findIndex(i => i.id === id);
    if (idx === -1) return;

    // Only handle Enter without Shift (Shift+Enter for newline within step)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newStep = createEmpty();
      const newList = [...instructions];
      newList.splice(idx + 1, 0, newStep);
      onChange(newList);
      setTimeout(() => {
        textareaRefs.current.get(newStep.id)?.focus();
      }, 0);
    } else if (e.key === 'Backspace') {
      const step = instructions[idx];
      // If empty and not only row, delete on backspace at start
      const textarea = e.currentTarget;
      if (step.text === '' && instructions.length > 1 && textarea.selectionStart === 0) {
        e.preventDefault();
        removeRow(id);
        if (idx > 0) {
          const prevId = instructions[idx - 1].id;
          setTimeout(() => {
            textareaRefs.current.get(prevId)?.focus();
          }, 0);
        }
      }
    }
  }, [instructions, onChange, createEmpty, removeRow]);

  // Handle paste submit
  const handlePasteSubmit = useCallback(() => {
    if (!pasteText.trim()) return;

    const parsed = parseMultipleInstructions(pasteText);
    if (parsed.length === 0) {
      toast({
        title: 'No instructions found',
        description: 'Could not parse any steps from the pasted text.',
        variant: 'destructive',
      });
      return;
    }

    const hasContent = instructions.some(i => i.text.trim());
    if (hasContent) {
      onChange([...instructions.filter(i => i.text.trim()), ...parsed]);
    } else {
      onChange(parsed);
    }

    setPasteText('');
    setShowPasteModal(false);
    toast({
      title: 'Instructions added',
      description: `Added ${parsed.length} step${parsed.length > 1 ? 's' : ''}.`,
    });
  }, [pasteText, instructions, onChange, toast]);

  // Clipboard paste
  const handleClipboardPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPasteText(text);
    } catch {
      toast({
        title: 'Could not access clipboard',
        description: 'Please paste manually.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Store refs
  const setTextareaRef = useCallback((id: string) => (el: HTMLTextAreaElement | null) => {
    if (el) {
      textareaRefs.current.set(id, el);
    } else {
      textareaRefs.current.delete(id);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Instructions</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPasteModal(true)}
        >
          <Clipboard className="h-4 w-4 mr-2" />
          Paste Instructions
        </Button>
      </div>

      {/* Instruction rows */}
      <div className="space-y-3">
        {instructions.map((instruction, idx) => (
          <InstructionRow
            key={instruction.id}
            instruction={instruction}
            index={idx}
            onUpdate={updateRow}
            onRemove={removeRow}
            onKeyDown={handleKeyDown}
            canRemove={instructions.length > 1}
            textareaRef={setTextareaRef(instruction.id)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-2" />
        Add Step
      </Button>

      {/* Paste modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">Paste Instructions</h3>
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
              Paste your instructions below. Each line or numbered step will become a separate instruction step.
            </p>
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={handleClipboardPaste}>
                <Clipboard className="h-4 w-4 mr-2" />
                Paste from clipboard
              </Button>
            </div>
            <Textarea
              placeholder={`Example:
1. Preheat oven to 350°F
2. Mix dry ingredients
3. Add wet ingredients and stir
4. Bake for 25 minutes`}
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
                Add Instructions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
