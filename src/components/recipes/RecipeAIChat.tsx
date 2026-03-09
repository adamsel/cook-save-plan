import { useState, useRef, useEffect, useCallback } from 'react';
import { Recipe, Ingredient, RecipeNutrition } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Send, Loader2, Bot, User, Link as LinkIcon,
  ChefHat, Clock, Users, Check, Edit2,
  Sparkles, Camera, X, Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recipe?: ParsedRecipeData;
}

interface ParsedRecipeData {
  title: string;
  description?: string;
  imageUrl?: string;
  sourceUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: Array<{
    id: string;
    item: string;
    quantity: number | null;
    unit: string;
    notes?: string;
  }>;
  instructions: string[];
  category?: string;
  tags?: string[];
  nutrition?: {
    perServing: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
    source: 'ai_estimate';
    confidence: 'High' | 'Medium' | 'Low';
    notes?: string;
  };
}

interface RecipeAIChatProps {
  onRecipeReady: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recipe-chat`;

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function extractRecipeFromText(text: string): ParsedRecipeData | null {
  // Look for JSON code blocks
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed.type === 'recipe' && parsed.data) {
      return parsed.data as ParsedRecipeData;
    }
    // Handle if it's directly the recipe data
    if (parsed.title && parsed.ingredients) {
      return parsed as ParsedRecipeData;
    }
  } catch (e) {
    console.error('Failed to parse recipe JSON:', e);
  }
  return null;
}

function RecipePreviewCard({ recipe, onSave, onEdit }: { 
  recipe: ParsedRecipeData; 
  onSave: () => void;
  onEdit: () => void;
}) {
  return (
    <Card className="border-primary/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 truncate">
              <ChefHat className="h-5 w-5 text-primary flex-shrink-0" />
              {recipe.title}
            </CardTitle>
            {recipe.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
            )}
          </div>
          {recipe.imageUrl && (
            <img 
              src={recipe.imageUrl} 
              alt={recipe.title}
              className="w-16 h-16 rounded-md object-cover flex-shrink-0"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {recipe.prepTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Prep: {recipe.prepTime}m
            </span>
          )}
          {recipe.cookTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Cook: {recipe.cookTime}m
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {recipe.servings} servings
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {recipe.ingredients.length} ingredients • {recipe.instructions.length} steps
          </p>
          {recipe.category && <Badge variant="secondary">{recipe.category}</Badge>}
          {recipe.tags?.map(tag => (
            <Badge key={tag} variant="outline" className="ml-1">{tag}</Badge>
          ))}
        </div>

        {recipe.nutrition && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Nutrition per serving (estimated)
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span>{recipe.nutrition.perServing.calories} cal</span>
              <span>{recipe.nutrition.perServing.protein}g protein</span>
              <span>{recipe.nutrition.perServing.carbs}g carbs</span>
              <span>{recipe.nutrition.perServing.fat}g fat</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={onSave} className="flex-1" size="sm">
            <Check className="h-4 w-4 mr-1" />
            Save Recipe
          </Button>
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit2 className="h-4 w-4 mr-1" />
            Edit First
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecipeAIChat({ onRecipeReady, onCancel }: RecipeAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your recipe assistant. 🍳\n\nPaste a URL, type or paste recipe text, or attach a photo of a recipe — I'll extract and organize it. You can also describe a dish and I'll help create one from scratch!\n\nWhat would you like to add to your collection?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestRecipe, setLatestRecipe] = useState<ParsedRecipeData | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ file: File; preview: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const detectUrl = (text: string): string | null => {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : null;
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

  const handleAttachImage = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please use JPEG, PNG, or WebP images.', variant: 'destructive' });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please use an image under 3MB.', variant: 'destructive' });
      return;
    }
    setAttachedImage({ file, preview: URL.createObjectURL(file) });
  };

  const sendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    const hasImage = !!attachedImage;
    if ((!trimmedInput && !hasImage) || isLoading) return;

    const messageContent = trimmedInput || (hasImage ? 'Extract the recipe from this image.' : '');
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: hasImage ? `📷 ${messageContent}` : messageContent,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const currentImage = attachedImage;
    setAttachedImage(null);
    setIsLoading(true);

    // Detect URL in message
    const detectedUrl = detectUrl(trimmedInput);

    try {
      // Get the user's session token for authenticated requests
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to use the AI recipe assistant.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Build request body
      const requestBody: Record<string, unknown> = {
        messages: messages.filter(m => m.id !== 'welcome').concat({
          ...userMessage,
          content: messageContent, // Send without the camera emoji prefix
        }).map(m => ({
          role: m.role,
          content: m.content,
        })),
        url: detectedUrl,
      };

      // Attach image if present
      if (currentImage) {
        const base64 = await fileToBase64(currentImage.file);
        requestBody.image = { base64, mimeType: currentImage.file.type };
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      const assistantId = generateId();

      // Create initial assistant message
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m => 
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ));
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Try to extract recipe from response
      const extractedRecipe = extractRecipeFromText(assistantContent);
      if (extractedRecipe) {
        setLatestRecipe(extractedRecipe);
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, recipe: extractedRecipe } : m
        ));
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get response',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, toast, attachedImage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSaveRecipe = (recipe: ParsedRecipeData) => {
    // Convert to Recipe format
    const recipeToSave: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> = {
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      sourceUrl: recipe.sourceUrl,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: (recipe.prepTime || 0) + (recipe.cookTime || 0) || undefined,
      servings: recipe.servings || 4,
      category: recipe.category || '',
      tags: recipe.tags || [],
      ingredients: recipe.ingredients.map(ing => ({
        id: ing.id || `ing-${generateId()}`,
        item: ing.item,
        quantity: ing.quantity,
        unit: ing.unit || '',
        notes: ing.notes,
      })),
      instructions: recipe.instructions,
      isFavorite: false,
      isArchived: false,
      importMethod: 'text',
      mealTypes: [],
      nutrition: recipe.nutrition ? {
        perServing: recipe.nutrition.perServing,
        source: 'ai_estimate',
        confidence: recipe.nutrition.confidence,
        notes: recipe.nutrition.notes,
      } : undefined,
    };

    onRecipeReady(recipeToSave);
  };

  const handleEditRecipe = (recipe: ParsedRecipeData) => {
    // Save to state and let parent handle opening editor
    handleSaveRecipe(recipe);
  };

  // Remove JSON code blocks from display text
  const cleanMessageContent = (content: string): string => {
    return content.replace(/```json[\s\S]*?```/g, '').trim();
  };

  return (
    <div className="flex flex-col h-[70vh] max-h-[600px]">
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI Recipe Assistant</h2>
        </div>
        {/* Close button is provided by DialogContent, no need for duplicate */}
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 py-4">
        <div className="space-y-4 pr-4">
          {messages.map((message) => (
            <div key={message.id} className={cn(
              "flex gap-3",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[85%] space-y-2",
                message.role === 'user' ? "order-first" : ""
              )}>
                <div className={cn(
                  "rounded-lg px-4 py-2 text-sm",
                  message.role === 'user' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                )}>
                  <p className="whitespace-pre-wrap">{cleanMessageContent(message.content)}</p>
                </div>
                {message.recipe && (
                  <RecipePreviewCard 
                    recipe={message.recipe}
                    onSave={() => handleSaveRecipe(message.recipe!)}
                    onEdit={() => handleEditRecipe(message.recipe!)}
                  />
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="pt-3 border-t space-y-2">
        {attachedImage && (
          <div className="flex items-center gap-2 px-1">
            <div className="relative">
              <img
                src={attachedImage.preview}
                alt="Attached"
                className="h-14 w-14 rounded-lg object-cover border"
              />
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">Image attached — send to extract recipe</span>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={isLoading}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/jpeg,image/png,image/webp';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleAttachImage(file);
              };
              input.click();
            }}
            title="Attach a photo (cookbook page, recipe card, or screenshot)"
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachedImage ? "Add a note, or just hit send..." : "Paste a URL, recipe text, or describe what you want..."}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={(!input.trim() && !attachedImage) || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <LinkIcon className="h-3 w-3" />
          <span>Tip: Paste a URL, or attach a photo of a recipe</span>
        </div>
      </div>
    </div>
  );
}
