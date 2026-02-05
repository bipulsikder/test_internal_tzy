do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'job_interviews_status_check'
  ) then
    alter table job_interviews drop constraint job_interviews_status_check;
  end if;
end $$;

update job_interviews
set status = 'pending'
where status is null
   or status not in ('pending','waitlist','on_hold','passed','move_next','rejected');

alter table job_interviews
  add constraint job_interviews_status_check
  check (status in ('pending','waitlist','on_hold','passed','move_next','rejected'));
