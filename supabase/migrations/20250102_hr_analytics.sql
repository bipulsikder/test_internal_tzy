-- Create HR Users table
CREATE TABLE IF NOT EXISTS hr_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Add uploaded_by to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES hr_users(id);

-- Create Search Logs table
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_user_id UUID REFERENCES hr_users(id),
  search_query TEXT,
  filters JSONB,
  results_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to verify credentials (simple text comparison for now, can be upgraded to bcrypt)
CREATE OR REPLACE FUNCTION verify_hr_credentials(email_input TEXT, password_input TEXT)
RETURNS TABLE (id UUID, email TEXT, name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.name
  FROM hr_users u
  WHERE u.email = email_input AND u.password_hash = password_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics for a specific HR user
CREATE OR REPLACE FUNCTION get_hr_analytics(target_hr_id UUID)
RETURNS JSONB AS $$
DECLARE
  upload_count INTEGER;
  search_count INTEGER;
  recent_searches JSONB;
  recent_uploads JSONB;
BEGIN
  -- Count uploads
  SELECT COUNT(*) INTO upload_count FROM candidates WHERE uploaded_by = target_hr_id;
  
  -- Count searches
  SELECT COUNT(*) INTO search_count FROM search_logs WHERE hr_user_id = target_hr_id;
  
  -- Get recent searches
  SELECT jsonb_agg(t) INTO recent_searches
  FROM (
    SELECT search_query, created_at, results_count
    FROM search_logs
    WHERE hr_user_id = target_hr_id
    ORDER BY created_at DESC
    LIMIT 5
  ) t;

  -- Get recent uploads
  SELECT jsonb_agg(t) INTO recent_uploads
  FROM (
    SELECT name, uploaded_at as created_at, status
    FROM candidates
    WHERE uploaded_by = target_hr_id
    ORDER BY uploaded_at DESC
    LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'upload_count', upload_count,
    'search_count', search_count,
    'recent_searches', COALESCE(recent_searches, '[]'::jsonb),
    'recent_uploads', COALESCE(recent_uploads, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
