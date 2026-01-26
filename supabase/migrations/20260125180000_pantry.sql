-- Pantry inventory system
-- Track what ingredients users have at home

CREATE TABLE IF NOT EXISTS public.pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_key TEXT NOT NULL, -- normalized ingredient name for matching
  display_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  category TEXT,
  expiry_date DATE,
  low_stock_threshold NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Either household_id or user_id must be set
  CONSTRAINT pantry_owner_required CHECK (
    household_id IS NOT NULL OR user_id IS NOT NULL
  ),
  -- Unique per household or user
  CONSTRAINT pantry_unique_household UNIQUE (household_id, ingredient_key),
  CONSTRAINT pantry_unique_user UNIQUE (user_id, ingredient_key)
);

-- Enable RLS
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

-- Function to check pantry item ownership
CREATE OR REPLACE FUNCTION can_access_pantry_item(item_household_id UUID, item_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the item directly
  IF item_user_id = auth.uid() THEN
    RETURN TRUE;
  END IF;

  -- Check if user is in the household that owns the item
  IF item_household_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = item_household_id
      AND user_id = auth.uid()
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
CREATE POLICY "Users can view own and household pantry items"
ON public.pantry_items FOR SELECT
USING (can_access_pantry_item(household_id, user_id));

CREATE POLICY "Users can insert pantry items"
ON public.pantry_items FOR INSERT
WITH CHECK (
  -- Must be owner of the item
  (user_id = auth.uid() AND household_id IS NULL)
  OR
  -- Or be a member of the household
  (household_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = pantry_items.household_id
    AND household_members.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can update own and household pantry items"
ON public.pantry_items FOR UPDATE
USING (can_access_pantry_item(household_id, user_id));

CREATE POLICY "Users can delete own and household pantry items"
ON public.pantry_items FOR DELETE
USING (can_access_pantry_item(household_id, user_id));

-- Indexes for performance
CREATE INDEX idx_pantry_items_household ON public.pantry_items(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_pantry_items_user ON public.pantry_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_pantry_items_ingredient ON public.pantry_items(ingredient_key);
CREATE INDEX idx_pantry_items_expiry ON public.pantry_items(expiry_date) WHERE expiry_date IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_pantry_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pantry_items_updated_at
  BEFORE UPDATE ON public.pantry_items
  FOR EACH ROW
  EXECUTE FUNCTION update_pantry_item_updated_at();
