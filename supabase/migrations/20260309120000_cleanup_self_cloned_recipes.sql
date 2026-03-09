-- Clean up duplicate recipes created by accidentally cloning your own meal plan.
-- A self-clone is a recipe where original_recipe_id points to another recipe
-- owned by the same user.

-- Step 1: Re-point any meal_plan_items from duplicates back to the originals
UPDATE meal_plan_items mpi
SET recipe_id = r.original_recipe_id
FROM recipes r
JOIN recipes original ON r.original_recipe_id = original.id
WHERE mpi.recipe_id = r.id
  AND r.original_recipe_id IS NOT NULL
  AND r.user_id = original.user_id;

-- Step 2: Delete the self-cloned duplicate recipes
DELETE FROM recipes r
USING recipes original
WHERE r.original_recipe_id = original.id
  AND r.original_recipe_id IS NOT NULL
  AND r.user_id = original.user_id;
