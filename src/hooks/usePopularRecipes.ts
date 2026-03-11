import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PopularRecipe {
  recipeId: string;
  title: string;
  imageUrl: string | null;
  description: string | null;
  totalTime: number | null;
  servings: number;
  cuisine: string | null;
  tags: string[];
  dietary: string[];
  mealTypes: string[];
  saveCount: number;
  planCount: number;
  popularityScore: number;
  creatorUserId: string;
  creatorDisplayName: string | null;
  creatorUsername: string | null;
  creatorAvatarUrl: string | null;
}

export function usePopularRecipes(limit = 12, daysWindow = 30) {
  return useQuery({
    queryKey: ['popular-recipes', limit, daysWindow],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_popular_recipes', {
        result_limit: limit,
        days_window: daysWindow,
      });

      if (error || !data) return [];

      return (data as Record<string, unknown>[]).map((row) => ({
        recipeId: row.recipe_id as string,
        title: row.title as string,
        imageUrl: row.image_url as string | null,
        description: row.description as string | null,
        totalTime: row.total_time as number | null,
        servings: row.servings as number,
        cuisine: row.cuisine as string | null,
        tags: (row.tags as string[]) || [],
        dietary: (row.dietary as string[]) || [],
        mealTypes: (row.meal_types as string[]) || [],
        saveCount: Number(row.save_count),
        planCount: Number(row.plan_count),
        popularityScore: Number(row.popularity_score),
        creatorUserId: row.creator_user_id as string,
        creatorDisplayName: row.creator_display_name as string | null,
        creatorUsername: row.creator_username as string | null,
        creatorAvatarUrl: row.creator_avatar_url as string | null,
      })) as PopularRecipe[];
    },
    staleTime: 5 * 60_000,
  });
}
