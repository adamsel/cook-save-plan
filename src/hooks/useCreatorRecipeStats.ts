import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecipeStats {
  saveCount: number;
  planCount: number;
}

export function useCreatorRecipeStats(creatorUserId: string | undefined) {
  const query = useQuery({
    queryKey: ['creator-recipe-stats', creatorUserId],
    queryFn: async () => {
      if (!creatorUserId) return new Map<string, RecipeStats>();

      const { data, error } = await supabase.rpc('get_creator_recipe_stats', {
        creator_id: creatorUserId,
      });

      if (error || !data) return new Map<string, RecipeStats>();

      const map = new Map<string, RecipeStats>();
      for (const row of data as Record<string, unknown>[]) {
        map.set(row.recipe_id as string, {
          saveCount: Number(row.save_count),
          planCount: Number(row.plan_count),
        });
      }
      return map;
    },
    enabled: !!creatorUserId,
    staleTime: 5 * 60_000,
  });

  return { stats: query.data || new Map<string, RecipeStats>(), isLoading: query.isLoading };
}
