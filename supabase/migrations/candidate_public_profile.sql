ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS public_profile_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS public_profile_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS candidates_public_profile_slug_unique
  ON public.candidates(public_profile_slug)
  WHERE public_profile_slug IS NOT NULL;

