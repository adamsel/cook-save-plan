-- Fix profiles table RLS: restrict visibility to own profile only
-- This prevents user enumeration and protects privacy

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);