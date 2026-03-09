import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Globe, Lock, Copy, Check, Share2, Users, X, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecipeShare {
  id: string;
  shared_with_user_id: string;
  can_edit: boolean;
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
}

interface PendingShare {
  id: string;
  invited_email: string;
  can_edit: boolean;
  created_at: string;
}

interface ShareRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  isPublic: boolean;
  onTogglePublic: (isPublic: boolean) => Promise<boolean>;
  onShareByEmail?: (recipeId: string, email: string, canEdit?: boolean) => Promise<{ error: string | null; shared: boolean; pending: boolean }>;
  onGetShares?: (recipeId: string) => Promise<{ shares: RecipeShare[]; pendingShares: PendingShare[] }>;
  onRevokeShare?: (shareId: string) => Promise<boolean>;
  onRevokePendingShare?: (pendingShareId: string) => Promise<boolean>;
}

export function ShareRecipeDialog({
  open,
  onOpenChange,
  recipe,
  isPublic,
  onTogglePublic,
  onShareByEmail,
  onGetShares,
  onRevokeShare,
  onRevokePendingShare,
}: ShareRecipeDialogProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shares, setShares] = useState<RecipeShare[]>([]);
  const [pendingShares, setPendingShares] = useState<PendingShare[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  // Load existing shares when dialog opens
  useEffect(() => {
    if (open && recipe && onGetShares) {
      loadShares();
    }
  }, [open, recipe?.id]);

  const loadShares = async () => {
    if (!recipe || !onGetShares) return;
    setIsLoadingShares(true);
    try {
      const result = await onGetShares(recipe.id);
      setShares(result.shares);
      setPendingShares(result.pendingShares);
    } catch (error) {
      console.error('Failed to load shares:', error);
    } finally {
      setIsLoadingShares(false);
    }
  };

  if (!recipe) return null;

  const shareUrl = `${window.location.origin}/recipe/${recipe.id}`;

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

  const handleShareByEmail = async () => {
    if (!email || !recipe || !onShareByEmail) return;
    setIsSharing(true);
    try {
      const result = await onShareByEmail(recipe.id, email, canEdit);
      if (!result.error) {
        setEmail('');
        setCanEdit(false);
        await loadShares(); // Refresh the shares list
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!onRevokeShare) return;
    const success = await onRevokeShare(shareId);
    if (success) {
      setShares(prev => prev.filter(s => s.id !== shareId));
    }
  };

  const handleRevokePendingShare = async (pendingShareId: string) => {
    if (!onRevokePendingShare) return;
    const success = await onRevokePendingShare(pendingShareId);
    if (success) {
      setPendingShares(prev => prev.filter(s => s.id !== pendingShareId));
    }
  };

  const totalShares = shares.length + pendingShares.length;
  const sharingEnabled = !!onShareByEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
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
                    : 'Only you and people you share with can see this'}
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

          <Separator />

          {/* Share by Email */}
          <div className="space-y-3">
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
                onKeyDown={(e) => e.key === 'Enter' && handleShareByEmail()}
                disabled={!sharingEnabled}
              />
              <Button
                variant="outline"
                onClick={handleShareByEmail}
                disabled={!email || isSharing || !sharingEnabled}
              >
                {isSharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Invite'
                )}
              </Button>
            </div>
            {sharingEnabled ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="can-edit"
                  checked={canEdit}
                  onCheckedChange={setCanEdit}
                />
                <Label htmlFor="can-edit" className="text-sm text-muted-foreground">
                  Allow editing
                </Label>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sign in to share recipes with specific people
              </p>
            )}
          </div>

          {/* Existing Shares */}
          {(shares.length > 0 || pendingShares.length > 0) && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                  <span>Shared with ({totalShares})</span>
                  {isLoadingShares && <Loader2 className="h-3 w-3 animate-spin" />}
                </Label>

                <div className="space-y-2">
                  {/* Active shares */}
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {share.profiles?.display_name || share.profiles?.email || 'Unknown user'}
                          </p>
                          {share.profiles?.email && share.profiles?.display_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {share.profiles.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {share.can_edit && (
                          <Badge variant="secondary" className="text-xs">
                            Can edit
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRevokeShare(share.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Pending shares */}
                  {pendingShares.map((pending) => (
                    <div
                      key={pending.id}
                      className="flex items-center justify-between p-2 rounded-lg border border-dashed bg-muted/20"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {pending.invited_email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pending invitation
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pending.can_edit && (
                          <Badge variant="secondary" className="text-xs">
                            Can edit
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRevokePendingShare(pending.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Visibility Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {isPublic ? 'Public' : 'Private'}
            </Badge>
            {totalShares > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {totalShares} share{totalShares !== 1 ? 's' : ''}
              </Badge>
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
