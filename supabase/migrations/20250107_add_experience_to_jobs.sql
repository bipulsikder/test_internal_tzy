-- Add experience column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS experience text;
