-- Add sections column to tracks table for song structure data
ALTER TABLE public.tracks
ADD COLUMN sections JSONB;

-- Add comment to describe the column
COMMENT ON COLUMN public.tracks.sections IS 'Array of song sections with timestamps: [{type: "intro"|"verse"|"chorus"|"bridge"|"outro", label: string, start_time: number, end_time?: number}]';
