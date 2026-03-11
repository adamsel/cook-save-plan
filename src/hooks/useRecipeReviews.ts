import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface RecipeRating {
  averageRating: number | null;
  reviewCount: number;
}

export interface Review {
  id: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export function useRecipeReviews(recipeId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const ratingQuery = useQuery({
    queryKey: ['recipe-rating', recipeId],
    queryFn: async () => {
      if (!recipeId) return { averageRating: null, reviewCount: 0 };

      const { data, error } = await supabase.rpc('get_recipe_rating', {
        target_recipe_id: recipeId,
      });

      if (error || !data || (data as Record<string, unknown>[]).length === 0) {
        return { averageRating: null, reviewCount: 0 };
      }

      const row = (data as Record<string, unknown>[])[0];
      return {
        averageRating: row.average_rating ? Number(row.average_rating) : null,
        reviewCount: Number(row.review_count),
      } as RecipeRating;
    },
    enabled: !!recipeId,
    staleTime: 2 * 60_000,
  });

  const reviewsQuery = useQuery({
    queryKey: ['recipe-reviews', recipeId],
    queryFn: async () => {
      if (!recipeId) return [];

      const { data, error } = await supabase.rpc('get_recipe_reviews', {
        target_recipe_id: recipeId,
        result_limit: 50,
        result_offset: 0,
      });

      if (error || !data) return [];

      return (data as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        rating: Number(row.rating),
        reviewText: row.review_text as string | null,
        createdAt: row.created_at as string,
        userId: row.user_id as string,
        displayName: row.display_name as string | null,
        username: row.username as string | null,
        avatarUrl: row.avatar_url as string | null,
      })) as Review[];
    },
    enabled: !!recipeId,
    staleTime: 2 * 60_000,
  });

  const submitReview = useMutation({
    mutationFn: async ({ rating, reviewText }: { rating: number; reviewText?: string }) => {
      if (!user || !recipeId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('recipe_reviews')
        .upsert({
          recipe_id: recipeId,
          user_id: user.id,
          rating,
          review_text: reviewText || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'recipe_id,user_id',
        });

      if (error) throw error;

      // Send notification to recipe owner (fire-and-forget)
      const { data: recipe } = await supabase
        .from('recipes')
        .select('user_id, title')
        .eq('id', recipeId)
        .single();

      if (recipe && recipe.user_id !== user.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();

        supabase.from('notifications').insert({
          user_id: recipe.user_id,
          type: 'new_review',
          data: {
            reviewer_name: profile?.display_name || 'Someone',
            recipe_id: recipeId,
            recipe_title: recipe.title,
            rating: String(rating),
          },
        }).then(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-rating', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe-reviews', recipeId] });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('recipe_reviews')
        .delete()
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-rating', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe-reviews', recipeId] });
    },
  });

  const userReview = reviewsQuery.data?.find(r => r.userId === user?.id) || null;

  return {
    rating: ratingQuery.data || { averageRating: null, reviewCount: 0 },
    reviews: reviewsQuery.data || [],
    userReview,
    isLoading: ratingQuery.isLoading || reviewsQuery.isLoading,
    submitReview: submitReview.mutateAsync,
    deleteReview: deleteReview.mutateAsync,
    isSubmitting: submitReview.isPending,
  };
}
