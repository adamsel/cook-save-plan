import { useState, useEffect, useCallback } from 'react';
import { Recipe, Ingredient, ImportMethod, ParsingConfidence, MealType, RecipeNutrition, NutritionInfo } from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
import { parseRecipeFromUrl, parseFromText, ParsedRecipe } from '@/lib/recipeParser';
import { suggestCategorization } from '@/lib/recipeSuggestions';
import { IngredientEditor, parseMultipleIngredients } from './IngredientEditor';
import { InstructionEditor, InstructionStep, parseMultipleInstructions } from './InstructionEditor';
import { RecipeAIChat } from './RecipeAIChat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Link, FileText, PenLine, Plus, X, Loader2,
  AlertCircle, CheckCircle, AlertTriangle, ArrowLeft,
  Sparkles, Clipboard, Zap, Camera, Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecipe?: Recipe | null;
}

type ImportStep = 'chat' | 'input' | 'review' | 'edit';

// Stable ID generator
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
};

export function AddRecipeDialog({ open, onOpenChange, editingRecipe }: AddRecipeDialogProps) {
  const { addRecipe, updateRecipe, categories, tags: availableTags, addTag } = useRecipes();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('url');
  const [isLoading, setIsLoading] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>('input');
  const [parseError, setParseError] = useState<string | null>(null);
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  
  // URL input
  const [url, setUrl] = useState('');
  
  // Pasted content
  const [pastedContent, setPastedContent] = useState('');
  
  // Parsed recipe data (for review)
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('4');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [instructions, setInstructions] = useState<InstructionStep[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>([]);
  const [importMethod, setImportMethod] = useState<ImportMethod>('manual');
  const [nutrition, setNutrition] = useState<RecipeNutrition | null>(null);
  const [isEstimatingNutrition, setIsEstimatingNutrition] = useState(false);

  // Photo import
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isExtractingFromPhoto, setIsExtractingFromPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // Suggested categorization
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  const createEmptyIngredient = useCallback((): Ingredient => ({
    id: `ing-${generateId()}`,
    item: '',
    quantity: null,
    unit: '',
    notes: undefined,
  }), []);

  const createEmptyInstruction = useCallback((): InstructionStep => ({
    id: `step-${generateId()}`,
    text: '',
  }), []);

  // Reset form when dialog opens/closes or when editing recipe changes
  useEffect(() => {
    if (open && editingRecipe) {
      // Load editing recipe data - ensure stable IDs
      setTitle(editingRecipe.title);
      setDescription(editingRecipe.description || '');
      setCategory(editingRecipe.category || '');
      setSelectedTags(editingRecipe.tags || []);
      setPrepTime(editingRecipe.prepTime?.toString() || '');
      setCookTime(editingRecipe.cookTime?.toString() || '');
      setServings(editingRecipe.servings.toString());
      setImageUrl(editingRecipe.imageUrl || '');
      setSourceUrl(editingRecipe.sourceUrl || '');
      
      // Ensure each ingredient has a stable ID
      const loadedIngredients = editingRecipe.ingredients.length > 0 
        ? editingRecipe.ingredients.map(i => ({
            ...i,
            id: i.id || `ing-${generateId()}`
          }))
        : [createEmptyIngredient()];
      setIngredients(loadedIngredients);
      
      // Convert string instructions to InstructionStep objects
      const loadedInstructions = editingRecipe.instructions.length > 0 
        ? editingRecipe.instructions.map(text => ({
            id: `step-${generateId()}`,
            text
          }))
        : [createEmptyInstruction()];
      setInstructions(loadedInstructions);
      
      setSelectedMealTypes(editingRecipe.mealTypes || []);
      setImportMethod(editingRecipe.importMethod || 'manual');
      setNutrition(editingRecipe.nutrition || null);
      setImportStep('edit');
    } else if (open) {
      resetForm();
    }
  }, [open, editingRecipe, createEmptyIngredient, createEmptyInstruction]);

  const resetForm = useCallback(() => {
    setUrl('');
    setPastedContent('');
    setParsedRecipe(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setSelectedTags([]);
    setNewTag('');
    setPrepTime('');
    setCookTime('');
    setServings('4');
    setImageUrl('');
    setSourceUrl('');
    setIngredients([createEmptyIngredient()]);
    setInstructions([createEmptyInstruction()]);
    setSelectedMealTypes([]);
    setImportMethod('manual');
    setNutrition(null);
    setImportStep('chat'); // Default to AI chat
    setParseError(null);
    setShowPasteFallback(false);
    setSuggestedCategory(null);
    setSuggestedTags([]);
    setActiveTab('url');
    setPhotoPreview(null);
    setPhotoFile(null);
    setIsExtractingFromPhoto(false);
    setIsDraggingPhoto(false);
  }, [createEmptyIngredient, createEmptyInstruction]);

  // Attempt to parse recipe from URL
  const handleParseUrl = async () => {
    if (!url) return;
    
    setIsLoading(true);
    setParseError(null);
    setShowPasteFallback(false);
    
    const result = await parseRecipeFromUrl(url);
    
    if (result.error === 'CORS_BLOCKED') {
      setShowPasteFallback(true);
      setParseError('Could not access this website directly. Please paste the recipe content below.');
      setIsLoading(false);
      return;
    }
    
    if (result.error || !result.recipe) {
      setParseError(result.error || 'Could not extract recipe from this page.');
      setShowPasteFallback(true);
      setIsLoading(false);
      return;
    }
    
    // Success - move to review step
    result.recipe.sourceUrl = url;
    setParsedRecipe(result.recipe);
    loadParsedRecipeIntoForm(result.recipe);
    setImportStep('review');
    setIsLoading(false);
  };

  // Parse from pasted text or HTML
  const handleParseContent = () => {
    if (!pastedContent.trim()) return;
    
    setIsLoading(true);
    
    const parsed = parseFromText(pastedContent);
    parsed.sourceUrl = url || undefined;
    
    setParsedRecipe(parsed);
    loadParsedRecipeIntoForm(parsed);
    setImportStep('review');
    setIsLoading(false);
  };

  // Load parsed recipe into form fields
  const loadParsedRecipeIntoForm = (recipe: ParsedRecipe) => {
    setTitle(recipe.title);
    setDescription(recipe.description || '');
    setImageUrl(recipe.imageUrl || '');
    setSourceUrl(recipe.sourceUrl || '');
    setPrepTime(recipe.prepTime?.toString() || '');
    setCookTime(recipe.cookTime?.toString() || '');
    setServings(recipe.servings?.toString() || '4');
    
    // Ensure stable IDs for ingredients
    const newIngredients = recipe.ingredients.length > 0 
      ? recipe.ingredients.map(i => ({
          ...i,
          id: i.id || `ing-${generateId()}`
        }))
      : [createEmptyIngredient()];
    setIngredients(newIngredients);
    
    // Convert instructions
    const newInstructions = recipe.instructions.length > 0 
      ? recipe.instructions.map(text => ({
          id: `step-${generateId()}`,
          text
        }))
      : [createEmptyInstruction()];
    setInstructions(newInstructions);
    
    setImportMethod(recipe.importMethod);
    
    
    // Check if parsed recipe has nutrition
    if (recipe.nutrition) {
      setNutrition(recipe.nutrition);
    }
    
    // Get suggestions
    const suggestions = suggestCategorization(recipe.title, recipe.description, recipe.ingredients);
    setSuggestedCategory(suggestions.category);
    setSuggestedTags(suggestions.tags);
    
    // Auto-apply suggestions
    if (suggestions.category && !category) {
      setCategory(suggestions.category);
    }
    if (suggestions.tags.length > 0) {
      setSelectedTags(prev => [...new Set([...prev, ...suggestions.tags.slice(0, 3)])]);
    }
    if (suggestions.mealTypes.length > 0) {
      setSelectedMealTypes(suggestions.mealTypes as MealType[]);
    }
  };

  // Handle starting manual entry
  const handleManualEntry = () => {
    setImportMethod('manual');
    setImportStep('edit');
    setIngredients([createEmptyIngredient()]);
    setInstructions([createEmptyInstruction()]);
  };

  // Tag management
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleAddNewTag = () => {
    if (newTag && !availableTags.includes(newTag)) {
      addTag(newTag);
    }
    if (newTag && !selectedTags.includes(newTag)) {
      setSelectedTags([...selectedTags, newTag]);
    }
    setNewTag('');
  };

  // Meal type selector (single-select: clicking a new one replaces the old one)
  const toggleMealType = (mealType: MealType) => {
    setSelectedMealTypes(prev =>
      prev.includes(mealType)
        ? [] // Clicking the already-selected one deselects it
        : [mealType] // Clicking a new one replaces any existing selection
    );
  };

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPastedContent(text);
      toast({ title: "Pasted from clipboard", description: "Recipe content ready to parse." });
    } catch {
      toast({ 
        title: "Could not access clipboard", 
        description: "Please paste manually using Ctrl+V or Cmd+V.",
        variant: "destructive"
      });
    }
  };

  // Estimate nutrition using AI
  const handleEstimateNutrition = async () => {
    const validIngredients = ingredients.filter(i => i.item.trim());
    if (validIngredients.length === 0) {
      toast({
        title: "No ingredients",
        description: "Add some ingredients first to estimate nutrition.",
        variant: "destructive",
      });
      return;
    }

    setIsEstimatingNutrition(true);

    // Format ingredients for the prompt
    const ingredientList = validIngredients
      .map(i => {
        let str = '';
        if (i.quantity) str += `${i.quantity} `;
        if (i.unit) str += `${i.unit} `;
        str += i.item;
        if (i.notes) str += ` (${i.notes})`;
        return str.trim();
      })
      .join('\n');

    const servingsNum = parseInt(servings) || 4;

    // Simulate AI estimation
    setTimeout(() => {
      const estimatedNutrition = estimateNutritionFromIngredients(ingredientList, validIngredients, servingsNum);
      setNutrition(estimatedNutrition);
      setIsEstimatingNutrition(false);
      toast({
        title: "Rough estimate generated",
        description: "These values are approximate. Edit manually for accuracy, or import a recipe with nutrition data.",
      });
    }, 1500);
  };

  // Simple nutrition estimation
  const estimateNutritionFromIngredients = (ingredientList: string, ings: Ingredient[], servingsNum: number): RecipeNutrition => {
    const lower = ingredientList.toLowerCase();
    
    let calories = 250;
    let protein = 15;
    let carbs = 30;
    let fat = 10;
    let fiber = 3;
    let sugar = 5;
    let sodium = 400;
    
    if (/chicken|turkey|beef|pork|lamb|fish|salmon|shrimp/.test(lower)) {
      protein += 20;
      calories += 150;
    }
    if (/pasta|rice|noodle|bread|flour/.test(lower)) {
      carbs += 40;
      calories += 200;
    }
    if (/butter|cream|cheese|oil/.test(lower)) {
      fat += 15;
      calories += 150;
    }
    if (/sugar|honey|syrup|chocolate/.test(lower)) {
      sugar += 15;
      carbs += 20;
      calories += 100;
    }
    if (/spinach|broccoli|lettuce|kale|vegetable/.test(lower)) {
      fiber += 4;
      calories -= 50;
    }
    if (/bean|lentil|chickpea|tofu/.test(lower)) {
      protein += 10;
      fiber += 5;
    }
    
    const notes: string[] = [];
    const hasAmbiguousQuantities = /to taste|pinch|some|few/.test(lower);
    const hasMissingQuantities = ings.some(i => i.item.trim() && !i.quantity);
    
    if (hasAmbiguousQuantities || hasMissingQuantities) {
      notes.push("Some ingredient quantities were assumed based on typical recipe amounts.");
    }
    
    const roundedCalories = Math.round(calories);

    return {
      perServing: {
        calories: roundedCalories,
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        fiber: Math.round(fiber),
        sugar: Math.round(sugar),
        sodium: Math.round(sodium),
      },
      source: 'ai_estimate',
      confidence: 'Low',
      verified: roundedCalories <= 1500,
      notes: 'Rough estimate based on ingredient types. Does not account for actual quantities.',
    };
  };

  // Update nutrition field
  const updateNutritionField = (field: keyof NutritionInfo, value: string) => {
    if (!nutrition) return;
    const numValue = parseFloat(value) || 0;
    setNutrition({
      ...nutrition,
      perServing: {
        ...nutrition.perServing,
        [field]: numValue,
      },
      source: nutrition.source === 'provided_by_site' ? 'manual' : nutrition.source,
    });
  };

  // Submit recipe
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a recipe title.",
        variant: "destructive",
      });
      return;
    }

    // Filter out empty ingredients and instructions
    const finalIngredients = ingredients.filter(i => i.item.trim());
    const finalInstructions = instructions.filter(i => i.text.trim()).map(i => i.text);

    const recipeData = {
      title: title.trim(),
      sourceUrl: sourceUrl || undefined,
      imageUrl: imageUrl || undefined,
      description: description || undefined,
      category,
      tags: selectedTags,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      totalTime: (prepTime || cookTime) ? (parseInt(prepTime || '0') + parseInt(cookTime || '0')) : undefined,
      servings: parseInt(servings) || 4,
      ingredients: finalIngredients,
      instructions: finalInstructions,
      isFavorite: editingRecipe?.isFavorite || false,
      isArchived: editingRecipe?.isArchived || false,
      importMethod,
      mealTypes: selectedMealTypes.length > 0 ? selectedMealTypes : undefined,
      rawImportSnapshot: parsedRecipe?.rawImportSnapshot,
      nutrition: nutrition || undefined,
    };

    if (editingRecipe) {
      await updateRecipe({ ...editingRecipe, ...recipeData });
    } else {
      const result = await addRecipe(recipeData);
      if (result?.isFirstRecipe) {
        toast({
          title: 'Recipe saved to your stash!',
          description: 'Now add it to your meal plan.',
        });
        resetForm();
        onOpenChange(false);
        navigate('/meal-plan');
        return;
      }
    }

    resetForm();
    onOpenChange(false);
  };

  // Confidence indicator component
  const ConfidenceIndicator = ({ confidence }: { confidence: ParsingConfidence }) => {
    const config = {
      high: { icon: CheckCircle, label: 'High confidence', color: 'text-green-600' },
      medium: { icon: AlertTriangle, label: 'Medium confidence', color: 'text-yellow-600' },
      low: { icon: AlertCircle, label: 'Low confidence', color: 'text-orange-600' },
    };
    const { icon: Icon, label, color } = config[confidence];
    
    return (
      <div className={cn("flex items-center gap-1.5 text-sm", color)}>
        <Icon className="h-4 w-4" />
        <span>{label}</span>
        <span className="text-muted-foreground">— please review</span>
      </div>
    );
  };

  // Nutrition section component
  const NutritionSection = () => (
    <div className="space-y-3 border rounded-lg p-4 bg-secondary/20">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          Nutrition per Serving
          {nutrition && (
            <Badge variant={nutrition.source === 'ai_estimate' ? 'secondary' : 'default'} className="text-xs">
              {nutrition.source === 'ai_estimate' && <Sparkles className="h-3 w-3 mr-1" />}
              {nutrition.source === 'provided_by_site' ? 'From source' : 
               nutrition.source === 'ai_estimate' ? 'Estimated' : 'Manual'}
            </Badge>
          )}
        </Label>
        {!nutrition && (
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={handleEstimateNutrition}
            disabled={isEstimatingNutrition}
          >
            {isEstimatingNutrition ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Estimate Nutrition
          </Button>
        )}
      </div>

      {nutrition && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Calories</Label>
              <Input
                type="number"
                value={nutrition.perServing.calories}
                onChange={(e) => updateNutritionField('calories', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Protein (g)</Label>
              <Input
                type="number"
                value={nutrition.perServing.protein}
                onChange={(e) => updateNutritionField('protein', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
              <Input
                type="number"
                value={nutrition.perServing.carbs}
                onChange={(e) => updateNutritionField('carbs', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fat (g)</Label>
              <Input
                type="number"
                value={nutrition.perServing.fat}
                onChange={(e) => updateNutritionField('fat', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fiber (g)</Label>
              <Input
                type="number"
                value={nutrition.perServing.fiber || 0}
                onChange={(e) => updateNutritionField('fiber', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sugar (g)</Label>
              <Input
                type="number"
                value={nutrition.perServing.sugar || 0}
                onChange={(e) => updateNutritionField('sugar', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sodium (mg)</Label>
              <Input
                type="number"
                value={nutrition.perServing.sodium || 0}
                onChange={(e) => updateNutritionField('sodium', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                className="text-xs"
                onClick={() => setNutrition(null)}
              >
                Clear
              </Button>
            </div>
          </div>
          {nutrition.source === 'ai_estimate' && (
            <p className="text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              {nutrition.confidence} confidence estimate. Values are approximate and not medical advice.
              {nutrition.notes && ` ${nutrition.notes}`}
            </p>
          )}
        </>
      )}
    </div>
  );

  // Photo import handlers
  const handlePhotoSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please use JPEG, PNG, or WebP images.', variant: 'destructive' });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please use an image under 3MB.', variant: 'destructive' });
      return;
    }
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleExtractFromPhoto = async () => {
    if (!photoFile) return;

    setIsExtractingFromPhoto(true);
    try {
      const base64 = await fileToBase64(photoFile);
      const session = (await supabase.auth.getSession()).data.session;
      const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recipe-chat`;

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Extract the recipe from this image.' }],
          image: { base64, mimeType: photoFile.type },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Failed to analyze image (${response.status})`);
      }

      // Parse SSE response
      const text = await response.text();
      let aiContent = '';
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(line.slice(6));
            aiContent += parsed.choices?.[0]?.delta?.content || '';
          } catch { /* skip */ }
        }
      }

      // Extract recipe JSON from AI response
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('Could not extract a recipe from this image. Try a clearer photo or paste the recipe text instead.');
      }

      const parsed = JSON.parse(jsonMatch[1]);
      const recipeData = parsed.type === 'recipe' && parsed.data ? parsed.data : parsed;

      if (!recipeData.title || !recipeData.ingredients) {
        throw new Error('The extracted data is incomplete. Try a clearer photo.');
      }

      // Load into form via the same path as AI chat
      handleAIRecipeReady({
        title: recipeData.title || '',
        description: recipeData.description || '',
        category: recipeData.category || '',
        tags: recipeData.tags || [],
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        totalTime: recipeData.totalTime,
        servings: recipeData.servings || 4,
        ingredients: (recipeData.ingredients || []).map((ing: any, i: number) => ({
          id: ing.id || `ing-${i + 1}`,
          item: ing.item || ing.name || '',
          quantity: ing.quantity ?? null,
          unit: ing.unit || '',
          notes: ing.notes,
        })),
        instructions: recipeData.instructions || [],
        isFavorite: false,
        isArchived: false,
        importMethod: 'photo' as ImportMethod,
        mealTypes: [],
        nutrition: recipeData.nutrition ? {
          perServing: recipeData.nutrition.perServing,
          source: 'ai_estimate' as const,
          confidence: recipeData.nutrition.confidence || 'Medium',
          notes: recipeData.nutrition.notes || 'Estimated from photo by AI',
        } : undefined,
        createdAt: '',
        updatedAt: '',
      });

      toast({ title: 'Recipe extracted', description: 'Review the details below and save when ready.' });
    } catch (error) {
      console.error('Photo extraction error:', error);
      toast({
        title: 'Extraction failed',
        description: error instanceof Error ? error.message : 'Could not extract recipe from image.',
        variant: 'destructive',
      });
    } finally {
      setIsExtractingFromPhoto(false);
    }
  };

  // Handle recipe from AI chat
  const handleAIRecipeReady = (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Load the AI-generated recipe into the edit form for final review
    setTitle(recipeData.title);
    setDescription(recipeData.description || '');
    setCategory(recipeData.category || '');
    setSelectedTags(recipeData.tags || []);
    setPrepTime(recipeData.prepTime?.toString() || '');
    setCookTime(recipeData.cookTime?.toString() || '');
    setServings(recipeData.servings.toString());
    setImageUrl(recipeData.imageUrl || '');
    setSourceUrl(recipeData.sourceUrl || '');
    
    // Ensure stable IDs for ingredients
    const loadedIngredients = recipeData.ingredients.length > 0 
      ? recipeData.ingredients.map(i => ({
          ...i,
          id: i.id || `ing-${generateId()}`
        }))
      : [createEmptyIngredient()];
    setIngredients(loadedIngredients);
    
    // Convert instructions to InstructionStep format
    const loadedInstructions = recipeData.instructions.length > 0 
      ? recipeData.instructions.map(text => ({
          id: `step-${generateId()}`,
          text
        }))
      : [createEmptyInstruction()];
    setInstructions(loadedInstructions);
    
    setSelectedMealTypes(recipeData.mealTypes || []);
    setImportMethod(recipeData.importMethod || 'text');
    setNutrition(recipeData.nutrition || null);
    
    // Move to edit form for final review
    setImportStep('edit');
  };

  // Input step content - defined as JSX to avoid remounting on state changes
  const inputStepContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="url" className="gap-1.5 text-xs sm:text-sm">
          <Link className="h-4 w-4" />
          <span className="hidden sm:inline">From</span> URL
        </TabsTrigger>
        <TabsTrigger value="paste" className="gap-1.5 text-xs sm:text-sm">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Paste</span> Text
        </TabsTrigger>
        <TabsTrigger value="photo" className="gap-1.5 text-xs sm:text-sm">
          <Camera className="h-4 w-4" />
          Photo
        </TabsTrigger>
        <TabsTrigger value="manual" className="gap-1.5 text-xs sm:text-sm">
          <PenLine className="h-4 w-4" />
          Manual
        </TabsTrigger>
      </TabsList>

      <TabsContent value="url" className="space-y-4 mt-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Recipe URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/recipe"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleParseUrl()}
              />
              <Button type="button" onClick={handleParseUrl} disabled={!url || isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              We'll extract the recipe automatically. Your recipes stay with you—we just help organize them.
            </p>
          </div>

          {parseError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{parseError}</p>
            </div>
          )}

          {showPasteFallback && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Paste recipe content</Label>
                <Button type="button" variant="ghost" size="sm" onClick={handlePasteFromClipboard}>
                  <Clipboard className="h-4 w-4 mr-2" />
                  Paste from clipboard
                </Button>
              </div>
              <Textarea
                placeholder="Copy the recipe from the website and paste it here. Include ingredients and instructions."
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                rows={8}
              />
              <Button type="button" onClick={handleParseContent} disabled={!pastedContent.trim()}>
                Parse Content
              </Button>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="paste" className="space-y-4 mt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Paste recipe text</Label>
            <Button type="button" variant="ghost" size="sm" onClick={handlePasteFromClipboard}>
              <Clipboard className="h-4 w-4 mr-2" />
              Paste from clipboard
            </Button>
          </div>
          <Textarea
            placeholder="Paste ingredients and instructions here. We'll parse them automatically.

Example:
Ingredients:
- 2 cups flour
- 1 tsp salt
- 1 cup water

Instructions:
1. Mix dry ingredients
2. Add water and stir
3. Knead until smooth"
            value={pastedContent}
            onChange={(e) => setPastedContent(e.target.value)}
            rows={12}
          />
          <Button type="button" onClick={handleParseContent} disabled={!pastedContent.trim()}>
            Parse Text
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="photo" className="space-y-4 mt-4">
        {!photoPreview ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
              isDraggingPhoto ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingPhoto(true); }}
            onDragLeave={() => setIsDraggingPhoto(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingPhoto(false);
              const file = e.dataTransfer.files[0];
              if (file) handlePhotoSelect(file);
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Upload a photo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cookbook page, recipe card, or Instagram screenshot
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/jpeg,image/png,image/webp';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handlePhotoSelect(file);
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handlePhotoSelect(file);
                    };
                    input.click();
                  }}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                or drop an image here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-secondary">
              <img
                src={photoPreview}
                alt="Recipe photo"
                className="w-full max-h-64 object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              onClick={handleExtractFromPhoto}
              disabled={isExtractingFromPhoto}
              className="w-full"
            >
              {isExtractingFromPhoto ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing image...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract Recipe
                </>
              )}
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="manual" className="mt-4">
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground">
            Start with a blank recipe form and enter everything manually.
          </p>
          <Button type="button" onClick={handleManualEntry}>
            <PenLine className="h-4 w-4 mr-2" />
            Start Manual Entry
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );

  // Review step content - defined as JSX to avoid remounting on state changes
  const reviewStepContent = !parsedRecipe ? null : (
      <div className="space-y-6 mt-4">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => setImportStep('input')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <ConfidenceIndicator confidence={parsedRecipe.confidence} />
        </div>

        {/* Title and image preview */}
        <div className="flex gap-4">
          {imageUrl && (
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
              <img 
                src={imageUrl} 
                alt={title} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>

        {/* Category (required) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Dish Type</Label>
            {suggestedCategory && category === suggestedCategory && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                Suggested
              </Badge>
            )}
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select dish type" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags with suggestions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Tags</Label>
            {suggestedTags.length > 0 && (
              <span className="text-xs text-muted-foreground">
                (suggested tags are pre-selected)
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Show all tags: availableTags + any recipe-specific tags */}
            {[...new Set([...availableTags, ...selectedTags])].map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  suggestedTags.includes(tag) && !selectedTags.includes(tag) && "border-primary/50"
                )}
                onClick={() => toggleTag(tag)}
              >
                {tag}
                {suggestedTags.includes(tag) && selectedTags.includes(tag) && (
                  <Sparkles className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Ingredients preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Ingredients ({ingredients.length})</Label>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-3 bg-secondary/30">
            {ingredients.map((ing, i) => (
              <div key={ing.id} className="flex items-center gap-2 text-sm group">
                <span className="text-muted-foreground w-8">{i + 1}.</span>
                <span className="flex-1">
                  {ing.quantity && <span className="font-medium">{ing.quantity}</span>}
                  {ing.unit && <span className="ml-1">{ing.unit}</span>}
                  <span className="ml-1">{ing.item}</span>
                  {ing.notes && <span className="text-muted-foreground ml-1">({ing.notes})</span>}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    if (ingredients.length > 1) {
                      setIngredients(prev => prev.filter(item => item.id !== ing.id));
                    }
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions preview */}
        <div className="space-y-2">
          <Label>Instructions ({instructions.length} steps)</Label>
          <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-3 bg-secondary/30">
            {instructions.map((inst, i) => (
              <div key={inst.id} className="flex items-start gap-2 text-sm group">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <span className="flex-1 leading-relaxed">{inst.text}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  onClick={() => {
                    if (instructions.length > 1) {
                      setInstructions(prev => prev.filter(item => item.id !== inst.id));
                    }
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Time and servings */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Prep (min)</Label>
            <Input 
              type="number" 
              value={prepTime} 
              onChange={(e) => setPrepTime(e.target.value)}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Cook (min)</Label>
            <Input 
              type="number" 
              value={cookTime} 
              onChange={(e) => setCookTime(e.target.value)}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Servings</Label>
            <Input 
              type="number" 
              value={servings} 
              onChange={(e) => setServings(e.target.value)}
              min="1"
            />
          </div>
        </div>

        {/* Nutrition section */}
        <NutritionSection />

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setImportStep('edit')}>
            Edit Details
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!title.trim()}>
              Save Recipe
            </Button>
          </div>
        </div>
      </div>
  );

  // Full edit form content - defined as JSX to avoid remounting on state changes
  const editFormContent = (
    <div className="space-y-6 mt-4">
      {importStep === 'edit' && !editingRecipe && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setImportStep('input')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="Recipe title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(!title.trim() && "border-destructive")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the recipe"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourceUrl">Source URL</Label>
          <Input
            id="sourceUrl"
            placeholder="https://example.com/recipe"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Dish Type</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select dish type" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

          <div className="space-y-2">
            <Label>Servings</Label>
            <Input
              type="number"
              min="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Prep Time (minutes)</Label>
            <Input
              type="number"
              min="0"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Cook Time (minutes)</Label>
            <Input
              type="number"
              min="0"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
            />
          </div>
        </div>

        {/* Meal Types */}
        <div className="space-y-2">
          <Label>Meal Types</Label>
          <div className="flex flex-wrap gap-2">
            {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map(mealType => (
              <Badge
                key={mealType}
                variant={selectedMealTypes.includes(mealType) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleMealType(mealType)}
              >
                {mealType}
              </Badge>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {/* Show all tags: availableTags + any recipe-specific tags */}
            {[...new Set([...availableTags, ...selectedTags])].map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add new tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewTag())}
            />
            <Button type="button" variant="outline" size="icon" onClick={handleAddNewTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Ingredients - using new editor */}
        <IngredientEditor
          ingredients={ingredients}
          onChange={setIngredients}
        />

        {/* Instructions - using new editor */}
        <InstructionEditor
          instructions={instructions}
          onChange={setInstructions}
        />

        {/* Nutrition section */}
        <NutritionSection />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!title.trim()}>
            {editingRecipe ? 'Update Recipe' : 'Save Recipe'}
          </Button>
        </div>
      </div>
  );

  // Render based on import step - returns JSX directly to avoid focus loss
  const renderContent = () => {
    if (editingRecipe) {
      return editFormContent;
    }

    switch (importStep) {
      case 'chat':
        return (
          <RecipeAIChat
            onRecipeReady={handleAIRecipeReady}
            onCancel={() => onOpenChange(false)}
          />
        );
      case 'input':
        return inputStepContent;
      case 'review':
        return reviewStepContent;
      case 'edit':
        return editFormContent;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-y-auto",
        importStep === 'chat' ? "max-w-3xl" : "max-w-2xl"
      )}>
        {importStep !== 'chat' && (
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editingRecipe ? 'Edit Recipe' : importStep === 'edit' ? 'Review & Save Recipe' : 'Add New Recipe'}
            </DialogTitle>
          </DialogHeader>
        )}

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
