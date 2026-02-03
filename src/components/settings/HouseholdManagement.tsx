import { useState } from 'react';
import { useHousehold, type HouseholdRole } from '@/hooks/useHousehold';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Trash2,
  LogOut,
  Loader2,
  Clock,
  RefreshCw,
  X,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function HouseholdManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const {
    household,
    members,
    pendingInvites,
    userRole,
    isLoading,
    hasHousehold,
    isOwner,
    isAdmin,
    createHousehold,
    inviteMember,
    removeMember,
    leaveHousehold,
    deleteHousehold,
    cancelPendingInvite,
    resendInvite,
  } = useHousehold();

  const [householdName, setHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<HouseholdRole>('member');
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  if (!user) {
    return (
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
        <p className="text-muted-foreground">Sign in to create or join a household</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-muted-foreground">Loading household...</span>
      </div>
    );
  }

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) return;
    setIsCreating(true);
    await createHousehold(householdName.trim());
    setHouseholdName('');
    setIsCreating(false);
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    const result = await inviteMember(inviteEmail.trim(), inviteRole);
    if (!result.error) {
      setInviteEmail('');
      setInviteRole('member');
    }
    setIsInviting(false);
  };

  const getRoleIcon = (role: HouseholdRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: HouseholdRole) => {
    const variants: Record<HouseholdRole, 'default' | 'secondary' | 'outline'> = {
      owner: 'default',
      admin: 'secondary',
      member: 'outline',
    };
    return (
      <Badge variant={variants[role]} className="gap-1 capitalize">
        {getRoleIcon(role)}
        {role}
      </Badge>
    );
  };

  // No household - show creation UI
  if (!hasHousehold) {
    return (
      <div className="space-y-3 md:space-y-4">
        <div className="p-3 md:p-4 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-sm text-muted-foreground mb-3 md:mb-4">
            You're planning solo right now. Want to share the load with someone?
          </p>
          <div className="flex gap-2">
            <Input
              placeholder={isMobile ? "Name your space..." : "A name for your shared space (e.g., 'Home')"}
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateHousehold()}
            />
            <Button
              onClick={handleCreateHousehold}
              disabled={!householdName.trim() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Set up sharing'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Has household - show management UI
  return (
    <div className="space-y-3 md:space-y-4">
      {/* Household Info */}
      <div className="p-3 md:p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className={cn(
          "mb-2",
          isMobile ? "space-y-1.5" : "flex items-center justify-between"
        )}>
          <h3 className={cn("font-semibold", isMobile ? "text-base" : "text-lg")}>{household?.name}</h3>
          {getRoleBadge(userRole!)}
        </div>
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Members List */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Planning together</Label>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className={cn(
                "rounded-lg bg-background border",
                isMobile ? "p-2 space-y-2" : "p-3 flex items-center justify-between"
              )}
            >
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                {getRoleIcon(member.role)}
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium truncate", isMobile && "text-sm")}>
                    {member.profiles?.display_name || member.profiles?.email || 'Unknown User'}
                    {member.user_id === user.id && (
                      <span className="text-muted-foreground ml-1 md:ml-2">(you)</span>
                    )}
                  </p>
                  {member.profiles?.email && member.profiles?.display_name && (
                    <p className="text-xs text-muted-foreground truncate">{member.profiles.email}</p>
                  )}
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-2",
                isMobile && "justify-between"
              )}>
                {getRoleBadge(member.role)}
                {/* Remove button - owners/admins can remove others (except owner), members can remove themselves */}
                {member.role !== 'owner' && (isAdmin || member.user_id === user.id) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove member?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {member.user_id === user.id
                            ? 'Are you sure you want to leave this household?'
                            : `Are you sure you want to remove ${member.profiles?.display_name || member.profiles?.email || 'this member'} from the household?`
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            if (member.user_id === user.id) {
                              leaveHousehold();
                            } else {
                              removeMember(member.id);
                            }
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {member.user_id === user.id ? 'Leave' : 'Remove'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites - only visible to admins/owners */}
      {isAdmin && pendingInvites.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Waiting to hear back</Label>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className={cn(
                  "rounded-lg bg-muted/50 border border-dashed",
                  isMobile ? "p-2 space-y-2" : "p-3 flex items-center justify-between"
                )}
              >
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className={cn("font-medium truncate", isMobile && "text-sm")}>{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {formatDistanceToNow(new Date(invite.invited_at))} ago
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 md:gap-2",
                  isMobile && "justify-between"
                )}>
                  <Badge variant="outline" className={cn("capitalize", isMobile && "text-xs")}>{invite.role}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 md:h-8 md:w-8"
                    onClick={() => resendInvite(invite.id)}
                    title="Resend invitation"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 md:h-8 md:w-8 text-destructive"
                    onClick={() => cancelPendingInvite(invite.id)}
                    title="Cancel invitation"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Member - only for admins/owners */}
      {isAdmin && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Share with someone</Label>
          <div className={cn(
            "gap-2",
            isMobile ? "space-y-2" : "flex"
          )}>
            <Input
              placeholder="Their email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInviteMember()}
              className={cn(!isMobile && "flex-1")}
            />
            <div className="flex gap-2">
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as HouseholdRole)}>
                <SelectTrigger className={cn(isMobile ? "flex-1" : "w-28")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Can view</SelectItem>
                  <SelectItem value="admin">Can edit</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleInviteMember}
                disabled={!inviteEmail.trim() || isInviting}
              >
                {isInviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            They'll get an email to join. No pressure—they can ignore it.
          </p>
        </div>
      )}

      {/* Danger Zone - Leave or Delete */}
      <div className="pt-4 border-t space-y-2">
        {!isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2 text-destructive border-destructive/50 hover:bg-destructive/10">
                <LogOut className="h-4 w-4" />
                Stop sharing
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Stop sharing?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll go back to planning solo. Your recipes stay with you.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={leaveHousehold}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Stop sharing
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="h-4 w-4" />
                Remove shared space
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove shared space?</AlertDialogTitle>
                <AlertDialogDescription>
                  This can't be undone. Everyone will go back to planning solo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteHousehold}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
