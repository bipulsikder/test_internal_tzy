create table if not exists upload_logs (
  id uuid primary key default gen_random_uuid(),
  hr_user_id uuid references hr_users(id),
  candidate_id uuid,
  file_name text,
  file_type text,
  file_size integer,
  file_hash text,
  status text not null default 'processing',
  result_type text,
  parsing_method text,
  parsing_errors jsonb,
  message text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists upload_logs_hr_user_id_created_at_idx on upload_logs(hr_user_id, created_at desc);
create index if not exists upload_logs_created_at_idx on upload_logs(created_at desc);

alter table upload_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'upload_logs'
      and policyname = 'upload_logs_read_own'
  ) then
    execute 'create policy "upload_logs_read_own" on public.upload_logs for select to authenticated using (hr_user_id = auth.uid())';
  end if;
end $$;

grant select on upload_logs to authenticated;
