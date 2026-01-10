-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

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
  -- Sharing and visibility
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

-- Users can update their own recipes
CREATE POLICY "Users can update their own recipes" 
ON public.recipes FOR UPDATE 
USING (auth.uid() = user_id);

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

-- Create meal_plans table
CREATE TABLE public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS on meal_plans
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Users can only access their own meal plans
CREATE POLICY "Users can view their own meal plans" 
ON public.meal_plans FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal plans" 
ON public.meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans" 
ON public.meal_plans FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans" 
ON public.meal_plans FOR DELETE USING (auth.uid() = user_id);

-- Create meal_plan_items table
CREATE TABLE public.meal_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  meal_slot TEXT NOT NULL,
  servings_multiplier NUMERIC NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on meal_plan_items
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

-- Users can access meal plan items through their meal plans
CREATE POLICY "Users can view their meal plan items" 
ON public.meal_plan_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.meal_plans 
    WHERE meal_plans.id = meal_plan_items.meal_plan_id 
    AND meal_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their meal plan items" 
ON public.meal_plan_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meal_plans 
    WHERE meal_plans.id = meal_plan_items.meal_plan_id 
    AND meal_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their meal plan items" 
ON public.meal_plan_items FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.meal_plans 
    WHERE meal_plans.id = meal_plan_items.meal_plan_id 
    AND meal_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their meal plan items" 
ON public.meal_plan_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.meal_plans 
    WHERE meal_plans.id = meal_plan_items.meal_plan_id 
    AND meal_plans.user_id = auth.uid()
  )
);

-- Create function to update timestamps
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

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();