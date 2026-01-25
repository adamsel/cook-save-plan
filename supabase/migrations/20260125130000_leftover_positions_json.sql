-- Migration: Move leftover positions from separate table to JSON column
-- This simplifies the data model and eliminates RLS complexity

-- Step 1: Add leftover_positions JSON column to meal_plan_items
ALTER TABLE meal_plan_items
ADD COLUMN IF NOT EXISTS leftover_positions JSONB DEFAULT '[]';

-- Step 2: Migrate existing data from leftover_positions table (if any exists)
UPDATE meal_plan_items mpi
SET leftover_positions = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'index', lp.leftover_index,
        'day', lp.day,
        'slot', lp.meal_slot
      )
      ORDER BY lp.leftover_index
    )
    FROM leftover_positions lp
    WHERE lp.meal_plan_item_id = mpi.id
  ),
  '[]'::jsonb
)
WHERE EXISTS (
  SELECT 1 FROM leftover_positions lp WHERE lp.meal_plan_item_id = mpi.id
);

-- Step 3: Drop the old leftover_positions table (cleanup)
DROP TABLE IF EXISTS leftover_positions;

-- Add comment for documentation
COMMENT ON COLUMN meal_plan_items.leftover_positions IS
'JSON array of custom leftover positions. Format: [{"index": 0, "day": "tuesday", "slot": "dinner"}]';
