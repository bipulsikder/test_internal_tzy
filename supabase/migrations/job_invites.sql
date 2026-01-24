create table if not exists public.job_invites (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid references public.candidates(id) on delete set null,
  email text not null,
  token text not null unique,
  status text not null default 'sent' check (status in ('sent','opened','applied','rejected','expired')),
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  responded_at timestamptz,
  applied_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists job_invites_job_email_unique on public.job_invites(job_id, email);

alter table public.job_invites enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='job_invites' and policyname='job_invites_select_own'
  ) then
    create policy job_invites_select_own on public.job_invites
      for select
      to authenticated
      using (
        email = (auth.jwt() ->> 'email')
        or candidate_id in (select id from public.candidates where auth_user_id = auth.uid())
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='job_invites' and policyname='job_invites_update_own'
  ) then
    create policy job_invites_update_own on public.job_invites
      for update
      to authenticated
      using (
        email = (auth.jwt() ->> 'email')
        or candidate_id in (select id from public.candidates where auth_user_id = auth.uid())
      )
      with check (
        email = (auth.jwt() ->> 'email')
        or candidate_id in (select id from public.candidates where auth_user_id = auth.uid())
      );
  end if;
end $$;

