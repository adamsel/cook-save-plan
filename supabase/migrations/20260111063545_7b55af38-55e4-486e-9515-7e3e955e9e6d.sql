-- Fix recipe_shares INSERT policy to validate recipe ownership
-- This prevents users from sharing recipes they don't own

DROP POLICY IF EXISTS "Users can share their own recipes" ON public.recipe_shares;

CREATE POLICY "Users can share their own recipes"
ON public.recipe_shares FOR INSERT
WITH CHECK (
  auth.uid() = shared_by_user_id
  AND EXISTS (
    SELECT 1 FROM public.recipes
    WHERE recipes.id = recipe_id
    AND recipes.user_id = auth.uid()
  )
);