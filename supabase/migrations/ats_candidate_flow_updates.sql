ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS auth_user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS candidates_auth_user_id_key ON public.candidates(auth_user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user_candidate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.candidates (auth_user_id, email, name, "current_role", total_experience, location, status, uploaded_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'Candidate',
    '0',
    'Unknown',
    'new',
    now(),
    now()
  )
  ON CONFLICT (email)
  DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id, updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_candidate ON auth.users;
CREATE TRIGGER on_auth_user_created_candidate
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user_candidate();

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS attribution jsonb;

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parsing_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS candidates_select_own ON public.candidates;
CREATE POLICY candidates_select_own ON public.candidates
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS candidates_update_own ON public.candidates;
CREATE POLICY candidates_update_own ON public.candidates
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS applications_select_own ON public.applications;
CREATE POLICY applications_select_own ON public.applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.candidates c
      WHERE c.id = applications.candidate_id
        AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS applications_insert_own ON public.applications;
CREATE POLICY applications_insert_own ON public.applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.candidates c
      WHERE c.id = applications.candidate_id
        AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS file_storage_select_own ON public.file_storage;
CREATE POLICY file_storage_select_own ON public.file_storage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.candidates c
      WHERE c.id = file_storage.candidate_id
        AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS parsing_jobs_select_own ON public.parsing_jobs;
CREATE POLICY parsing_jobs_select_own ON public.parsing_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.candidates c
      WHERE c.id = parsing_jobs.candidate_id
        AND c.auth_user_id = auth.uid()
    )
  );

GRANT SELECT ON public.jobs TO anon;
GRANT SELECT ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.candidates TO authenticated;
GRANT SELECT, INSERT ON public.applications TO authenticated;
GRANT SELECT, INSERT ON public.file_storage TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.parsing_jobs TO authenticated;
