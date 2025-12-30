import { useState, useEffect } from 'react';
import { Recipe, Ingredient, ImportMethod, ParsingConfidence, MealType } from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
import { parseRecipeFromUrl, parseFromText, ParsedRecipe, parseIngredientLine } from '@/lib/recipeParser';
import { suggestCategorization } from '@/lib/recipeSuggestions';
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
  Sparkles, Clipboard, GripVertical, Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecipe?: Recipe | null;
}

type ImportStep = 'input' | 'review' | 'edit';

export function AddRecipeDialog({ open, onOpenChange, editingRecipe }: AddRecipeDialogProps) {
  const { addRecipe, updateRecipe, categories, tags: availableTags, addTag } = useRecipes();
  const { toast } = useToast();
  
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
  const [instructions, setInstructions] = useState<string[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>([]);
  const [importMethod, setImportMethod] = useState<ImportMethod>('manual');
  
  // Suggested categorization
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Reset form when dialog opens/closes or when editing recipe changes
  useEffect(() => {
    if (open && editingRecipe) {
      // Load editing recipe data
      setTitle(editingRecipe.title);
      setDescription(editingRecipe.description || '');
      setCategory(editingRecipe.category);
      setSelectedTags(editingRecipe.tags);
      setPrepTime(editingRecipe.prepTime?.toString() || '');
      setCookTime(editingRecipe.cookTime?.toString() || '');
      setServings(editingRecipe.servings.toString());
      setImageUrl(editingRecipe.imageUrl || '');
      setSourceUrl(editingRecipe.sourceUrl || '');
      setIngredients(editingRecipe.ingredients.length > 0 ? editingRecipe.ingredients : [createEmptyIngredient()]);
      setInstructions(editingRecipe.instructions.length > 0 ? editingRecipe.instructions : ['']);
      setSelectedMealTypes(editingRecipe.mealTypes || []);
      setImportMethod(editingRecipe.importMethod || 'manual');
      setImportStep('edit');
    } else if (open) {
      resetForm();
    }
  }, [open, editingRecipe]);

  const createEmptyIngredient = (): Ingredient => ({
    id: Date.now().toString(),
    item: '',
    quantity: null,
    unit: '',
    notes: '',
  });

  const resetForm = () => {
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
    setInstructions(['']);
    setSelectedMealTypes([]);
    setImportMethod('manual');
    setImportStep('input');
    setParseError(null);
    setShowPasteFallback(false);
    setSuggestedCategory(null);
    setSuggestedTags([]);
    setActiveTab('url');
  };

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
    setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [createEmptyIngredient()]);
    setInstructions(recipe.instructions.length > 0 ? recipe.instructions : ['']);
    setImportMethod(recipe.importMethod);
    
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
    setInstructions(['']);
  };

  // Ingredient management
  const addIngredient = () => {
    setIngredients([...ingredients, createEmptyIngredient()]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(i => i.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string | number | null) => {
    setIngredients(ingredients.map(i => 
      i.id === id ? { ...i, [field]: value } : i
    ));
  };

  // Instruction management
  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const updateInstruction = (index: number, value: string) => {
    setInstructions(instructions.map((inst, i) => i === index ? value : inst));
  };

  const moveInstruction = (fromIndex: number, toIndex: number) => {
    const newInstructions = [...instructions];
    const [removed] = newInstructions.splice(fromIndex, 1);
    newInstructions.splice(toIndex, 0, removed);
    setInstructions(newInstructions);
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

  // Meal type toggle
  const toggleMealType = (mealType: MealType) => {
    setSelectedMealTypes(prev =>
      prev.includes(mealType)
        ? prev.filter(m => m !== mealType)
        : [...prev, mealType]
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

  // Submit recipe
  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a recipe title.",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Category required",
        description: "Please select a category for this recipe.",
        variant: "destructive",
      });
      return;
    }

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
      ingredients: ingredients.filter(i => i.item.trim()),
      instructions: instructions.filter(i => i.trim()),
      isFavorite: editingRecipe?.isFavorite || false,
      isArchived: editingRecipe?.isArchived || false,
      importMethod,
      mealTypes: selectedMealTypes.length > 0 ? selectedMealTypes : undefined,
      rawImportSnapshot: parsedRecipe?.rawImportSnapshot,
    };

    if (editingRecipe) {
      updateRecipe({ ...editingRecipe, ...recipeData });
      toast({ title: "Recipe updated", description: `"${title}" has been updated.` });
    } else {
      addRecipe(recipeData);
      toast({ title: "Recipe added", description: `"${title}" has been added to your stash.` });
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

  // Render based on import step
  const renderContent = () => {
    // When editing, go straight to edit form
    if (editingRecipe) {
      return <EditForm />;
    }

    switch (importStep) {
      case 'input':
        return <InputStep />;
      case 'review':
        return <ReviewStep />;
      case 'edit':
        return <EditForm />;
    }
  };

  // Input step - URL or paste text
  function InputStep() {
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="url" className="gap-2">
            <Link className="h-4 w-4" />
            From URL
          </TabsTrigger>
          <TabsTrigger value="paste" className="gap-2">
            <FileText className="h-4 w-4" />
            Paste Text
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
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
                <Button onClick={handleParseUrl} disabled={!url || isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                We'll extract ingredients, instructions, and more automatically.
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
                  <Button variant="ghost" size="sm" onClick={handlePasteFromClipboard}>
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
                <Button onClick={handleParseContent} disabled={!pastedContent.trim()}>
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
              <Button variant="ghost" size="sm" onClick={handlePasteFromClipboard}>
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
            <Button onClick={handleParseContent} disabled={!pastedContent.trim()}>
              Parse Text
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              Start with a blank recipe form and enter everything manually.
            </p>
            <Button onClick={handleManualEntry}>
              <PenLine className="h-4 w-4 mr-2" />
              Start Manual Entry
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    );
  }

  // Review step - show parsed data with edit options
  function ReviewStep() {
    if (!parsedRecipe) return null;

    return (
      <div className="space-y-6 mt-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setImportStep('input')}>
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
            <Label>Category *</Label>
            {suggestedCategory && category === suggestedCategory && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                Suggested
              </Badge>
            )}
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className={cn(!category && "border-destructive")}>
              <SelectValue placeholder="Select category (required)" />
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
            {availableTags.map(tag => (
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
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => removeIngredient(ing.id)}
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
              <div key={i} className="flex items-start gap-2 text-sm group">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <span className="flex-1 leading-relaxed">{inst}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  onClick={() => removeInstruction(i)}
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

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setImportStep('edit')}>
            Edit Details
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!category}>
              Save Recipe
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full edit form
  function EditForm() {
    return (
      <div className="space-y-6 mt-4">
        {importStep === 'edit' && !editingRecipe && (
          <Button variant="ghost" size="sm" onClick={() => setImportStep('input')}>
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
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className={cn(!category && "border-destructive")}>
                <SelectValue placeholder="Select category" />
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
            {availableTags.map(tag => (
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
            <Button variant="outline" size="icon" onClick={handleAddNewTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Ingredients */}
        <div className="space-y-3">
          <Label>Ingredients</Label>
          {ingredients.map((ingredient, index) => (
            <div key={ingredient.id} className="flex gap-2">
              <Input
                placeholder="Qty"
                className="w-16"
                value={ingredient.quantity || ''}
                onChange={(e) => updateIngredient(ingredient.id, 'quantity', e.target.value ? parseFloat(e.target.value) : null)}
              />
              <Input
                placeholder="Unit"
                className="w-20"
                value={ingredient.unit}
                onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
              />
              <Input
                placeholder="Ingredient"
                className="flex-1"
                value={ingredient.item}
                onChange={(e) => updateIngredient(ingredient.id, 'item', e.target.value)}
              />
              <Input
                placeholder="Notes"
                className="w-24"
                value={ingredient.notes || ''}
                onChange={(e) => updateIngredient(ingredient.id, 'notes', e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(ingredient.id)}
                disabled={ingredients.length === 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addIngredient}>
            <Plus className="h-4 w-4 mr-2" />
            Add Ingredient
          </Button>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <Label>Instructions</Label>
          {instructions.map((instruction, index) => (
            <div key={index} className="flex gap-2">
              <span className="flex items-center justify-center w-8 h-10 rounded-lg bg-secondary text-sm font-medium">
                {index + 1}
              </span>
              <Textarea
                placeholder={`Step ${index + 1}`}
                className="flex-1"
                value={instruction}
                onChange={(e) => updateInstruction(index, e.target.value)}
                rows={2}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeInstruction(index)}
                disabled={instructions.length === 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addInstruction}>
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!category}>
            {editingRecipe ? 'Update Recipe' : 'Save Recipe'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}
          </DialogTitle>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
