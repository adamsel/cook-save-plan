-- Store vertical position (0-100%) for cover photo cropping
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_image_position INTEGER DEFAULT 50;
