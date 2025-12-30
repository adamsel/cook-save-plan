import { useState } from 'react';
import { Recipe, Ingredient } from '@/types/recipe';
import { useRecipes } from '@/context/RecipeContext';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Link, FileText, PenLine, Plus, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecipe?: Recipe | null;
}

export function AddRecipeDialog({ open, onOpenChange, editingRecipe }: AddRecipeDialogProps) {
  const { addRecipe, updateRecipe, categories, tags: availableTags, addTag } = useRecipes();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('url');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [title, setTitle] = useState(editingRecipe?.title || '');
  const [description, setDescription] = useState(editingRecipe?.description || '');
  const [category, setCategory] = useState(editingRecipe?.category || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(editingRecipe?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [prepTime, setPrepTime] = useState(editingRecipe?.prepTime?.toString() || '');
  const [cookTime, setCookTime] = useState(editingRecipe?.cookTime?.toString() || '');
  const [servings, setServings] = useState(editingRecipe?.servings?.toString() || '4');
  const [imageUrl, setImageUrl] = useState(editingRecipe?.imageUrl || '');
  const [sourceUrl, setSourceUrl] = useState(editingRecipe?.sourceUrl || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    editingRecipe?.ingredients || [{ id: '1', item: '', quantity: null, unit: '', notes: '' }]
  );
  const [instructions, setInstructions] = useState<string[]>(
    editingRecipe?.instructions || ['']
  );

  const resetForm = () => {
    setUrl('');
    setPastedText('');
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
    setIngredients([{ id: '1', item: '', quantity: null, unit: '', notes: '' }]);
    setInstructions(['']);
  };

  const handleParseUrl = async () => {
    if (!url) return;
    
    setIsLoading(true);
    
    // Simulate URL parsing (in a real app, this would call a backend API)
    setTimeout(() => {
      // Mock parsed data
      setTitle('Recipe from ' + new URL(url).hostname);
      setSourceUrl(url);
      setDescription('Imported recipe - please review and update the details.');
      setActiveTab('manual');
      setIsLoading(false);
      
      toast({
        title: "URL imported",
        description: "Recipe details have been prefilled. Please review and complete the form.",
      });
    }, 1500);
  };

  const handleParseText = () => {
    if (!pastedText) return;
    
    // Simple text parsing - split into ingredients and instructions
    const lines = pastedText.split('\n').filter(l => l.trim());
    const parsedIngredients: Ingredient[] = [];
    const parsedInstructions: string[] = [];
    
    let isInstructions = false;
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes('instruction') || trimmed.toLowerCase().includes('direction') || trimmed.toLowerCase().includes('step')) {
        isInstructions = true;
        return;
      }
      
      if (isInstructions || /^\d+\./.test(trimmed)) {
        parsedInstructions.push(trimmed.replace(/^\d+\.\s*/, ''));
      } else if (trimmed) {
        parsedIngredients.push({
          id: `parsed-${index}`,
          item: trimmed,
          quantity: null,
          unit: '',
          notes: '',
        });
      }
    });
    
    if (parsedIngredients.length > 0) {
      setIngredients(parsedIngredients);
    }
    if (parsedInstructions.length > 0) {
      setInstructions(parsedInstructions);
    }
    
    setActiveTab('manual');
    toast({
      title: "Text parsed",
      description: "Ingredients and instructions have been extracted. Please review.",
    });
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: Date.now().toString(), item: '', quantity: null, unit: '', notes: '' }
    ]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string | number | null) => {
    setIngredients(ingredients.map(i => 
      i.id === id ? { ...i, [field]: value } : i
    ));
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const updateInstruction = (index: number, value: string) => {
    setInstructions(instructions.map((inst, i) => i === index ? value : inst));
  };

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

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a recipe title.",
        variant: "destructive",
      });
      return;
    }

    const recipeData = {
      title: title.trim(),
      sourceUrl: sourceUrl || undefined,
      imageUrl: imageUrl || undefined,
      description: description || undefined,
      category: category || 'Other',
      tags: selectedTags,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      totalTime: (prepTime || cookTime) ? (parseInt(prepTime || '0') + parseInt(cookTime || '0')) : undefined,
      servings: parseInt(servings) || 4,
      ingredients: ingredients.filter(i => i.item.trim()),
      instructions: instructions.filter(i => i.trim()),
      isFavorite: editingRecipe?.isFavorite || false,
      isArchived: editingRecipe?.isArchived || false,
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

        {!editingRecipe && (
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
              <div className="space-y-2">
                <Label>Recipe URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/recipe"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <Button onClick={handleParseUrl} disabled={!url || isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Paste a recipe URL and we'll try to extract the details automatically.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="paste" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Paste recipe text</Label>
                <Textarea
                  placeholder="Paste your recipe ingredients and instructions here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={8}
                />
                <Button onClick={handleParseText} disabled={!pastedText}>
                  Parse Text
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <ManualForm />
            </TabsContent>
          </Tabs>
        )}

        {editingRecipe && <ManualForm />}
      </DialogContent>
    </Dialog>
  );

  function ManualForm() {
    return (
      <div className="space-y-6">
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
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
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
          <Button onClick={handleSubmit}>
            {editingRecipe ? 'Save Changes' : 'Add Recipe'}
          </Button>
        </div>
      </div>
    );
  }
}
