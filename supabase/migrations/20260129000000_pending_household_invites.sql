-- Create pending_household_invites table for inviting users who don't have accounts yet
CREATE TABLE IF NOT EXISTS public.pending_household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, email)
);

-- Enable RLS
ALTER TABLE public.pending_household_invites ENABLE ROW LEVEL SECURITY;

-- Create index for email lookups (used in signup trigger)
CREATE INDEX IF NOT EXISTS idx_pending_household_invites_email ON public.pending_household_invites(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_pending_household_invites_household_id ON public.pending_household_invites(household_id);

-- Policies: Only household admins/owners can manage pending invites
CREATE POLICY "Household admins can view pending invites"
ON public.pending_household_invites FOR SELECT
USING (
  household_id IN (SELECT public.get_user_household_ids(auth.uid()))
);

CREATE POLICY "Household admins can insert pending invites"
ON public.pending_household_invites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = pending_household_invites.household_id
    AND household_members.user_id = auth.uid()
    AND household_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Household admins can delete pending invites"
ON public.pending_household_invites FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = pending_household_invites.household_id
    AND household_members.user_id = auth.uid()
    AND household_members.role IN ('owner', 'admin')
  )
);

-- Function to convert pending invites on user signup
-- When a new user creates a profile, check if they have any pending household invites
-- and automatically convert them to household memberships
CREATE OR REPLACE FUNCTION public.convert_pending_household_invites()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending RECORD;
BEGIN
  -- Find any pending invites for this user's email
  FOR pending IN
    SELECT * FROM pending_household_invites
    WHERE LOWER(email) = LOWER(NEW.email)
  LOOP
    -- Create household membership
    INSERT INTO household_members (household_id, user_id, role)
    VALUES (pending.household_id, NEW.user_id, pending.role)
    ON CONFLICT (household_id, user_id) DO NOTHING;

    -- Delete the pending invite
    DELETE FROM pending_household_invites WHERE id = pending.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on profiles insert (fires when a new user signs up and their profile is created)
DROP TRIGGER IF EXISTS on_profile_created_convert_household_invites ON public.profiles;
CREATE TRIGGER on_profile_created_convert_household_invites
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.convert_pending_household_invites();
