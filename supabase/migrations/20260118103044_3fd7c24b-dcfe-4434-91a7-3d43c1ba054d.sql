-- Add leftover_meals column to meal_plan_items
-- This tracks how many additional meals (leftovers) this cooked recipe provides
ALTER TABLE public.meal_plan_items 
ADD COLUMN leftover_meals INTEGER NOT NULL DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.meal_plan_items.leftover_meals IS 'Number of additional meals (leftovers) this cooked recipe provides beyond the planned meal';