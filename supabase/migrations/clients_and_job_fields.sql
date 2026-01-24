CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  about text,
  website text,
  company_type text,
  location text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clients_slug_unique ON public.clients(slug);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_public_read'
  ) THEN
    CREATE POLICY clients_public_read ON public.clients FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_authenticated_write'
  ) THEN
    CREATE POLICY clients_authenticated_write ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT ON public.clients TO anon;
GRANT ALL PRIVILEGES ON public.clients TO authenticated;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS client_id uuid;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS amount text;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS skills_required text[];

