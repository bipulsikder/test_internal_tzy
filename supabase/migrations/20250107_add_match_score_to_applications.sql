-- Add match_score column to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS match_score numeric;
