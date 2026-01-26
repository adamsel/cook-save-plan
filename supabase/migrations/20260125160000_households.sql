-- Create households table
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create household_members table
CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- Create household_settings table (replaces localStorage settings)
CREATE TABLE IF NOT EXISTS public.household_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE UNIQUE,
  household_size INTEGER DEFAULT 2,
  default_dinner_servings INTEGER DEFAULT 4,
  suggest_leftovers_for_lunch BOOLEAN DEFAULT true,
  pantry_staples JSONB DEFAULT '["salt", "pepper", "olive oil", "butter", "garlic", "onion", "sugar", "flour"]',
  aisle_categories JSONB DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_settings ENABLE ROW LEVEL SECURITY;

-- Households policies
CREATE POLICY "Members can view their households"
  ON public.households FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = households.id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create a household"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners and admins can update household"
  ON public.households FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = households.id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Only owner can delete household"
  ON public.households FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = households.id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'owner'
    )
  );

-- Household members policies
CREATE POLICY "Members can view household members"
  ON public.household_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members AS my_membership
      WHERE my_membership.household_id = household_members.household_id
      AND my_membership.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can add members"
  ON public.household_members FOR INSERT
  WITH CHECK (
    -- Allow self-insert when creating household (owner)
    (user_id = auth.uid() AND role = 'owner')
    OR
    -- Allow admins/owners to add other members
    EXISTS (
      SELECT 1 FROM public.household_members AS my_membership
      WHERE my_membership.household_id = household_members.household_id
      AND my_membership.user_id = auth.uid()
      AND my_membership.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can update member roles"
  ON public.household_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members AS my_membership
      WHERE my_membership.household_id = household_members.household_id
      AND my_membership.user_id = auth.uid()
      AND my_membership.role = 'owner'
    )
  );

CREATE POLICY "Members can leave, admins can remove members"
  ON public.household_members FOR DELETE
  USING (
    -- User can remove themselves
    user_id = auth.uid()
    OR
    -- Owners and admins can remove others (but not the owner)
    (
      EXISTS (
        SELECT 1 FROM public.household_members AS my_membership
        WHERE my_membership.household_id = household_members.household_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role IN ('owner', 'admin')
      )
      AND household_members.role != 'owner'
    )
  );

-- Household settings policies
CREATE POLICY "Members can view household settings"
  ON public.household_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = household_settings.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can insert settings"
  ON public.household_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = household_settings.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update settings"
  ON public.household_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = household_settings.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('owner', 'admin')
    )
  );

-- Create function to automatically create settings when household is created
CREATE OR REPLACE FUNCTION public.create_household_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.household_settings (household_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create settings
DROP TRIGGER IF EXISTS on_household_created ON public.households;
CREATE TRIGGER on_household_created
  AFTER INSERT ON public.households
  FOR EACH ROW
  EXECUTE FUNCTION public.create_household_settings();

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_settings_household_id ON public.household_settings(household_id);
