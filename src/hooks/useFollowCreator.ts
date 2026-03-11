import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useFollowCreator(creatorUserId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;

  const followQueryKey = ['creator-follow', creatorUserId, currentUserId];
  const countQueryKey = ['creator-followers', creatorUserId];

  // Check if current user follows this creator
  const { data: isFollowing = false } = useQuery({
    queryKey: followQueryKey,
    queryFn: async () => {
      if (!currentUserId || !creatorUserId) return false;
      const { data } = await supabase
        .from('creator_follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', creatorUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!currentUserId && !!creatorUserId,
  });

  // Get follower count
  const { data: followerCount = 0 } = useQuery({
    queryKey: countQueryKey,
    queryFn: async () => {
      if (!creatorUserId) return 0;
      const { count } = await supabase
        .from('creator_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', creatorUserId);
      return count ?? 0;
    },
    enabled: !!creatorUserId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId || !creatorUserId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('creator_follows')
        .insert({ follower_id: currentUserId, following_id: creatorUserId });
      if (error) throw error;

      // Notify the creator (fire-and-forget)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', currentUserId)
        .single();
      const followerName = profileData?.display_name || profileData?.username || 'Someone';
      supabase
        .from('notifications')
        .insert({
          user_id: creatorUserId,
          type: 'new_follower',
          data: {
            follower_name: followerName,
            follower_id: currentUserId,
            follower_username: profileData?.username || '',
          },
        })
        .then(() => {});
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: followQueryKey });
      await queryClient.cancelQueries({ queryKey: countQueryKey });
      const prevFollowing = queryClient.getQueryData<boolean>(followQueryKey);
      const prevCount = queryClient.getQueryData<number>(countQueryKey);
      queryClient.setQueryData(followQueryKey, true);
      queryClient.setQueryData(countQueryKey, (prevCount ?? 0) + 1);
      return { prevFollowing, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(followQueryKey, context.prevFollowing);
        queryClient.setQueryData(countQueryKey, context.prevCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: followQueryKey });
      queryClient.invalidateQueries({ queryKey: countQueryKey });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId || !creatorUserId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('creator_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', creatorUserId);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: followQueryKey });
      await queryClient.cancelQueries({ queryKey: countQueryKey });
      const prevFollowing = queryClient.getQueryData<boolean>(followQueryKey);
      const prevCount = queryClient.getQueryData<number>(countQueryKey);
      queryClient.setQueryData(followQueryKey, false);
      queryClient.setQueryData(countQueryKey, Math.max((prevCount ?? 1) - 1, 0));
      return { prevFollowing, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(followQueryKey, context.prevFollowing);
        queryClient.setQueryData(countQueryKey, context.prevCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: followQueryKey });
      queryClient.invalidateQueries({ queryKey: countQueryKey });
    },
  });

  return {
    isFollowing,
    followerCount,
    isAuthenticated: !!currentUserId,
    follow: () => followMutation.mutate(),
    unfollow: () => unfollowMutation.mutate(),
    isLoading: followMutation.isPending || unfollowMutation.isPending,
  };
}
