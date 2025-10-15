-- Fix 1: Improve storage policies for 'posts' bucket with explicit authentication and file type validation
-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view posts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own posts" ON storage.objects;

-- Create improved policies with explicit authentication checks
CREATE POLICY "Anyone can view posts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts');

CREATE POLICY "Authenticated users can upload posts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'posts' 
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'webp'))
  );

CREATE POLICY "Users can update own posts"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'posts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own posts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'posts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Fix 2: Add SET search_path to trigger functions for security
-- Update follow counts trigger function
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    UPDATE public.profiles
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET following_count = following_count - 1
    WHERE id = OLD.follower_id;
    
    UPDATE public.profiles
    SET followers_count = followers_count - 1
    WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Update post likes count trigger function
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;