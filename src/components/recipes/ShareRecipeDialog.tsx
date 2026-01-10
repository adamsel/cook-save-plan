import { useState } from 'react';
import { Recipe } from '@/types/recipe';
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
import { Badge } from '@/components/ui/badge';
import { Globe, Lock, Copy, Check, Share2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  isPublic: boolean;
  onTogglePublic: (isPublic: boolean) => Promise<boolean>;
}

export function ShareRecipeDialog({
  open,
  onOpenChange,
  recipe,
  isPublic,
  onTogglePublic,
}: ShareRecipeDialogProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');

  if (!recipe) return null;

  const shareUrl = `${window.location.origin}/recipes?id=${recipe.id}`;

  const handleTogglePublic = async () => {
    setIsUpdating(true);
    const success = await onTogglePublic(!isPublic);
    if (success) {
      toast({
        title: isPublic ? 'Recipe made private' : 'Recipe made public',
        description: isPublic 
          ? 'Only you can see this recipe now.' 
          : 'Anyone with the link can now view this recipe.',
      });
    }
    setIsUpdating(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share this link with anyone to let them view the recipe.',
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

  const handleShareByEmail = () => {
    if (!email) return;
    // In a real app, this would send an invitation
    toast({
      title: 'Coming soon',
      description: 'Email sharing will be available in a future update.',
    });
    setEmail('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Recipe
          </DialogTitle>
          <DialogDescription>
            Share "{recipe.title}" with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {isPublic ? 'Public Recipe' : 'Private Recipe'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPublic 
                    ? 'Anyone can find and view this recipe' 
                    : 'Only you can see this recipe'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={isUpdating}
            />
          </div>

          {/* Share Link */}
          {isPublic && (
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

          {/* Share by Email (placeholder) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Share with specific people
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleShareByEmail}
                disabled={!email}
              >
                Invite
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Coming soon: Invite people by email to view or edit your recipe
            </p>
          </div>

          {/* Visibility Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {isPublic ? 'Public' : 'Private'}
            </Badge>
            {recipe.sourceUrl && (
              <Badge variant="secondary">Has source</Badge>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
