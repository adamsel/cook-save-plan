-- Extend get_following_feed to include recipe_image_urls for meal plan collage cards
-- Must drop first because return type is changing (adding recipe_image_urls column)
DROP FUNCTION IF EXISTS get_following_feed(UUID, INTEGER, INTEGER);
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
  creator_avatar_url TEXT,
  recipe_image_urls TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  (
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
      p.avatar_url AS creator_avatar_url,
      CASE WHEN r.image_url IS NOT NULL THEN ARRAY[r.image_url] ELSE ARRAY[]::TEXT[] END AS recipe_image_urls
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
      p.avatar_url AS creator_avatar_url,
      COALESCE(
        (
          SELECT ARRAY_AGG(sub_r.image_url)
          FROM (
            SELECT DISTINCT r2.image_url
            FROM public.meal_plan_items mpi
            INNER JOIN public.recipes r2 ON r2.id = mpi.recipe_id
            WHERE mpi.meal_plan_id = mp.id
              AND r2.image_url IS NOT NULL
            LIMIT 4
          ) sub_r
        ),
        ARRAY[]::TEXT[]
      ) AS recipe_image_urls
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
