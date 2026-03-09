import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChefHat, ExternalLink, Loader2, Check, X, Camera, ImagePlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RESERVED_USERNAMES = [
  'auth', 'settings', 'dashboard', 'recipes', 'plan', 'creator',
  'admin', 'api', 'app', 'meal-plan', 'shopping-list', 'terms',
  'privacy', 'landing', 'home', 'about', 'help', 'support',
];

const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB

export function CreatorSettings() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [isCreator, setIsCreator] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverPosition, setCoverPosition] = useState(50);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  // Initialize from profile
  useEffect(() => {
    if (profile) {
      setIsCreator(profile.is_creator || false);
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setCoverPosition(profile.cover_image_position ?? 50);
    }
  }, [profile]);

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const validateUsername = (value: string): boolean => {
    if (!value) return false;
    if (!USERNAME_REGEX.test(value)) return false;
    if (RESERVED_USERNAMES.includes(value)) return false;
    return true;
  };

  const checkUsernameAvailability = async (value: string) => {
    if (!validateUsername(value)) {
      setUsernameStatus('invalid');
      return;
    }

    // Don't check if it's the current username
    if (profile && profile.username === value) {
      setUsernameStatus('available');
      return;
    }

    setUsernameStatus('checking');

    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', value)
      .maybeSingle();

    setUsernameStatus(data ? 'taken' : 'available');
  };

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setUsername(cleaned);
    setUsernameStatus('idle');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_AVATAR_SIZE) {
      toast({ title: 'File too large', description: 'Profile photo must be under 2MB.', variant: 'destructive' });
      return;
    }

    setIsUploadingAvatar(true);
    const path = `${user.id}/avatar.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setIsUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    // Append timestamp to bust cache
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

    // Update profile directly so we can catch errors
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlWithCacheBust })
      .eq('user_id', user.id);

    if (dbError) {
      toast({ title: 'Failed to save', description: dbError.message, variant: 'destructive' });
      setIsUploadingAvatar(false);
      return;
    }

    // Sync local state
    await updateProfile({ avatar_url: urlWithCacheBust } as any);

    toast({ title: 'Profile photo updated' });
    setIsUploadingAvatar(false);

    // Reset input so same file can be re-selected
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_COVER_SIZE) {
      toast({ title: 'File too large', description: 'Cover photo must be under 5MB.', variant: 'destructive' });
      return;
    }

    setIsUploadingCover(true);
    const path = `${user.id}/cover.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setIsUploadingCover(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('covers')
      .getPublicUrl(path);

    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

    const { error: dbError } = await supabase
      .from('profiles')
      .update({ cover_image_url: urlWithCacheBust })
      .eq('user_id', user.id);

    if (dbError) {
      toast({ title: 'Failed to save', description: dbError.message, variant: 'destructive' });
      setIsUploadingCover(false);
      return;
    }

    await updateProfile({ cover_image_url: urlWithCacheBust } as any);

    toast({ title: 'Cover photo updated' });
    setIsUploadingCover(false);

    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleRemoveCover = async () => {
    await updateProfile({ cover_image_url: null } as any);
    toast({ title: 'Cover photo removed' });
  };

  const handleSave = async () => {
    if (isCreator && !validateUsername(username)) {
      toast({
        title: 'Invalid username',
        description: 'Username must be 3-30 characters, lowercase letters, numbers, and hyphens only.',
        variant: 'destructive',
      });
      return;
    }

    if (isCreator && usernameStatus === 'taken') {
      toast({
        title: 'Username taken',
        description: 'Please choose a different username.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    const updates: Record<string, unknown> = {
      is_creator: isCreator,
      bio: bio || null,
      cover_image_position: coverPosition,
    };

    if (isCreator && username) {
      updates.username = username;
    }

    await updateProfile(updates as any);

    toast({
      title: 'Creator settings saved',
      description: isCreator
        ? `Your profile is live at /creator/${username}`
        : 'Creator profile disabled.',
    });

    setIsSaving(false);
  };

  const profileUrl = username ? `${window.location.origin}/creator/${username}` : '';

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
        <div className="flex items-center gap-3">
          <ChefHat className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Creator profile</p>
            <p className="text-sm text-muted-foreground">
              Share meal plans publicly and build a following
            </p>
          </div>
        </div>
        <Switch
          checked={isCreator}
          onCheckedChange={setIsCreator}
        />
      </div>

      {isCreator && (
        <div className="space-y-4 pl-1">
          {/* Profile photo */}
          <div className="space-y-2">
            <Label>Profile photo</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || 'Avatar'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Change photo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG or PNG, max 2MB</p>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Cover photo */}
          <div className="space-y-2">
            <Label>Cover photo</Label>
            <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '3/1' }}>
              {profile?.cover_image_url ? (
                <img
                  src={profile.cover_image_url}
                  alt="Cover"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `center ${coverPosition}%` }}
                />
              ) : (
                <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #52B788 50%, #B7E4C7 100%)' }} />
              )}
              {isUploadingCover && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            {profile?.cover_image_url && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Reposition</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={coverPosition}
                  onChange={e => setCoverPosition(Number(e.target.value))}
                  className="flex-1 h-2 accent-primary cursor-pointer"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="gap-2"
              >
                <ImagePlus className="h-4 w-4" />
                {profile?.cover_image_url ? 'Change cover' : 'Add cover photo'}
              </Button>
              {profile?.cover_image_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCover}
                  className="gap-2 text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPG or PNG, max 5MB. Displayed as a banner on your profile.</p>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="creator-username">Username</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  id="creator-username"
                  value={username}
                  onChange={e => handleUsernameChange(e.target.value)}
                  onBlur={() => username && checkUsernameAvailability(username)}
                  placeholder="yourname"
                  className="pl-7"
                  maxLength={30}
                />
              </div>
              <div className="flex items-center w-8 justify-center">
                {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {usernameStatus === 'available' && <Check className="h-4 w-4 text-green-500" />}
                {usernameStatus === 'taken' && <X className="h-4 w-4 text-red-500" />}
                {usernameStatus === 'invalid' && <X className="h-4 w-4 text-amber-500" />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              3-30 characters. Lowercase letters, numbers, and hyphens.
            </p>
            {usernameStatus === 'taken' && (
              <p className="text-xs text-red-500">This username is already taken.</p>
            )}
            {usernameStatus === 'invalid' && username && (
              <p className="text-xs text-amber-500">
                {username.length < 3 ? 'Too short (min 3 characters).' :
                 !USERNAME_REGEX.test(username) ? 'Invalid format.' :
                 'This username is reserved.'}
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="creator-bio">Bio</Label>
            <Textarea
              id="creator-bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell people about your cooking style..."
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>

          {/* Preview link */}
          {username && usernameStatus === 'available' && (
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Your profile:</span>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {profileUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={isSaving || (isCreator && usernameStatus === 'taken')}
        className="w-full sm:w-auto"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Save creator settings'
        )}
      </Button>
    </div>
  );
}
