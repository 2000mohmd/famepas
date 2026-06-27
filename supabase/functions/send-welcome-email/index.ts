import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require valid JWT to prevent abuse for phishing/spam
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerEmail = (claimsData.claims as any).email?.toLowerCase();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Email service not configured");
    }

    const { email, name, role } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow sending welcome email to caller's own address (or admin)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const callerId = (claimsData.claims as any).sub as string;
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!adminRole && callerEmail !== String(email).toLowerCase()) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Respect influencer notification preferences (treat welcome as promotional)
    if (role === "influencer") {
      const callerId = (claimsData.claims as any).sub as string;
      const { data: settings } = await supabaseAdmin
        .from("influencer_settings")
        .select("notification_promotions")
        .eq("influencer_id", callerId)
        .maybeSingle();
      if (settings && settings.notification_promotions === false) {
        return new Response(JSON.stringify({ ok: true, skipped: "preferences" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const greeting = name ? `Hi ${name},` : "Hi there,";
    const roleLabel = role === "venue" ? "Venue" : "Influencer";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#111;">
        <h1 style="color:#b8860b;margin:0 0 12px;">Welcome to FamePass</h1>
        <p>${greeting}</p>
        <p>Your ${roleLabel} account has been created successfully. You can now sign in and start using the platform.</p>
        <p style="margin:24px 0;">
          <a href="https://famepas.lovable.app/login" style="background:#b8860b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Go to FamePass</a>
        </p>
        <p style="color:#666;font-size:12px;">If you didn't create this account, please ignore this email.</p>
      </div>`;

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "FamePass <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to FamePass",
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Resend [${res.status}]: ${JSON.stringify(data)}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-welcome-email error", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
