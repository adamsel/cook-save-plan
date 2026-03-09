-- Creator sharing: public meal plan sharing + creator profiles
-- Enables food creators to share weekly meal plans publicly
-- so followers can clone them into their own accounts.

-- 1. Add creator profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS is_creator BOOLEAN NOT NULL DEFAULT false;

-- Username validation: lowercase alphanumeric + hyphens, 3-30 chars
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$');

-- 2. Add meal plan sharing fields
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. RLS policies for public access

-- Anyone can view creator profiles (additive, doesn't affect existing policies)
CREATE POLICY "Anyone can view creator profiles"
  ON public.profiles FOR SELECT
  USING (is_creator = true);

-- Anyone can view shared meal plans
CREATE POLICY "Anyone can view shared meal plans"
  ON public.meal_plans FOR SELECT
  USING (is_shared = true);

-- Anyone can view items of shared meal plans
CREATE POLICY "Anyone can view items of shared meal plans"
  ON public.meal_plan_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE meal_plans.id = meal_plan_items.meal_plan_id
      AND meal_plans.is_shared = true
    )
  );
