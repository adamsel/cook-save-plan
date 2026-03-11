-- Add video URL support to recipes
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_platform TEXT;

-- Add comment for documentation
COMMENT ON COLUMN recipes.video_url IS 'URL to a video showing how to make this recipe (YouTube, Instagram, TikTok)';
COMMENT ON COLUMN recipes.video_platform IS 'Platform of the video: youtube, instagram, tiktok, vimeo';
