import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body */ }
  const to = typeof body.to === "string" ? body.to : (Deno.env.get("ADMIN_EMAIL") ?? null);
  const from = typeof body.from === "string" ? body.from : "FamePass <notify@notify.famepass.app>";

  const domainsRes = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  const domains = await domainsRes.json();

  let send: unknown = "skipped (no `to` provided)";
  if (to) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "FamePass email test",
        html: `<div style="font-family:Arial,sans-serif;padding:24px;">
          <h1 style="color:#b8860b;">Email is working</h1>
          <p>This is a test message from FamePass sent via Resend.</p>
        </div>`,
      }),
    });
    send = { status: res.status, body: await res.json() };
  }

  return new Response(JSON.stringify({ domainsStatus: domainsRes.status, domains, send }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
