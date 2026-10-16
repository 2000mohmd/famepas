// Every 15 minutes (pg_cron): email the people in platform_settings
// 'sales_digest_recipients' one bundled email of new sales-rep activity.
// claim_sales_activity_digest() advances the window atomically, so repeated or
// overlapping calls never send the same activity twice. verify_jwt = false
// like the other cron-called functions; calling it early only sends sooner.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";
import { buildEmail, type DigestEvent } from "./digest.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.rpc("claim_sales_activity_digest");
  if (error) {
    console.error("sales digest: claim failed", error.message);
    return json({ error: "claim failed" }, 500);
  }
  const events = (data?.events ?? []) as DigestEvent[];
  const recipients = (data?.recipients ?? []) as { id: string | null; email: string }[];
  let sent = 0, failed = 0;
  for (const r of recipients) {
    const mail = buildEmail(events, r.id, Deno.env.get("PUBLIC_SITE_URL") ?? "https://famepass.app");
    if (!mail) continue;
    const res = await sendEmail({ to: r.email, subject: mail.subject, html: mail.html });
    if (res.ok) sent++; else failed++;
  }
  console.log("sales digest", { events: events.length, recipients: recipients.length, sent, failed });
  return json({ events: events.length, sent, failed });
});
