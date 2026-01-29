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

export function HouseholdManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
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
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-sm text-muted-foreground mb-4">
            Create a household to share meal plans and recipes with family members.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Household name (e.g., 'The Smiths')"
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
                'Create'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Has household - show management UI
  return (
    <div className="space-y-4">
      {/* Household Info */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">{household?.name}</h3>
          {getRoleBadge(userRole!)}
        </div>
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Members List */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Members</Label>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg bg-background border"
            >
              <div className="flex items-center gap-3">
                {getRoleIcon(member.role)}
                <div>
                  <p className="font-medium">
                    {member.profiles?.display_name || member.profiles?.email || 'Unknown User'}
                    {member.user_id === user.id && (
                      <span className="text-muted-foreground ml-2">(you)</span>
                    )}
                  </p>
                  {member.profiles?.email && member.profiles?.display_name && (
                    <p className="text-xs text-muted-foreground">{member.profiles.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getRoleBadge(member.role)}
                {/* Remove button - owners/admins can remove others (except owner), members can remove themselves */}
                {member.role !== 'owner' && (isAdmin || member.user_id === user.id) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
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
          <Label className="text-sm font-medium">Pending Invites</Label>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-dashed"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {formatDistanceToNow(new Date(invite.invited_at))} ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{invite.role}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => resendInvite(invite.id)}
                    title="Resend invitation"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
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
          <Label className="text-sm font-medium">Invite Member</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInviteMember()}
              className="flex-1"
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as HouseholdRole)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
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
          <p className="text-xs text-muted-foreground">
            If the user doesn't have an account, they'll receive an email invitation and be added automatically when they sign up.
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
                Leave Household
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave household?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will no longer have access to shared meal plans and recipes. You can be invited back later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={leaveHousehold}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Leave
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
                Delete Household
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete household?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All members will be removed and any shared data will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteHousehold}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
