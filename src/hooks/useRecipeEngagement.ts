import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export function useRecipeEngagement() {
  const { user } = useAuth();

  const recordView = async (recipeId: string) => {
    await supabase.from('recipe_engagement').insert({
      recipe_id: recipeId,
      user_id: user?.id || null,
      event_type: 'view',
    }).then(() => {});
  };

  const recordSave = async (recipeId: string) => {
    if (!user) return;
    await supabase.from('recipe_engagement').insert({
      recipe_id: recipeId,
      user_id: user.id,
      event_type: 'save',
    }).then(() => {});
  };

  const recordPlanAdd = async (recipeId: string) => {
    if (!user) return;
    await supabase.from('recipe_engagement').insert({
      recipe_id: recipeId,
      user_id: user.id,
      event_type: 'plan_add',
    }).then(() => {});
  };

  return { recordView, recordSave, recordPlanAdd };
}
