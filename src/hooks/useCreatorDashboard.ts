import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface DashboardStats {
  followerCount: number;
  newFollowers30d: number;
  publicRecipeCount: number;
  sharedPlanCount: number;
  recipeSaves: number;
  recipeViews: number;
  planViews: number;
  planClones: number;
}

export interface RecipeStatRow {
  recipeId: string;
  title: string;
  imageUrl: string | null;
  isPublic: boolean;
  saveCount: number;
  planAddCount: number;
  viewCount: number;
}

export interface PlanStatRow {
  planId: string;
  title: string;
  weekStartDate: string;
  viewCount: number;
  cloneCount: number;
}

export function useCreatorDashboard() {
  const { user } = useAuth();

  const overviewQuery = useQuery({
    queryKey: ['creator-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_creator_dashboard_stats', {
        creator_id: user.id,
      });

      if (error || !data) return null;

      const row = (data as Record<string, unknown>[])[0];
      if (!row) return null;

      return {
        followerCount: Number(row.follower_count),
        newFollowers30d: Number(row.new_followers_30d),
        publicRecipeCount: Number(row.public_recipe_count),
        sharedPlanCount: Number(row.shared_plan_count),
        recipeSaves: Number(row.recipe_saves),
        recipeViews: Number(row.recipe_views),
        planViews: Number(row.plan_views),
        planClones: Number(row.plan_clones),
      } as DashboardStats;
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  const recipeStatsQuery = useQuery({
    queryKey: ['creator-recipe-stats-detailed', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_creator_recipe_stats_detailed', {
        creator_id: user.id,
      });

      if (error || !data) return [];

      return (data as Record<string, unknown>[]).map((row) => ({
        recipeId: row.recipe_id as string,
        title: row.title as string,
        imageUrl: row.image_url as string | null,
        isPublic: row.is_public as boolean,
        saveCount: Number(row.save_count),
        planAddCount: Number(row.plan_add_count),
        viewCount: Number(row.view_count),
      })) as RecipeStatRow[];
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  const planStatsQuery = useQuery({
    queryKey: ['creator-plan-stats', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_creator_plan_stats', {
        creator_id: user.id,
      });

      if (error || !data) return [];

      return (data as Record<string, unknown>[]).map((row) => ({
        planId: row.plan_id as string,
        title: row.title as string,
        weekStartDate: row.week_start_date as string,
        viewCount: Number(row.view_count),
        cloneCount: Number(row.clone_count),
      })) as PlanStatRow[];
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  return {
    overview: overviewQuery.data,
    recipeStats: recipeStatsQuery.data || [],
    planStats: planStatsQuery.data || [],
    isLoading: overviewQuery.isLoading,
  };
}
