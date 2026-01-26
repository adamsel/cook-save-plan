-- ============================================
-- RECIPE STASH - COMPLETE DATABASE SCHEMA
-- Run this on a fresh Supabase project
-- ============================================

-- ============================================
-- PART 1: CORE TABLES
-- ============================================

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies (restricted to own profile)
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_url TEXT,
  image_url TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  tags TEXT[] DEFAULT '{}',
  prep_time INTEGER,
  cook_time INTEGER,
  total_time INTEGER,
  servings INTEGER NOT NULL DEFAULT 4,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  cuisine TEXT,
  dietary TEXT[] DEFAULT '{}',
  meal_types TEXT[] DEFAULT '{}',
  author TEXT,
  nutrition JSONB,
  import_method TEXT,
  raw_import_snapshot TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_library BOOLEAN NOT NULL DEFAULT false,
  original_recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Users can view their own recipes
CREATE POLICY "Users can view their own recipes"
ON public.recipes FOR SELECT
USING (auth.uid() = user_id);

-- Users can view public/library recipes
CREATE POLICY "Anyone can view public recipes"
ON public.recipes FOR SELECT
USING (is_public = true OR is_library = true);

-- Users can insert their own recipes
CREATE POLICY "Users can insert their own recipes"
ON public.recipes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own recipes
CREATE POLICY "Users can delete their own recipes"
ON public.recipes FOR DELETE
USING (auth.uid() = user_id);

-- Create recipe shares table for sharing between specific users
CREATE TABLE public.recipe_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, shared_with_user_id)
);

-- Enable RLS on recipe_shares
ALTER TABLE public.recipe_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares they're involved in
CREATE POLICY "Users can view their shares"
ON public.recipe_shares FOR SELECT
USING (auth.uid() = shared_by_user_id OR auth.uid() = shared_with_user_id);

-- Users can create shares for their own recipes
CREATE POLICY "Users can share their own recipes"
ON public.recipe_shares FOR INSERT
WITH CHECK (
  auth.uid() = shared_by_user_id
  AND EXISTS (
    SELECT 1 FROM public.recipes
    WHERE recipes.id = recipe_id
    AND recipes.user_id = auth.uid()
  )
);

-- Users can update their shares
CREATE POLICY "Users can update their shares"
ON public.recipe_shares FOR UPDATE
USING (auth.uid() = shared_by_user_id)
WITH CHECK (auth.uid() = shared_by_user_id);

-- Users can delete shares they created
CREATE POLICY "Users can delete their shares"
ON public.recipe_shares FOR DELETE
USING (auth.uid() = shared_by_user_id);

-- Add policy for viewing shared recipes
CREATE POLICY "Users can view recipes shared with them"
ON public.recipes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recipe_shares
    WHERE recipe_shares.recipe_id = recipes.id
    AND recipe_shares.shared_with_user_id = auth.uid()
  )
);

-- Users can update recipes they own or have edit access to
CREATE POLICY "Users can update recipes they own or have edit access to"
ON public.recipes FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.recipe_shares
    WHERE recipe_shares.recipe_id = recipes.id
    AND recipe_shares.shared_with_user_id = auth.uid()
    AND recipe_shares.can_edit = true
  )
);

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

CREATE POLICY "Users can view own pending shares"
  ON public.pending_shares FOR SELECT
  USING (auth.uid() = shared_by_user_id);

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

CREATE POLICY "Users can delete own pending shares"
  ON public.pending_shares FOR DELETE
  USING (auth.uid() = shared_by_user_id);

-- ============================================
-- PART 2: MEAL PLANNING TABLES
-- ============================================

-- Create meal_plans table
CREATE TABLE public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  household_id UUID, -- Added for household sharing (foreign key added later)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS on meal_plans
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Create meal_plan_items table
CREATE TABLE public.meal_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  meal_slot TEXT NOT NULL,
  servings_multiplier NUMERIC NOT NULL DEFAULT 1,
  notes TEXT,
  leftover_meals INTEGER NOT NULL DEFAULT 0,
  leftover_positions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on meal_plan_items
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: SHOPPING LIST STATE
-- ============================================

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

