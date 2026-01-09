-- Create job_matches table to persist AI match results
create table if not exists public.job_matches (
  job_id uuid references public.jobs(id) on delete cascade not null,
  candidate_id uuid references public.candidates(id) on delete cascade not null,
  relevance_score float,
  match_summary text,
  score_breakdown jsonb,
  matching_keywords jsonb, -- Storing array as jsonb for flexibility
  source text default 'database',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (job_id, candidate_id)
);

-- Enable RLS
alter table public.job_matches enable row level security;

-- Policies
create policy "Allow read access to authenticated users"
  on public.job_matches for select
  to authenticated
  using (true);

create policy "Allow insert/update access to authenticated users"
  on public.job_matches for insert
  to authenticated
  with check (true);

create policy "Allow update access to authenticated users"
  on public.job_matches for update
  to authenticated
  using (true);

-- Indexes for performance
create index if not exists idx_job_matches_job_id on public.job_matches(job_id);
create index if not exists idx_job_matches_candidate_id on public.job_matches(candidate_id);
create index if not exists idx_job_matches_score on public.job_matches(relevance_score desc);
