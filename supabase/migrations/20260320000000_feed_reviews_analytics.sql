-- ============================================================
-- PART A: FOLLOWER NOTIFICATIONS (TRIGGERS)
-- ============================================================

-- Update notifications CHECK constraint to include new types
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_follower', 'plan_cloned', 'recipe_saved', 'new_content', 'new_review'));

-- Trigger: notify followers when a recipe is shared publicly
CREATE OR REPLACE FUNCTION notify_followers_on_share()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when is_public transitions from false/null to true
  IF NEW.is_public = true AND (OLD.is_public = false OR OLD.is_public IS NULL) THEN
    INSERT INTO public.notifications (user_id, type, data)
    SELECT
      cf.follower_id,
      'new_content',
      jsonb_build_object(
        'creator_id', NEW.user_id::text,
        'creator_name', COALESCE(p.display_name, p.username, 'A creator'),
        'content_type', 'recipe',
        'content_id', NEW.id::text,
        'content_title', NEW.title
      )
    FROM public.creator_follows cf
    LEFT JOIN public.profiles p ON p.user_id = NEW.user_id
    WHERE cf.following_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_followers_recipe_share
  AFTER UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_on_share();

-- Trigger: notify followers when a meal plan is shared
CREATE OR REPLACE FUNCTION notify_followers_on_plan_share()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when is_shared transitions from false to true
  IF NEW.is_shared = true AND (OLD.is_shared = false OR OLD.is_shared IS NULL) THEN
    INSERT INTO public.notifications (user_id, type, data)
    SELECT
      cf.follower_id,
      'new_content',
      jsonb_build_object(
        'creator_id', NEW.user_id::text,
        'creator_name', COALESCE(p.display_name, p.username, 'A creator'),
        'content_type', 'meal_plan',
        'content_id', NEW.id::text,
        'content_title', COALESCE(NEW.title, 'Week of ' || to_char(NEW.week_start_date, 'Mon DD, YYYY'))
      )
    FROM public.creator_follows cf
    LEFT JOIN public.profiles p ON p.user_id = NEW.user_id
    WHERE cf.following_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_followers_plan_share
  AFTER UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_on_plan_share();


