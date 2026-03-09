-- Track views and clones of shared meal plans
CREATE TABLE IF NOT EXISTS plan_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'clone')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plan_engagement_plan_id ON plan_engagement(meal_plan_id);
CREATE INDEX idx_plan_engagement_type ON plan_engagement(meal_plan_id, event_type);

ALTER TABLE plan_engagement ENABLE ROW LEVEL SECURITY;

-- Anyone can record a view (even anonymous visitors)
CREATE POLICY "Anyone can record views" ON plan_engagement
  FOR INSERT WITH CHECK (event_type = 'view');

-- Authenticated users can record clones
CREATE POLICY "Authenticated users can record clones" ON plan_engagement
  FOR INSERT WITH CHECK (event_type = 'clone' AND auth.uid() = user_id);

-- Creators can view stats for their own plans
CREATE POLICY "Creators can view own plan stats" ON plan_engagement
  FOR SELECT USING (
    meal_plan_id IN (SELECT id FROM meal_plans WHERE user_id = auth.uid())
  );

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_follower', 'plan_cloned')),
  data JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Any authenticated user can create notifications (for follow/clone events)
CREATE POLICY "Authenticated users can create notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
