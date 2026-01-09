-- Add source column to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS source text DEFAULT 'applied';
