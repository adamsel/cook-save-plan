-- Creator profile upgrade: cover photos, follower system
-- Adds cover_image_url to profiles and creates the creator_follows table.

-- 1. Add cover photo URL to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- 2. Create creator_follows table
CREATE TABLE IF NOT EXISTS public.creator_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT creator_follows_no_self_follow CHECK (follower_id <> following_id),
  CONSTRAINT creator_follows_unique UNIQUE (follower_id, following_id)
);

-- Index for fast follower count lookups
CREATE INDEX IF NOT EXISTS idx_creator_follows_following
  ON public.creator_follows(following_id);

-- 3. Enable RLS
ALTER TABLE public.creator_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can read follows (needed for public follower counts)
CREATE POLICY "Anyone can view follows"
  ON public.creator_follows FOR SELECT
  USING (true);

-- Authenticated users can follow (only as themselves)
CREATE POLICY "Users can follow creators"
  ON public.creator_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Authenticated users can unfollow (only their own follows)
CREATE POLICY "Users can unfollow creators"
  ON public.creator_follows FOR DELETE
  USING (auth.uid() = follower_id);
