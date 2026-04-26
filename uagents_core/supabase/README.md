# Supabase setup for the Cohort Agent

## 1. Apply migrations

```
supabase db push
```

or copy each file in `migrations/` into the Supabase SQL editor in order.

## 2. Storage bucket — manual

The Supabase dashboard is the easiest path:

1. Storage → New bucket
   - Name: `screenshots`
   - Public: **off**
2. Bucket policies (Storage → Policies, on the `screenshots` bucket):
   - **Read**: `auth.uid()::text = (storage.foldername(name))[1]` — owners can read their own folder.
   - **Write**: leave to service-role only (no anon/auth policy needed). The Electron overlay uploads with the service-role key.

Path layout the overlay already uses:

```
screenshots/{user_id}/{unix_ms}.jpg
```

## 3. Retention

`migrations/0002_screenshots_retention.sql` schedules an hourly `pg_cron` job
that deletes `screen_classifications` rows older than 24h plus the matching
storage objects. Verify it landed:

```sql
select * from cron.job where jobname = 'cohort-purge-screens';
```

If `pg_cron` isn't enabled on the project, drop the migration and run
`cohort_purge_old_screen_classifications()` from a Supabase Edge Function on
a scheduled trigger instead.

## 4. Sanity check

```sql
-- Should return zero rows on a fresh project.
select count(*) from screen_classifications;
```

Insert a fake row dated 25 hours ago, wait one cron tick (top of the next
hour + ~17 min), and confirm it disappears along with the matching storage
object.
