-- Sarah's request (2026-10-16): email when sales reps log activity.
-- Bundled every 15 minutes by the sales-activity-digest edge function.

-- Who receives it: a list of emails, admin-editable. Seeded with Sarah's staff
-- account (she is an admin, not a sales_manager, and the only sales_manager
-- accounts are test accounts that must not receive mail).
INSERT INTO public.platform_settings (key, value, description, updated_at)
VALUES ('sales_digest_recipients', '["sarah@scalelabme.com"]'::jsonb,
        'Emails that get the 15-minute sales activity email', now())
ON CONFLICT (key) DO NOTHING;

-- Atomically claims the next window (last sent -> now), returns its events and
-- the recipients. The advisory lock + marker update mean overlapping or repeated
-- calls never return the same activity twice.
CREATE OR REPLACE FUNCTION public.claim_sales_activity_digest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _until timestamptz := now();
  _since timestamptz;
  _events jsonb;
  _to jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('claim_sales_activity_digest'));
  SELECT (value #>> '{}')::timestamptz INTO _since FROM platform_settings WHERE key = 'sales_digest_last_sent_at';
  _since := coalesce(_since, _until - interval '15 minutes');
  INSERT INTO platform_settings (key, value, description, updated_at)
  VALUES ('sales_digest_last_sent_at', to_jsonb(_until), 'Sales activity email: activity up to this time has been sent', now())
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();

  SELECT coalesce(jsonb_agg(e ORDER BY e->>'at'), '[]'::jsonb) INTO _events FROM (
    SELECT jsonb_build_object(
      'at', l.created_at, 'kind', CASE WHEN l.source = 'inbound_signup' THEN 'signup_lead' ELSE 'lead_added' END,
      'actor_id', l.owner_id, 'actor', coalesce(p.full_name, 'Unassigned'),
      'lead_id', l.id, 'lead', l.venue_name, 'detail', l.stage) AS e
    FROM leads l LEFT JOIN profiles p ON p.user_id = l.owner_id
    WHERE l.created_at > _since AND l.created_at <= _until
    UNION ALL
    SELECT jsonb_build_object(
      'at', a.created_at, 'kind', a.type, 'actor_id', a.user_id, 'actor', coalesce(p.full_name, 'Automatic'),
      'lead_id', l.id, 'lead', l.venue_name,
      'detail', nullif(concat_ws(' · ', nullif(a.outcome, ''), nullif(a.note, '')), ''),
      'lost_reason', CASE WHEN a.type = 'stage_change' AND a.outcome LIKE '% -> lost' THEN l.lost_reason END)
    FROM lead_activities a JOIN leads l ON l.id = a.lead_id LEFT JOIN profiles p ON p.user_id = a.user_id
    WHERE a.created_at > _since AND a.created_at <= _until
  ) x;

  SELECT coalesce(jsonb_agg(jsonb_build_object('email', r.email, 'id', u.id)), '[]'::jsonb) INTO _to
  FROM jsonb_array_elements_text(coalesce((SELECT value FROM platform_settings WHERE key = 'sales_digest_recipients'), '[]'::jsonb)) AS r(email)
  LEFT JOIN auth.users u ON lower(u.email) = lower(r.email);

  RETURN jsonb_build_object('since', _since, 'until', _until, 'events', _events, 'recipients', _to);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.claim_sales_activity_digest() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sales_activity_digest() TO service_role;

-- Every 15 minutes. Same call pattern as the other cron-called functions.
SELECT cron.schedule('sales-activity-digest', '*/15 * * * *', $$
  SELECT net.http_post(
    url := 'https://dvauueqtqrveqcckfrjx.supabase.co/functions/v1/sales-activity-digest',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXV1ZXF0cXJ2ZXFjY2tmcmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTQ3NDMsImV4cCI6MjA4NzAzMDc0M30.Zpxj1of_wLzpqMDG72S00gpQPwi7kPpgrslcDfQXHV8"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
