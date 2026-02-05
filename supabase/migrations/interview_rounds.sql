create table if not exists job_interview_rounds (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  name text not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_interview_rounds_job_id on job_interview_rounds(job_id);

create table if not exists job_interviews (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references job_interview_rounds(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  status text not null default 'pending',
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id, application_id),
  constraint job_interviews_status_check check (status in ('pending','scheduled','completed','passed','failed','no_show'))
);

create index if not exists idx_job_interviews_round_id on job_interviews(round_id);
create index if not exists idx_job_interviews_application_id on job_interviews(application_id);

