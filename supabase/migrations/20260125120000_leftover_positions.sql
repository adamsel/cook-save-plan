-- Create table to store custom leftover positions
-- This allows users to drag leftovers to different slots than the default (next day's lunch)

CREATE TABLE IF NOT EXISTS leftover_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_item_id UUID NOT NULL REFERENCES meal_plan_items(id) ON DELETE CASCADE,
  leftover_index INT NOT NULL,  -- Which leftover (0 = first, 1 = second, etc.)
  day TEXT NOT NULL,            -- Target day: 'monday', 'tuesday', etc.
  meal_slot TEXT NOT NULL,      -- Target slot: 'breakfast', 'lunch', 'dinner', 'snack'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique position per leftover
  UNIQUE(meal_plan_item_id, leftover_index)
);

-- Enable RLS
ALTER TABLE leftover_positions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own leftover positions (via meal_plan_items ownership)
CREATE POLICY "Users can manage their own leftover positions"
  ON leftover_positions
  FOR ALL
  USING (
    meal_plan_item_id IN (
      SELECT mpi.id FROM meal_plan_items mpi
      JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
      WHERE mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    meal_plan_item_id IN (
      SELECT mpi.id FROM meal_plan_items mpi
      JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
      WHERE mp.user_id = auth.uid()
    )
  );

-- Index for efficient lookups
CREATE INDEX idx_leftover_positions_item_id ON leftover_positions(meal_plan_item_id);
