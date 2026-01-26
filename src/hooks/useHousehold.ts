import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type HouseholdRole = 'owner' | 'admin' | 'member';

export interface Household {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  } | null;
}

export interface HouseholdSettings {
  id: string;
  household_id: string;
  household_size: number;
  default_dinner_servings: number;
  suggest_leftovers_for_lunch: boolean;
  pantry_staples: string[];
  aisle_categories: string[] | null;
  dietary_restrictions: string[];
  allergens: string[];
  updated_at: string;
}

export function useHousehold() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [settings, setSettings] = useState<HouseholdSettings | null>(null);
  const [userRole, setUserRole] = useState<HouseholdRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's household
  const fetchHousehold = useCallback(async () => {
    if (!user) {
      setHousehold(null);
      setMembers([]);
      setSettings(null);
      setUserRole(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Get user's household membership
      const { data: membership, error: membershipError } = await supabase
        .from('household_members')
        .select(`
          household_id,
          role,
          households (
            id,
            name,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) {
        console.error('Error fetching household membership:', membershipError);
        setIsLoading(false);
        return;
      }

      if (!membership) {
        // User doesn't have a household
        setHousehold(null);
        setMembers([]);
        setSettings(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      const householdData = membership.households as unknown as Household;
      setHousehold(householdData);
      setUserRole(membership.role as HouseholdRole);

      // Fetch all members
      const { data: membersData, error: membersError } = await supabase
        .from('household_members')
        .select(`
          id,
          household_id,
          user_id,
          role,
          joined_at,
          profiles (
            display_name,
            email
          )
        `)
        .eq('household_id', householdData.id);

      if (membersError) {
        console.error('Error fetching household members:', membersError);
      } else {
        setMembers(membersData as unknown as HouseholdMember[]);
      }

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('household_settings')
        .select('*')
        .eq('household_id', householdData.id)
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching household settings:', settingsError);
      } else if (settingsData) {
        setSettings(settingsData as HouseholdSettings);
      }
    } catch (error) {
      console.error('Error in fetchHousehold:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  // Create a new household
  const createHousehold = async (name: string) => {
    if (!user) return null;

    try {
      // Create the household
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .insert({ name, created_by: user.id })
        .select()
        .single();

      if (householdError) {
        console.error('Error creating household:', householdError);
        toast({
          title: 'Error',
          description: 'Failed to create household',
          variant: 'destructive',
        });
        return null;
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: householdData.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) {
        console.error('Error adding owner to household:', memberError);
        // Cleanup: delete the household
        await supabase.from('households').delete().eq('id', householdData.id);
        toast({
          title: 'Error',
          description: 'Failed to create household',
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'Household created!',
        description: `"${name}" has been created. You can now invite others.`,
      });

      await fetchHousehold();
      return householdData;
    } catch (error) {
      console.error('Error in createHousehold:', error);
      toast({
        title: 'Error',
        description: 'Failed to create household',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Invite a member by email
  const inviteMember = async (email: string, role: HouseholdRole = 'member') => {
    if (!user || !household) return { error: 'No household' };
    if (userRole !== 'owner' && userRole !== 'admin') {
      return { error: 'Permission denied' };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look up user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('Error looking up user:', profileError);
      return { error: 'Failed to look up user' };
    }

    if (!profile) {
      toast({
        title: 'User not found',
        description: 'No user exists with that email address.',
        variant: 'destructive',
      });
      return { error: 'User not found' };
    }

    // Check if already a member
    const existingMember = members.find(m => m.user_id === profile.user_id);
    if (existingMember) {
      toast({
        title: 'Already a member',
        description: 'This user is already in your household.',
        variant: 'destructive',
      });
      return { error: 'Already a member' };
    }

    // Add member
    const { error: insertError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: profile.user_id,
        role,
      });

    if (insertError) {
      console.error('Error adding member:', insertError);
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive',
      });
      return { error: 'Failed to add member' };
    }

    toast({
      title: 'Member added!',
      description: `${normalizedEmail} has been added to your household.`,
    });

    await fetchHousehold();
    return { error: null };
  };

  // Remove a member
  const removeMember = async (memberId: string) => {
    if (!user || !household) return false;

    const memberToRemove = members.find(m => m.id === memberId);
    if (!memberToRemove) return false;

    // Can't remove the owner
    if (memberToRemove.role === 'owner') {
      toast({
        title: 'Cannot remove owner',
        description: 'The household owner cannot be removed.',
        variant: 'destructive',
      });
      return false;
    }

    // Check permissions
    if (memberToRemove.user_id !== user.id && userRole !== 'owner' && userRole !== 'admin') {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to remove this member.',
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Member removed',
      description: 'The member has been removed from the household.',
    });

    await fetchHousehold();
    return true;
  };

  // Update household settings
  const updateSettings = async (updates: Partial<HouseholdSettings>) => {
    if (!user || !household || !settings) return false;
    if (userRole !== 'owner' && userRole !== 'admin') {
      toast({
        title: 'Permission denied',
        description: 'Only owners and admins can update settings.',
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase
      .from('household_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    if (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
      return false;
    }

    setSettings(prev => prev ? { ...prev, ...updates } : prev);
    return true;
  };

  // Leave household
  const leaveHousehold = async () => {
    if (!user || !household) return false;

    // Owner can't leave - must transfer ownership or delete
    if (userRole === 'owner') {
      toast({
        title: 'Cannot leave',
        description: 'As the owner, you must transfer ownership or delete the household.',
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', household.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error leaving household:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave household',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Left household',
      description: 'You have left the household.',
    });

    setHousehold(null);
    setMembers([]);
    setSettings(null);
    setUserRole(null);
    return true;
  };

  // Delete household (owner only)
  const deleteHousehold = async () => {
    if (!user || !household) return false;

    if (userRole !== 'owner') {
      toast({
        title: 'Permission denied',
        description: 'Only the owner can delete the household.',
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase
      .from('households')
      .delete()
      .eq('id', household.id);

    if (error) {
      console.error('Error deleting household:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete household',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Household deleted',
      description: 'The household has been deleted.',
    });

    setHousehold(null);
    setMembers([]);
    setSettings(null);
    setUserRole(null);
    return true;
  };

  return {
    household,
    members,
    settings,
    userRole,
    isLoading,
    hasHousehold: !!household,
    isOwner: userRole === 'owner',
    isAdmin: userRole === 'admin' || userRole === 'owner',
    createHousehold,
    inviteMember,
    removeMember,
    updateSettings,
    leaveHousehold,
    deleteHousehold,
    refresh: fetchHousehold,
  };
}
