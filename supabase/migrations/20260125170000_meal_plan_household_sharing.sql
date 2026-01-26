-- Add household_id to meal_plans for shared meal planning
ALTER TABLE public.meal_plans
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;

-- Create index for household lookups
CREATE INDEX IF NOT EXISTS idx_meal_plans_household
ON public.meal_plans(household_id) WHERE household_id IS NOT NULL;

-- Function to check if a user is in a household
CREATE OR REPLACE FUNCTION is_household_member(check_household_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = check_household_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing meal_plans policies to recreate with household support
DROP POLICY IF EXISTS "Users can view their own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can insert their own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can delete their own meal plans" ON public.meal_plans;

-- New policies: access own plans OR plans in user's household
CREATE POLICY "Users can view own and household meal plans"
ON public.meal_plans FOR SELECT
USING (
  auth.uid() = user_id
  OR (household_id IS NOT NULL AND is_household_member(household_id))
);

CREATE POLICY "Users can insert meal plans"
ON public.meal_plans FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    household_id IS NULL
    OR is_household_member(household_id)
  )
);

CREATE POLICY "Users can update own and household meal plans"
ON public.meal_plans FOR UPDATE
USING (
  auth.uid() = user_id
  OR (household_id IS NOT NULL AND is_household_member(household_id))
);

CREATE POLICY "Users can delete own and household meal plans"
ON public.meal_plans FOR DELETE
USING (
  auth.uid() = user_id
  OR (household_id IS NOT NULL AND is_household_member(household_id))
);

-- Update meal_plan_items policies to allow household access through parent meal_plan
DROP POLICY IF EXISTS "Users can view their meal plan items" ON public.meal_plan_items;
DROP POLICY IF EXISTS "Users can insert meal plan items" ON public.meal_plan_items;
DROP POLICY IF EXISTS "Users can update meal plan items" ON public.meal_plan_items;
DROP POLICY IF EXISTS "Users can delete meal plan items" ON public.meal_plan_items;

CREATE POLICY "Users can view meal plan items"
ON public.meal_plan_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meal_plans
    WHERE meal_plans.id = meal_plan_items.meal_plan_id
    AND (
      meal_plans.user_id = auth.uid()
      OR (meal_plans.household_id IS NOT NULL AND is_household_member(meal_plans.household_id))
    )
  )
);

CREATE POLICY "Users can insert meal plan items"
ON public.meal_plan_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meal_plans
    WHERE meal_plans.id = meal_plan_items.meal_plan_id
    AND (
      meal_plans.user_id = auth.uid()
      OR (meal_plans.household_id IS NOT NULL AND is_household_member(meal_plans.household_id))
    )
  )
);

CREATE POLICY "Users can update meal plan items"
ON public.meal_plan_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.meal_plans
    WHERE meal_plans.id = meal_plan_items.meal_plan_id
    AND (
      meal_plans.user_id = auth.uid()
      OR (meal_plans.household_id IS NOT NULL AND is_household_member(meal_plans.household_id))
    )
  )
);

CREATE POLICY "Users can delete meal plan items"
ON public.meal_plan_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.meal_plans
    WHERE meal_plans.id = meal_plan_items.meal_plan_id
    AND (
      meal_plans.user_id = auth.uid()
      OR (meal_plans.household_id IS NOT NULL AND is_household_member(meal_plans.household_id))
    )
  )
);

-- Note: The unique constraint UNIQUE(user_id, week_start_date) remains as-is
-- Household meal plans will use the creating user's ID but share via household_id
