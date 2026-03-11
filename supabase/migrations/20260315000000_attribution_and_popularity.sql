-- ============================================================
-- PART A: RECIPE ATTRIBUTION PROTECTION
-- ============================================================

-- Trigger: block publishing cloned recipes whose original was deleted
-- (Soft attribution: clones CAN be published, but only if the original
--  recipe still exists so we can show "Originally by @creator")
CREATE OR REPLACE FUNCTION enforce_clone_attribution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public = true AND (OLD.is_public = false OR OLD.is_public IS NULL)
     AND NEW.original_recipe_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = NEW.original_recipe_id) THEN
      RAISE EXCEPTION 'Cannot publish a cloned recipe whose original has been deleted';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_clone_attribution
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_clone_attribution();

-- RPC: get attribution info for a cloned recipe
CREATE OR REPLACE FUNCTION get_recipe_attribution(target_recipe_id UUID)
RETURNS TABLE (
  original_recipe_id UUID,
  original_title TEXT,
  creator_user_id UUID,
  creator_display_name TEXT,
  creator_username TEXT,
  creator_avatar_url TEXT
) AS $$
  SELECT
    orig.id AS original_recipe_id,
    orig.title AS original_title,
    orig.user_id AS creator_user_id,
    p.display_name AS creator_display_name,
    p.username AS creator_username,
    p.avatar_url AS creator_avatar_url
  FROM public.recipes clone
  INNER JOIN public.recipes orig ON orig.id = clone.original_recipe_id
  LEFT JOIN public.profiles p ON p.user_id = orig.user_id
  WHERE clone.id = target_recipe_id
    AND clone.original_recipe_id IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- Add 'recipe_saved' to notifications type
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_follower', 'plan_cloned', 'recipe_saved'));


-- ============================================================
-- PART B: RECIPE ENGAGEMENT TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recipe_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('save', 'plan_add', 'view')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipe_engagement_recipe_id ON public.recipe_engagement(recipe_id);
CREATE INDEX idx_recipe_engagement_recipe_type ON public.recipe_engagement(recipe_id, event_type);
CREATE INDEX idx_recipe_engagement_created ON public.recipe_engagement(created_at DESC);

ALTER TABLE public.recipe_engagement ENABLE ROW LEVEL SECURITY;

-- Anyone can record a view (even anonymous)
CREATE POLICY "Anyone can record recipe views" ON public.recipe_engagement
  FOR INSERT WITH CHECK (event_type = 'view');

-- Authenticated users can record saves and plan_adds
CREATE POLICY "Authenticated users can record recipe engagement" ON public.recipe_engagement
  FOR INSERT WITH CHECK (
    event_type IN ('save', 'plan_add')
    AND auth.uid() = user_id
  );

-- Creators can view stats for their own recipes
CREATE POLICY "Creators can view own recipe stats" ON public.recipe_engagement
  FOR SELECT USING (
    recipe_id IN (SELECT id FROM public.recipes WHERE user_id = auth.uid())
  );


-- ============================================================
-- PART C: POPULARITY QUERIES
-- ============================================================

-- Get popular public recipes ranked by engagement
CREATE OR REPLACE FUNCTION get_popular_recipes(
  result_limit INTEGER DEFAULT 20,
  days_window INTEGER DEFAULT 30
)
RETURNS TABLE (
  recipe_id UUID,
  title TEXT,
  image_url TEXT,
  description TEXT,
  total_time INTEGER,
  servings INTEGER,
  cuisine TEXT,
  tags TEXT[],
  dietary TEXT[],
  meal_types TEXT[],
  save_count BIGINT,
  plan_count BIGINT,
  popularity_score BIGINT,
  creator_user_id UUID,
  creator_display_name TEXT,
  creator_username TEXT,
  creator_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS recipe_id,
    r.title,
    r.image_url,
    r.description,
    r.total_time,
    r.servings,
    r.cuisine,
    r.tags,
    r.dietary,
    r.meal_types,
    COALESCE(saves.cnt, 0) AS save_count,
    COALESCE(plans.cnt, 0) AS plan_count,
    (COALESCE(saves.cnt, 0) * 3 + COALESCE(plans.cnt, 0)) AS popularity_score,
    r.user_id AS creator_user_id,
    p.display_name AS creator_display_name,
    p.username AS creator_username,
    p.avatar_url AS creator_avatar_url
  FROM public.recipes r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  LEFT JOIN (
    SELECT re.recipe_id, COUNT(*) AS cnt
    FROM public.recipe_engagement re
    WHERE re.event_type = 'save'
      AND re.created_at > NOW() - (days_window || ' days')::INTERVAL
    GROUP BY re.recipe_id
  ) saves ON saves.recipe_id = r.id
  LEFT JOIN (
    SELECT re.recipe_id, COUNT(*) AS cnt
    FROM public.recipe_engagement re
    WHERE re.event_type = 'plan_add'
      AND re.created_at > NOW() - (days_window || ' days')::INTERVAL
    GROUP BY re.recipe_id
  ) plans ON plans.recipe_id = r.id
  WHERE r.is_public = true
    AND r.is_archived = false
    AND r.original_recipe_id IS NULL
  ORDER BY popularity_score DESC, r.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get per-recipe stats for a creator
CREATE OR REPLACE FUNCTION get_creator_recipe_stats(creator_id UUID)
RETURNS TABLE (
  recipe_id UUID,
  save_count BIGINT,
  plan_count BIGINT
) AS $$
  SELECT
    re.recipe_id,
    COUNT(*) FILTER (WHERE re.event_type = 'save') AS save_count,
    COUNT(*) FILTER (WHERE re.event_type = 'plan_add') AS plan_count
  FROM public.recipe_engagement re
  INNER JOIN public.recipes r ON r.id = re.recipe_id
  WHERE r.user_id = creator_id
    AND r.is_public = true
  GROUP BY re.recipe_id;
$$ LANGUAGE sql SECURITY DEFINER;
