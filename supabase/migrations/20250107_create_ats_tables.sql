-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    department TEXT,
    location TEXT,
    type TEXT, -- Full-time, Part-time, Contract, etc.
    status TEXT DEFAULT 'open', -- open, closed, draft
    requirements TEXT[],
    salary_range TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- References auth.users(id) theoretically
);

-- Create applications table (junction between jobs and candidates)
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'applied', -- applied, screening, interview, offer, hired, rejected
    notes TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, candidate_id)
);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Policies for jobs
-- Everyone can view open jobs (for job board)
CREATE POLICY "Public jobs are viewable by everyone" ON jobs
    FOR SELECT USING (true);

-- Only authenticated users (HR/Admin) can insert/update jobs
CREATE POLICY "Authenticated users can manage jobs" ON jobs
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for applications
-- Authenticated users (HR) can view all applications
CREATE POLICY "Authenticated users can view applications" ON applications
    FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can manage applications
CREATE POLICY "Authenticated users can manage applications" ON applications
    FOR ALL USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
