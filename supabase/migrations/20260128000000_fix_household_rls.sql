-- Fix infinite recursion in household_members RLS policy
-- The original "Members can view household members" policy queries household_members
-- in its USING clause, causing infinite recursion.

-- Step 1: Create a SECURITY DEFINER function to bypass RLS when checking membership
-- This function runs with elevated privileges and doesn't trigger RLS checks
CREATE OR REPLACE FUNCTION public.get_user_household_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT household_id FROM household_members WHERE user_id = user_uuid;
$$;

-- Step 2: Drop all existing SELECT policies to start fresh
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.household_members;
DROP POLICY IF EXISTS "Users can view fellow household members" ON public.household_members;

-- Step 3: Create two non-recursive policies for viewing members

-- Users can always see their own membership records (no recursion needed)
CREATE POLICY "Users can view own memberships"
ON public.household_members FOR SELECT
USING (user_id = auth.uid());

-- Users can see other members of households they belong to (using SECURITY DEFINER function)
CREATE POLICY "Users can view fellow household members"
ON public.household_members FOR SELECT
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

-- Note: These two policies together allow:
-- 1. Seeing your own membership immediately (no function call)
-- 2. Seeing other members of your households (via the safe function)