-- ============================================================
-- PART B: FOLLOWING FEED (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION get_following_feed(
  requesting_user_id UUID,
  result_limit INTEGER DEFAULT 20,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  content_type TEXT,
  content_id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  total_time INTEGER,
  servings INTEGER,
  cuisine TEXT,
  tags TEXT[],
  published_at TIMESTAMPTZ,
  save_count BIGINT,
  creator_user_id UUID,
  creator_display_name TEXT,
  creator_username TEXT,
  creator_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  (
    -- Public recipes from followed creators
    SELECT
      'recipe'::TEXT AS content_type,
      r.id AS content_id,
      r.title,
      r.description,
      r.image_url,
      r.total_time,
      r.servings,
      r.cuisine,
      r.tags,
      r.updated_at AS published_at,
      COALESCE(saves.cnt, 0) AS save_count,
      r.user_id AS creator_user_id,
      p.display_name AS creator_display_name,
      p.username AS creator_username,
      p.avatar_url AS creator_avatar_url
    FROM public.recipes r
    INNER JOIN public.creator_follows cf
      ON cf.following_id = r.user_id AND cf.follower_id = requesting_user_id
    LEFT JOIN public.profiles p ON p.user_id = r.user_id
    LEFT JOIN (
      SELECT re.recipe_id, COUNT(*) AS cnt
      FROM public.recipe_engagement re
      WHERE re.event_type = 'save'
      GROUP BY re.recipe_id
    ) saves ON saves.recipe_id = r.id
    WHERE r.is_public = true AND r.is_archived = false

    UNION ALL

    -- Shared meal plans from followed creators
    SELECT
      'meal_plan'::TEXT AS content_type,
      mp.id AS content_id,
      COALESCE(mp.title, 'Week of ' || to_char(mp.week_start_date, 'Mon DD, YYYY')) AS title,
      NULL::TEXT AS description,
      NULL::TEXT AS image_url,
      NULL::INTEGER AS total_time,
      NULL::INTEGER AS servings,
      NULL::TEXT AS cuisine,
      ARRAY[]::TEXT[] AS tags,
      mp.updated_at AS published_at,
      COALESCE(clones.cnt, 0) AS save_count,
      mp.user_id AS creator_user_id,
      p.display_name AS creator_display_name,
      p.username AS creator_username,
      p.avatar_url AS creator_avatar_url
    FROM public.meal_plans mp
    INNER JOIN public.creator_follows cf
      ON cf.following_id = mp.user_id AND cf.follower_id = requesting_user_id
    LEFT JOIN public.profiles p ON p.user_id = mp.user_id
    LEFT JOIN (
      SELECT pe.meal_plan_id, COUNT(*) AS cnt
      FROM public.plan_engagement pe
      WHERE pe.event_type = 'clone'
      GROUP BY pe.meal_plan_id
    ) clones ON clones.meal_plan_id = mp.id
    WHERE mp.is_shared = true
  )
  ORDER BY published_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- PART C: RECIPE REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recipe_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT recipe_reviews_unique UNIQUE (recipe_id, user_id)
);

CREATE INDEX idx_recipe_reviews_recipe ON public.recipe_reviews(recipe_id);
CREATE INDEX idx_recipe_reviews_user ON public.recipe_reviews(user_id);

ALTER TABLE public.recipe_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews of public recipes
CREATE POLICY "Anyone can read reviews of public recipes" ON public.recipe_reviews
  FOR SELECT USING (
    recipe_id IN (SELECT id FROM public.recipes WHERE is_public = true)
  );

-- Users can insert their own reviews (not on own recipes)
CREATE POLICY "Users can create reviews" ON public.recipe_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND recipe_id NOT IN (SELECT id FROM public.recipes WHERE user_id = auth.uid())
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON public.recipe_reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" ON public.recipe_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- RPC: get average rating for a recipe
CREATE OR REPLACE FUNCTION get_recipe_rating(target_recipe_id UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  review_count BIGINT
) AS $$
  SELECT
    ROUND(AVG(rating)::numeric, 1) AS average_rating,
    COUNT(*) AS review_count
  FROM public.recipe_reviews
  WHERE recipe_id = target_recipe_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- RPC: get reviews for a recipe with user info
CREATE OR REPLACE FUNCTION get_recipe_reviews(
  target_recipe_id UUID,
  result_limit INTEGER DEFAULT 20,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  review_text TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT
) AS $$
  SELECT
    rr.id,
    rr.rating,
    rr.review_text,
    rr.created_at,
    rr.user_id,
    p.display_name,
    p.username,
    p.avatar_url
  FROM public.recipe_reviews rr
  LEFT JOIN public.profiles p ON p.user_id = rr.user_id
  WHERE rr.recipe_id = target_recipe_id
  ORDER BY rr.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
$$ LANGUAGE sql SECURITY DEFINER;


-- ============================================================
-- PART D: CREATOR ANALYTICS RPCs
-- ============================================================

-- Dashboard overview stats
CREATE OR REPLACE FUNCTION get_creator_dashboard_stats(creator_id UUID)
RETURNS TABLE (
  follower_count BIGINT,
  new_followers_30d BIGINT,
  public_recipe_count BIGINT,
  shared_plan_count BIGINT,
  recipe_saves BIGINT,
  recipe_views BIGINT,
  plan_views BIGINT,
  plan_clones BIGINT
) AS $$
  SELECT
    (SELECT COUNT(*) FROM public.creator_follows WHERE following_id = creator_id) AS follower_count,
    (SELECT COUNT(*) FROM public.creator_follows WHERE following_id = creator_id AND created_at > NOW() - INTERVAL '30 days') AS new_followers_30d,
    (SELECT COUNT(*) FROM public.recipes WHERE user_id = creator_id AND is_public = true AND is_archived = false) AS public_recipe_count,
    (SELECT COUNT(*) FROM public.meal_plans WHERE user_id = creator_id AND is_shared = true) AS shared_plan_count,
    (SELECT COUNT(*) FROM public.recipe_engagement re INNER JOIN public.recipes r ON r.id = re.recipe_id WHERE r.user_id = creator_id AND re.event_type = 'save') AS recipe_saves,
    (SELECT COUNT(*) FROM public.recipe_engagement re INNER JOIN public.recipes r ON r.id = re.recipe_id WHERE r.user_id = creator_id AND re.event_type = 'view') AS recipe_views,
    (SELECT COUNT(*) FROM public.plan_engagement pe INNER JOIN public.meal_plans mp ON mp.id = pe.meal_plan_id WHERE mp.user_id = creator_id AND pe.event_type = 'view') AS plan_views,
    (SELECT COUNT(*) FROM public.plan_engagement pe INNER JOIN public.meal_plans mp ON mp.id = pe.meal_plan_id WHERE mp.user_id = creator_id AND pe.event_type = 'clone') AS plan_clones;
$$ LANGUAGE sql SECURITY DEFINER;

-- Per-recipe detailed stats
CREATE OR REPLACE FUNCTION get_creator_recipe_stats_detailed(creator_id UUID)
RETURNS TABLE (
  recipe_id UUID,
  title TEXT,
  image_url TEXT,
  is_public BOOLEAN,
  save_count BIGINT,
  plan_add_count BIGINT,
  view_count BIGINT
) AS $$
  SELECT
    r.id AS recipe_id,
    r.title,
    r.image_url,
    r.is_public,
    COUNT(*) FILTER (WHERE re.event_type = 'save') AS save_count,
    COUNT(*) FILTER (WHERE re.event_type = 'plan_add') AS plan_add_count,
    COUNT(*) FILTER (WHERE re.event_type = 'view') AS view_count
  FROM public.recipes r
  LEFT JOIN public.recipe_engagement re ON re.recipe_id = r.id
  WHERE r.user_id = creator_id
    AND r.is_public = true
    AND r.is_archived = false
  GROUP BY r.id, r.title, r.image_url, r.is_public
  ORDER BY (COUNT(*) FILTER (WHERE re.event_type = 'save') * 3 + COUNT(*) FILTER (WHERE re.event_type = 'plan_add')) DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Per-plan stats
CREATE OR REPLACE FUNCTION get_creator_plan_stats(creator_id UUID)
RETURNS TABLE (
  plan_id UUID,
  title TEXT,
  week_start_date DATE,
  view_count BIGINT,
  clone_count BIGINT
) AS $$
  SELECT
    mp.id AS plan_id,
    COALESCE(mp.title, 'Week of ' || to_char(mp.week_start_date, 'Mon DD, YYYY')) AS title,
    mp.week_start_date,
    COUNT(*) FILTER (WHERE pe.event_type = 'view') AS view_count,
    COUNT(*) FILTER (WHERE pe.event_type = 'clone') AS clone_count
  FROM public.meal_plans mp
  LEFT JOIN public.plan_engagement pe ON pe.meal_plan_id = mp.id
  WHERE mp.user_id = creator_id
    AND mp.is_shared = true
  GROUP BY mp.id, mp.title, mp.week_start_date
  ORDER BY mp.week_start_date DESC;
$$ LANGUAGE sql SECURITY DEFINER;
