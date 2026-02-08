-- Add missing UPDATE policy for recipe_links table
-- Required for updating ingredient replacements

-- The original migration only has SELECT, INSERT, DELETE policies
-- This allows users to update their own links (e.g., to set replacements)

CREATE POLICY "Users can update their own recipe links"
  ON recipe_links FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
