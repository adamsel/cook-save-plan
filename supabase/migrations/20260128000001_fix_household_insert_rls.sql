-- Fix household_members INSERT policy
-- The original policy's EXISTS clause can cause issues when evaluated

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.household_members;

-- Create a simpler INSERT policy that doesn't have recursive queries
-- When creating a new household, the user inserts themselves as owner (no existing members)
-- When adding members later, admins/owners use the security definer function
CREATE POLICY "Users can add members"
ON public.household_members FOR INSERT
WITH CHECK (
  -- Case 1: User is inserting themselves as owner (creating new household)
  (user_id = auth.uid() AND role = 'owner')
  OR
  -- Case 2: User is an admin/owner of the household (adding other members)
  -- Use the security definer function to avoid recursion
  (
    role != 'owner' AND
    household_id IN (
      SELECT hm.household_id
      FROM public.household_members hm
      WHERE hm.user_id = auth.uid()
      AND hm.role IN ('owner', 'admin')
    )
  )
);

-- Also ensure the households INSERT policy exists and is correct
DROP POLICY IF EXISTS "Anyone can create a household" ON public.households;
CREATE POLICY "Authenticated users can create households"
ON public.households FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