ALTER TABLE shopping_list_state ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX idx_shopping_list_state_user_week
  ON shopping_list_state(user_id, week_start_date);

-- ============================================
-- PART 4: HOUSEHOLDS
-- ============================================

CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.household_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE UNIQUE,
  household_size INTEGER DEFAULT 2,
  default_dinner_servings INTEGER DEFAULT 4,
  suggest_leftovers_for_lunch BOOLEAN DEFAULT true,
  pantry_staples JSONB DEFAULT '["salt", "pepper", "olive oil", "butter", "garlic", "onion", "sugar", "flour"]',
  aisle_categories JSONB DEFAULT NULL,
  dietary_restrictions JSONB DEFAULT '[]',
  allergens JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all household tables
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_settings ENABLE ROW LEVEL SECURITY;

-- Add foreign key for meal_plans.household_id
ALTER TABLE public.meal_plans
ADD CONSTRAINT meal_plans_household_id_fkey
FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meal_plans_household
ON public.meal_plans(household_id) WHERE household_id IS NOT NULL;

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
    (user_id = auth.uid() AND role = 'owner')
    OR
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
    user_id = auth.uid()
    OR
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

-- ============================================
-- PART 5: MEAL PLAN HOUSEHOLD SHARING
-- ============================================

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

-- Meal plans policies with household support
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

-- Meal plan items policies with household support
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

-- ============================================
-- PART 6: PANTRY
-- ============================================

CREATE TABLE IF NOT EXISTS public.pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  category TEXT,
  expiry_date DATE,
  low_stock_threshold NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT pantry_owner_required CHECK (
    household_id IS NOT NULL OR user_id IS NOT NULL
  ),
  CONSTRAINT pantry_unique_household UNIQUE (household_id, ingredient_key),
  CONSTRAINT pantry_unique_user UNIQUE (user_id, ingredient_key)
);

ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_access_pantry_item(item_household_id UUID, item_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF item_user_id = auth.uid() THEN
    RETURN TRUE;
  END IF;

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

CREATE POLICY "Users can view own and household pantry items"
ON public.pantry_items FOR SELECT
USING (can_access_pantry_item(household_id, user_id));

CREATE POLICY "Users can insert pantry items"
ON public.pantry_items FOR INSERT
WITH CHECK (
  (user_id = auth.uid() AND household_id IS NULL)
  OR
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

CREATE INDEX idx_pantry_items_household ON public.pantry_items(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_pantry_items_user ON public.pantry_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_pantry_items_ingredient ON public.pantry_items(ingredient_key);
CREATE INDEX idx_pantry_items_expiry ON public.pantry_items(expiry_date) WHERE expiry_date IS NOT NULL;

-- ============================================
-- PART 7: DIETARY PREFERENCES (USER LEVEL)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_dietary_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  dietary_restrictions JSONB DEFAULT '[]',
  allergens JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_dietary_preferences ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- PART 8: TRIGGERS AND FUNCTIONS
-- ============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
BEFORE UPDATE ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at
BEFORE UPDATE ON public.meal_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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

-- Function to auto-create profile on signup
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to convert pending shares when a user signs up
CREATE OR REPLACE FUNCTION public.convert_pending_shares()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.recipe_shares (recipe_id, shared_by_user_id, shared_with_user_id, can_edit)
  SELECT ps.recipe_id, ps.shared_by_user_id, NEW.id, ps.can_edit
  FROM public.pending_shares ps
  WHERE ps.invited_email = NEW.email
  ON CONFLICT (recipe_id, shared_with_user_id) DO NOTHING;

  DELETE FROM public.pending_shares
  WHERE invited_email = NEW.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_convert_shares
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.convert_pending_shares();

-- Function to automatically create settings when household is created
CREATE OR REPLACE FUNCTION public.create_household_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.household_settings (household_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_household_created
  AFTER INSERT ON public.households
  FOR EACH ROW
  EXECUTE FUNCTION public.create_household_settings();

-- ============================================
-- PART 9: INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_settings_household_id ON public.household_settings(household_id);

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
