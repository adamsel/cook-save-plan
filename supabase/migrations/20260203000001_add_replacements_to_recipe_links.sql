-- Add replacements column to recipe_links for ingredient replacement feature
-- Stores which ingredients from the linked recipe replace ingredients from the main recipe

ALTER TABLE recipe_links
ADD COLUMN IF NOT EXISTS replacements JSONB DEFAULT NULL;

-- Example stored value:
-- [
--   {
--     "linkedIngredientId": "ing-123",      -- ID from linked recipe
--     "replacesIngredientId": "ing-456",    -- ID from main recipe it replaces
--     "notes": "Homemade version"
--   }
-- ]

COMMENT ON COLUMN recipe_links.replacements IS 'JSON array of ingredient replacements - which ingredients from the linked recipe replace ingredients from the main recipe';
