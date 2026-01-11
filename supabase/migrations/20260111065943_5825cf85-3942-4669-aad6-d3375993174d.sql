-- Add UPDATE policy for recipe_shares table
-- This allows recipe owners to modify share permissions (e.g., toggle can_edit)

CREATE POLICY "Users can update their shares"
ON public.recipe_shares FOR UPDATE
USING (auth.uid() = shared_by_user_id)
WITH CHECK (auth.uid() = shared_by_user_id);