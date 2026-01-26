-- Add dietary preferences to household settings
ALTER TABLE public.household_settings
ADD COLUMN IF NOT EXISTS dietary_restrictions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS allergens JSONB DEFAULT '[]';

-- Also create a user-level dietary preferences table for users without households
CREATE TABLE IF NOT EXISTS public.user_dietary_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  dietary_restrictions JSONB DEFAULT '[]',
  allergens JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_dietary_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can view own dietary preferences"
ON public.user_dietary_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dietary preferences"
ON public.user_dietary_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dietary preferences"
ON public.user_dietary_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dietary preferences"
ON public.user_dietary_preferences FOR DELETE
USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_dietary_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_dietary_preferences_updated_at
  BEFORE UPDATE ON public.user_dietary_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_dietary_preferences_updated_at();
