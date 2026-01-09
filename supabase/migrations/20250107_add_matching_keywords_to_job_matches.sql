-- Add matching_keywords column to job_matches table if it doesn't exist
ALTER TABLE public.job_matches ADD COLUMN IF NOT EXISTS matching_keywords jsonb;
