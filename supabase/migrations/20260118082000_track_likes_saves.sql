-- Create track_likes table
CREATE TABLE public.track_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Create track_saves table
CREATE TABLE public.track_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Enable RLS
ALTER TABLE public.track_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_saves ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_track_likes_user ON public.track_likes(user_id);
CREATE INDEX idx_track_likes_track ON public.track_likes(track_id);
CREATE INDEX idx_track_saves_user ON public.track_saves(user_id);
CREATE INDEX idx_track_saves_track ON public.track_saves(track_id);

-- RLS Policies for track_likes
CREATE POLICY "Users can view all likes"
ON public.track_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own likes"
ON public.track_likes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for track_saves
CREATE POLICY "Users can view all saves"
ON public.track_saves
FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own saves"
ON public.track_saves
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
