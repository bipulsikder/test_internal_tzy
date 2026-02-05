do $$
begin
  if exists (select 1 from pg_constraint where conname = 'jobs_role_sub_category_chk') then
    execute 'alter table jobs drop constraint jobs_role_sub_category_chk';
  end if;
  if exists (select 1 from pg_constraint where conname = 'jobs_experience_type_chk') then
    execute 'alter table jobs drop constraint jobs_experience_type_chk';
  end if;
  if exists (select 1 from pg_constraint where conname = 'jobs_experience_category_chk') then
    execute 'alter table jobs drop constraint jobs_experience_category_chk';
  end if;
  if exists (select 1 from pg_constraint where conname = 'jobs_work_type_chk') then
    execute 'alter table jobs drop constraint jobs_work_type_chk';
  end if;
  if exists (select 1 from pg_constraint where conname = 'jobs_reporting_to_chk') then
    execute 'alter table jobs drop constraint jobs_reporting_to_chk';
  end if;
end $$;

alter table jobs
  drop column if exists role_sub_category,
  drop column if exists area_hub,
  drop column if exists salary_currency,
  drop column if exists experience_type,
  drop column if exists experience_category,
  drop column if exists other_certifications,
  drop column if exists work_type,
  drop column if exists reporting_to,
  drop column if exists key_responsibilities,
  drop column if exists daily_work_summary,
  drop column if exists why_join,
  drop column if exists benefits,
  drop column if exists amount,
  drop column if exists skills_required,
  drop column if exists requirements,
  drop column if exists salary_range,
  drop column if exists positions,
  drop column if exists positions_count,
  drop column if exists experience_min,
  drop column if exists experience_max,
  drop column if exists experience,
  drop column if exists type,
  drop column if exists department;

drop index if exists jobs_role_category_idx;
drop index if exists jobs_shift_type_idx;
drop index if exists jobs_employment_type_idx;
drop index if exists jobs_city_idx;

create index if not exists jobs_status_idx on jobs(status);
create index if not exists jobs_city_idx on jobs(city);
create index if not exists jobs_employment_type_idx on jobs(employment_type);
create index if not exists jobs_shift_type_idx on jobs(shift_type);
