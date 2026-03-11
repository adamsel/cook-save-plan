import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface FeedItem {
  contentType: 'recipe' | 'meal_plan';
  contentId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  totalTime: number | null;
  servings: number | null;
  cuisine: string | null;
  tags: string[];
  publishedAt: string;
  saveCount: number;
  creatorUserId: string;
  creatorDisplayName: string | null;
  creatorUsername: string | null;
  creatorAvatarUrl: string | null;
}

export function useFollowingFeed(limit = 20, offset = 0) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['following-feed', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_following_feed', {
        requesting_user_id: user.id,
        result_limit: limit,
        result_offset: offset,
      });

      if (error || !data) return [];

      return (data as Record<string, unknown>[]).map((row) => ({
        contentType: row.content_type as 'recipe' | 'meal_plan',
        contentId: row.content_id as string,
        title: row.title as string,
        description: row.description as string | null,
        imageUrl: row.image_url as string | null,
        totalTime: row.total_time as number | null,
        servings: row.servings as number | null,
        cuisine: row.cuisine as string | null,
        tags: (row.tags as string[]) || [],
        publishedAt: row.published_at as string,
        saveCount: Number(row.save_count),
        creatorUserId: row.creator_user_id as string,
        creatorDisplayName: row.creator_display_name as string | null,
        creatorUsername: row.creator_username as string | null,
        creatorAvatarUrl: row.creator_avatar_url as string | null,
      })) as FeedItem[];
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });
}
