-- Recipe Links table for "Goes with" feature
-- Allows users to link recipes together (e.g., tortillas goes with fajitas)

CREATE TABLE IF NOT EXISTS recipe_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  linked_recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'goes_with' CHECK (link_type IN ('goes_with', 'component', 'variation', 'side')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Prevent duplicate links (in same direction)
  UNIQUE(recipe_id, linked_recipe_id, user_id),

  -- Prevent self-links
  CHECK (recipe_id != linked_recipe_id)
);

-- Enable RLS
ALTER TABLE recipe_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own links
CREATE POLICY "Users can view their own recipe links"
  ON recipe_links FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can insert their own links
CREATE POLICY "Users can create their own recipe links"
  ON recipe_links FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can delete their own links
CREATE POLICY "Users can delete their own recipe links"
  ON recipe_links FOR DELETE
  USING (user_id = auth.uid());

-- Index for efficient lookups (both directions)
CREATE INDEX idx_recipe_links_recipe_id ON recipe_links(recipe_id);
CREATE INDEX idx_recipe_links_linked_recipe_id ON recipe_links(linked_recipe_id);
CREATE INDEX idx_recipe_links_user_id ON recipe_links(user_id);
