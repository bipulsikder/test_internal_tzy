ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS apply_type text NOT NULL DEFAULT 'in_platform',
  ADD COLUMN IF NOT EXISTS external_apply_url text;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_apply_type_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_apply_type_check CHECK (apply_type = ANY (ARRAY['in_platform'::text, 'external'::text]));

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_external_apply_url_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_external_apply_url_check CHECK ((apply_type <> 'external'::text) OR (external_apply_url IS NOT NULL AND length(btrim(external_apply_url)) > 0));

CREATE INDEX IF NOT EXISTS idx_jobs_apply_type ON public.jobs(apply_type);

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS preferred_roles text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.external_apply_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  candidate_id uuid,
  job_id uuid NOT NULL,
  redirect_url text NOT NULL,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_apply_events_auth_user_id_created_at
  ON public.external_apply_events(auth_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_apply_events_job_id_created_at
  ON public.external_apply_events(job_id, created_at DESC);

ALTER TABLE public.external_apply_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_apply_events_insert_own ON public.external_apply_events;
CREATE POLICY external_apply_events_insert_own
  ON public.external_apply_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS external_apply_events_select_own ON public.external_apply_events;
CREATE POLICY external_apply_events_select_own
  ON public.external_apply_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

GRANT SELECT ON public.jobs TO anon;
GRANT SELECT ON public.jobs TO authenticated;
GRANT INSERT, SELECT ON public.external_apply_events TO authenticated;
