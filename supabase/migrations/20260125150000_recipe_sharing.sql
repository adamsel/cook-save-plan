-- Add email column to profiles for user lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create pending_shares table for inviting non-users
CREATE TABLE IF NOT EXISTS public.pending_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recipe_id, invited_email)
);

-- Enable RLS on pending_shares
ALTER TABLE public.pending_shares ENABLE ROW LEVEL SECURITY;

-- Users can view pending shares they created
CREATE POLICY "Users can view own pending shares"
  ON public.pending_shares FOR SELECT
  USING (auth.uid() = shared_by_user_id);

-- Users can create pending shares for their own recipes
CREATE POLICY "Users can create pending shares"
  ON public.pending_shares FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by_user_id
    AND EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- Users can delete pending shares they created
CREATE POLICY "Users can delete own pending shares"
  ON public.pending_shares FOR DELETE
  USING (auth.uid() = shared_by_user_id);

-- Function to convert pending shares when a user signs up
CREATE OR REPLACE FUNCTION public.convert_pending_shares()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the email from the new user
  -- Insert into recipe_shares from pending_shares where email matches
  INSERT INTO public.recipe_shares (recipe_id, shared_by_user_id, shared_with_user_id, can_edit)
  SELECT ps.recipe_id, ps.shared_by_user_id, NEW.id, ps.can_edit
  FROM public.pending_shares ps
  WHERE ps.invited_email = NEW.email
  ON CONFLICT (recipe_id, shared_with_user_id) DO NOTHING;

  -- Delete the converted pending shares
  DELETE FROM public.pending_shares
  WHERE invited_email = NEW.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to convert pending shares on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_convert_shares ON auth.users;
CREATE TRIGGER on_auth_user_created_convert_shares
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.convert_pending_shares();

-- Update existing profile creation trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = COALESCE(profiles.display_name, EXCLUDED.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing profiles with email from auth.users
-- Note: This requires the migration to run with sufficient permissions
DO $$
BEGIN
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.user_id = u.id
  AND p.email IS NULL;
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Skip if we don't have permission to read auth.users
    NULL;
END $$;
