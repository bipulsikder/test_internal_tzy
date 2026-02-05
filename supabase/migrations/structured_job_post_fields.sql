alter table jobs
  add column if not exists company_logo_url text,
  add column if not exists industry text,
  add column if not exists role_sub_category text,
  add column if not exists city text,
  add column if not exists area_hub text,
  add column if not exists salary_type text,
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists salary_currency text,
  add column if not exists shift_type text,
  add column if not exists employment_type text,
  add column if not exists urgency_tag text,
  add column if not exists openings integer,
  add column if not exists education_min text,
  add column if not exists experience_type text,
  add column if not exists experience_min_years integer,
  add column if not exists experience_max_years integer,
  add column if not exists experience_category text,
  add column if not exists languages_required text[],
  add column if not exists english_level text,
  add column if not exists license_type text,
  add column if not exists other_certifications text[],
  add column if not exists age_min integer,
  add column if not exists age_max integer,
  add column if not exists gender_preference text,
  add column if not exists role_category text,
  add column if not exists department_category text,
  add column if not exists work_type text,
  add column if not exists reporting_to text,
  add column if not exists skills_must_have text[],
  add column if not exists skills_good_to_have text[],
  add column if not exists key_responsibilities text[],
  add column if not exists daily_work_summary text,
  add column if not exists why_join text[],
  add column if not exists benefits text[],
  add column if not exists structured_version integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_salary_range_chk'
  ) then
    execute 'alter table jobs add constraint jobs_salary_range_chk check (salary_min is null or salary_max is null or salary_min <= salary_max)';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_age_range_chk'
  ) then
    execute 'alter table jobs add constraint jobs_age_range_chk check (age_min is null or age_max is null or age_min <= age_max)';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_salary_type_chk'
  ) then
    execute 'alter table jobs add constraint jobs_salary_type_chk check (salary_type is null or salary_type in (''monthly'',''daily'',''per_trip'',''hourly''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_shift_type_chk'
  ) then
    execute 'alter table jobs add constraint jobs_shift_type_chk check (shift_type is null or shift_type in (''day'',''night'',''rotational''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_employment_type_chk'
  ) then
    execute 'alter table jobs add constraint jobs_employment_type_chk check (employment_type is null or employment_type in (''full_time'',''part_time'',''contract''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_urgency_tag_chk'
  ) then
    execute 'alter table jobs add constraint jobs_urgency_tag_chk check (urgency_tag is null or urgency_tag in (''urgently_hiring'',''immediate_joining'',''limited_openings''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_education_min_chk'
  ) then
    execute 'alter table jobs add constraint jobs_education_min_chk check (education_min is null or education_min in (''no_formal'',''8th'',''10th'',''12th'',''graduate''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_experience_type_chk'
  ) then
    execute 'alter table jobs add constraint jobs_experience_type_chk check (experience_type is null or experience_type in (''fresher'',''experienced''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_experience_category_chk'
  ) then
    execute 'alter table jobs add constraint jobs_experience_category_chk check (experience_category is null or experience_category in (''heavy_vehicle'',''fleet_ops'',''warehouse'',''dispatch''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_english_level_chk'
  ) then
    execute 'alter table jobs add constraint jobs_english_level_chk check (english_level is null or english_level in (''no_english'',''basic'',''thoda'',''good''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_license_type_chk'
  ) then
    execute 'alter table jobs add constraint jobs_license_type_chk check (license_type is null or license_type in (''lmv'',''hmv'',''mcwg'',''not_required''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_gender_pref_chk'
  ) then
    execute 'alter table jobs add constraint jobs_gender_pref_chk check (gender_preference is null or gender_preference in (''male'',''female'',''any''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_role_category_chk'
  ) then
    execute 'alter table jobs add constraint jobs_role_category_chk check (role_category is null or role_category in (''last_mile_delivery'',''line_haul'',''long_haul'',''warehouse_operations'',''fleet_operations''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_department_category_chk'
  ) then
    execute 'alter table jobs add constraint jobs_department_category_chk check (department_category is null or department_category in (''operations'',''fleet'',''dispatch'',''warehouse''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_work_type_chk'
  ) then
    execute 'alter table jobs add constraint jobs_work_type_chk check (work_type is null or work_type in (''on_road'',''on_site'',''hybrid''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_reporting_to_chk'
  ) then
    execute 'alter table jobs add constraint jobs_reporting_to_chk check (reporting_to is null or reporting_to in (''supervisor'',''fleet_manager'',''operations_head''))';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_role_sub_category_chk'
  ) then
    execute 'alter table jobs add constraint jobs_role_sub_category_chk check (role_sub_category is null or role_sub_category in (''driver_heavy_vehicle'',''driver_light_commercial'',''dispatcher'',''warehouse_staff'',''fleet_manager'',''operations_executive''))';
  end if;
end $$;

create table if not exists job_sections (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  section_key text not null,
  heading text not null,
  body_md text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_sections_job_id_idx on job_sections(job_id);
create index if not exists job_sections_job_id_sort_idx on job_sections(job_id, sort_order);

alter table job_sections enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'jobs'
      and c.relrowsecurity = true
  ) then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'jobs'
        and policyname = 'jobs_read_published'
    ) then
      execute 'create policy "jobs_read_published" on public.jobs for select to anon using (status = ''open'')';
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'jobs'
        and policyname = 'jobs_read_published_auth'
    ) then
      execute 'create policy "jobs_read_published_auth" on public.jobs for select to authenticated using (true)';
    end if;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_sections'
      and policyname = 'job_sections_read_published'
  ) then
    execute 'create policy "job_sections_read_published" on public.job_sections for select to anon using (exists (select 1 from public.jobs j where j.id = job_id and j.status = ''open''))';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_sections'
      and policyname = 'job_sections_full_auth'
  ) then
    execute 'create policy "job_sections_full_auth" on public.job_sections for all to authenticated using (true) with check (true)';
  end if;
end $$;

grant select on job_sections to anon;
grant all privileges on job_sections to authenticated;

create index if not exists jobs_status_idx on jobs(status);
create index if not exists jobs_city_idx on jobs(city);
create index if not exists jobs_employment_type_idx on jobs(employment_type);
create index if not exists jobs_shift_type_idx on jobs(shift_type);
create index if not exists jobs_role_category_idx on jobs(role_category);
