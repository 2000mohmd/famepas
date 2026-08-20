import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FAMEPASS_FROM, emailLayout, paragraph, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const key = Deno.env.get("RESEND_API_KEY");
  const out: Record<string, unknown> = {
    has_RESEND_API_KEY: !!key,
    has_LOVABLE_API_KEY: !!Deno.env.get("LOVABLE_API_KEY"),
    from: FAMEPASS_FROM,
  };

  if (key) {
    const dRes = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    out.domains_status = dRes.status;
    out.domains = await dRes.json().catch(() => null);
  }

  const body = await req.json().catch(() => ({} as any));
  if (body?.to) {
    const send = await sendEmail({
      to: body.to,
      subject: "FamePass email delivery test",
      html: emailLayout({
        heading: "Email delivery test",
        bodyHtml: paragraph("If you can read this, FamePass email delivery is working."),
      }),
    });
    out.test_send = send;
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
