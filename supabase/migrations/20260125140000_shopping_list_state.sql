-- Shopping list state persistence
-- Stores checked items and custom items per user per week

CREATE TABLE IF NOT EXISTS shopping_list_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  checked_items JSONB DEFAULT '{}',
  custom_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE shopping_list_state ENABLE ROW LEVEL SECURITY;

-- Users can only access their own shopping list state
CREATE POLICY "Users can view own shopping list state"
  ON shopping_list_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping list state"
  ON shopping_list_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping list state"
  ON shopping_list_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping list state"
  ON shopping_list_state FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_shopping_list_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_list_state_updated_at
  BEFORE UPDATE ON shopping_list_state
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_list_state_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_shopping_list_state_user_week
  ON shopping_list_state(user_id, week_start_date);
