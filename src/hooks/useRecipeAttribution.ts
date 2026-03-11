import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecipeAttribution {
  originalRecipeId: string;
  originalTitle: string;
  creatorUserId: string;
  creatorDisplayName: string | null;
  creatorUsername: string | null;
  creatorAvatarUrl: string | null;
}

export function useRecipeAttribution(
  recipeId: string | undefined,
  originalRecipeId: string | undefined,
) {
  const [attribution, setAttribution] = useState<RecipeAttribution | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!recipeId || !originalRecipeId) {
      setAttribution(null);
      return;
    }

    setIsLoading(true);
    supabase
      .rpc('get_recipe_attribution', { target_recipe_id: recipeId })
      .then(({ data }) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const row = data[0];
          setAttribution({
            originalRecipeId: row.original_recipe_id,
            originalTitle: row.original_title,
            creatorUserId: row.creator_user_id,
            creatorDisplayName: row.creator_display_name,
            creatorUsername: row.creator_username,
            creatorAvatarUrl: row.creator_avatar_url,
          });
        } else {
          setAttribution(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, [recipeId, originalRecipeId]);

  return { attribution, isLoading };
}
