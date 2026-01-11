-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own recipes" ON public.recipes;

-- Create a new UPDATE policy that checks both ownership and edit permissions from shares
CREATE POLICY "Users can update recipes they own or have edit access to"
ON public.recipes FOR UPDATE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.recipe_shares
    WHERE recipe_shares.recipe_id = recipes.id
    AND recipe_shares.shared_with_user_id = auth.uid()
    AND recipe_shares.can_edit = true
  )
);