import { useState, useEffect } from 'react';
import { MealPlan, Recipe } from '@/types/recipe';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Lock, Copy, Check, Share2, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlan: MealPlan | null;
  recipes: Recipe[];
  onShare: (planId: string, title?: string, description?: string) => Promise<{ shareSlug: string } | null>;
  onUnshare: (planId: string) => Promise<boolean>;
  onGetShareInfo: (planId: string) => Promise<{ isShared: boolean; shareSlug: string | null; title: string | null; description: string | null } | null>;
  onMakeRecipesPublic: (recipeIds: string[]) => Promise<boolean>;
}

export function ShareMealPlanDialog({
  open,
  onOpenChange,
  mealPlan,
  recipes,
  onShare,
  onUnshare,
  onGetShareInfo,
  onMakeRecipesPublic,
}: ShareMealPlanDialogProps) {
  const { toast } = useToast();
  const [isShared, setIsShared] = useState(false);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load share info when dialog opens
  useEffect(() => {
    if (open && mealPlan) {
      loadShareInfo();
    }
  }, [open, mealPlan?.id]);

  const loadShareInfo = async () => {
    if (!mealPlan) return;
    setIsLoading(true);
    const info = await onGetShareInfo(mealPlan.id);
    if (info) {
      setIsShared(info.isShared);
      setShareSlug(info.shareSlug);
      setTitle(info.title || '');
      setDescription(info.description || '');
    }
    setIsLoading(false);
  };

  if (!mealPlan) return null;

  // Find which recipes in this plan are still private
  const planRecipeIds = [...new Set(mealPlan.items.map(item => item.recipeId))];
  const privateRecipes = recipes.filter(
    r => planRecipeIds.includes(r.id) && !r.isPublic
  );

  const shareUrl = shareSlug
    ? `${window.location.origin}/plan/${shareSlug}`
    : '';

  const handleToggleShared = async () => {
    setIsUpdating(true);

    if (!isShared) {
      // Publishing: make private recipes public first
      if (privateRecipes.length > 0) {
        const success = await onMakeRecipesPublic(privateRecipes.map(r => r.id));
        if (!success) {
          setIsUpdating(false);
          return;
        }
      }

      const result = await onShare(mealPlan.id, title || undefined, description || undefined);
      if (result) {
        setIsShared(true);
        setShareSlug(result.shareSlug);
        toast({
          title: 'Meal plan shared!',
          description: 'Anyone with the link can now view this meal plan.',
        });
      }
    } else {
      const success = await onUnshare(mealPlan.id);
      if (success) {
        setIsShared(false);
        toast({
          title: 'Meal plan unshared',
          description: 'This meal plan is now private.',
        });
      }
    }

    setIsUpdating(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share this link so others can view your meal plan.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Could not copy',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Meal Plan
          </DialogTitle>
          <DialogDescription>
            Share your weekly meal plan so others can clone it
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Title & Description (show before sharing or when already shared) */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="plan-title">Plan title</Label>
                <Input
                  id="plan-title"
                  placeholder="e.g. Week 12: Spring Refresh"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isShared}
                />
              </div>
              <div>
                <Label htmlFor="plan-description">Description (optional)</Label>
                <Textarea
                  id="plan-description"
                  placeholder="A quick note about this week's plan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isShared}
                  rows={2}
                />
              </div>
            </div>

            {/* Private recipes warning */}
            {!isShared && privateRecipes.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {privateRecipes.length} recipe{privateRecipes.length !== 1 ? 's' : ''} will be made public
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    {privateRecipes.map(r => r.title).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                {isShared ? (
                  <Globe className="h-5 w-5 text-primary" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {isShared ? 'Shared publicly' : 'Private'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isShared
                      ? 'Anyone with the link can view and clone this plan'
                      : 'Only you can see this meal plan'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isShared}
                onCheckedChange={handleToggleShared}
                disabled={isUpdating}
              />
            </div>

            {/* Share Link */}
            {isShared && shareUrl && (
              <div className="space-y-2">
                <Label>Share link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Plan summary */}
            <div className="text-sm text-muted-foreground">
              {mealPlan.items.length} meal{mealPlan.items.length !== 1 ? 's' : ''} across {planRecipeIds.length} recipe{planRecipeIds.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
