import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DiscoverCreator {
  userId: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  planCount: number;
}

export function useDiscoverCreators() {
  const { data: creators = [], isLoading } = useQuery({
    queryKey: ['discover-creators'],
    queryFn: async () => {
      // Fetch all creators with usernames
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, bio')
        .eq('is_creator', true)
        .not('username', 'is', null);

      if (error || !profiles) return [];

      // Get follower counts
      const userIds = profiles.map(p => p.user_id);

      const { data: followData } = await supabase
        .from('creator_follows')
        .select('following_id')
        .in('following_id', userIds);

      const followerCounts = new Map<string, number>();
      (followData || []).forEach(f => {
        followerCounts.set(f.following_id, (followerCounts.get(f.following_id) || 0) + 1);
      });

      // Get shared plan counts
      const { data: planData } = await supabase
        .from('meal_plans')
        .select('user_id')
        .in('user_id', userIds)
        .eq('is_shared', true);

      const planCounts = new Map<string, number>();
      (planData || []).forEach(p => {
        planCounts.set(p.user_id, (planCounts.get(p.user_id) || 0) + 1);
      });

      // Only include creators who have at least 1 shared plan
      const result: DiscoverCreator[] = profiles
        .filter(p => (planCounts.get(p.user_id) || 0) > 0)
        .map(p => ({
          userId: p.user_id,
          displayName: p.display_name,
          username: p.username!,
          avatarUrl: p.avatar_url,
          bio: p.bio,
          followerCount: followerCounts.get(p.user_id) || 0,
          planCount: planCounts.get(p.user_id) || 0,
        }))
        .sort((a, b) => b.followerCount - a.followerCount);

      return result;
    },
    staleTime: 60_000,
  });

  return { creators, isLoading };
}
