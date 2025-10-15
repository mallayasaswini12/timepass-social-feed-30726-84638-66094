-- Add type column to posts table to differentiate between posts and reels
ALTER TABLE public.posts ADD COLUMN type TEXT NOT NULL DEFAULT 'post' CHECK (type IN ('post', 'reel'));

-- Add index for better query performance
CREATE INDEX idx_posts_type ON public.posts(type);

-- Add video_url column for reels (image_url will be used for thumbnail)
ALTER TABLE public.posts ADD COLUMN video_url TEXT;

COMMENT ON COLUMN public.posts.type IS 'Type of content: post (image) or reel (video)';
COMMENT ON COLUMN public.posts.video_url IS 'URL for video content when type is reel';