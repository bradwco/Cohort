-- 24h retention for screen_classifications + their backing storage objects.
-- Uses pg_cron. If the project doesn't run pg_cron, drop this migration and
-- run the equivalent on a Supabase Edge Function schedule instead.

create extension if not exists pg_cron;

create or replace function cohort_purge_old_screen_classifications()
returns void
language plpgsql
security definer
as $$
declare
  victim record;
begin
  for victim in
    select id, storage_path
    from screen_classifications
    where captured_at < now() - interval '24 hours'
  loop
    perform storage.delete_object('screenshots', victim.storage_path);
    delete from screen_classifications where id = victim.id;
  end loop;
end;
$$;

select cron.schedule(
  'cohort-purge-screens',
  '17 * * * *',
  $$select cohort_purge_old_screen_classifications();$$
);
