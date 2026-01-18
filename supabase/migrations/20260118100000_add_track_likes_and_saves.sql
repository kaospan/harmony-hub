-- Create track_likes table for user likes
CREATE TABLE IF NOT EXISTS public.track_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_track_likes_user ON public.track_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_track_likes_track ON public.track_likes(track_id);
CREATE INDEX IF NOT EXISTS idx_track_likes_created ON public.track_likes(created_at DESC);

-- Enable RLS
ALTER TABLE public.track_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own likes"
ON public.track_likes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all likes count"
ON public.track_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can like tracks"
ON public.track_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike tracks"
ON public.track_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create track_saves table for user saves
CREATE TABLE IF NOT EXISTS public.track_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_track_saves_user ON public.track_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_track_saves_track ON public.track_saves(track_id);
CREATE INDEX IF NOT EXISTS idx_track_saves_created ON public.track_saves(created_at DESC);

-- Enable RLS
ALTER TABLE public.track_saves ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saves"
ON public.track_saves
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all saves count"
ON public.track_saves
FOR SELECT
USING (true);

CREATE POLICY "Users can save tracks"
ON public.track_saves
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave tracks"
ON public.track_saves
FOR DELETE
USING (auth.uid() = user_id);
