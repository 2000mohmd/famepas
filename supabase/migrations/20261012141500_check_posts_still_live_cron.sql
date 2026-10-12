-- Daily cron trigger for check-posts-still-live (C9 automation). Same
-- net.http_post + anon apikey pattern as recalc-influencer-scores-nightly;
-- the edge function itself needs no end-user session (verify_jwt = false).
select cron.schedule(
  'check-posts-still-live-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dvauueqtqrveqcckfrjx.supabase.co/functions/v1/check-posts-still-live',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXV1ZXF0cXJ2ZXFjY2tmcmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTQ3NDMsImV4cCI6MjA4NzAzMDc0M30.Zpxj1of_wLzpqMDG72S00gpQPwi7kPpgrslcDfQXHV8"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
