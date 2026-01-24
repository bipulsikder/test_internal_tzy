ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS primary_contact_name text,
  ADD COLUMN IF NOT EXISTS primary_contact_email text,
  ADD COLUMN IF NOT EXISTS primary_contact_phone text,
  ADD COLUMN IF NOT EXISTS additional_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS about_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS about_source_url text;

ALTER TABLE public.clients
  ALTER COLUMN website SET DEFAULT '';

UPDATE public.clients
  SET website = ''
  WHERE website IS NULL;

ALTER TABLE public.clients
  ALTER COLUMN website SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_website_nonempty'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_website_nonempty CHECK (length(trim(website)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_primary_contact_email_nonempty'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_primary_contact_email_nonempty CHECK (primary_contact_email IS NULL OR length(trim(primary_contact_email)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_primary_contact_name_nonempty'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_primary_contact_name_nonempty CHECK (primary_contact_name IS NULL OR length(trim(primary_contact_name)) > 0);
  END IF;
END $$;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS looking_for_work boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_job_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS available_start_time time,
  ADD COLUMN IF NOT EXISTS available_end_time time,
  ADD COLUMN IF NOT EXISTS work_timezone text,
  ADD COLUMN IF NOT EXISTS work_availability_updated_at timestamptz;
