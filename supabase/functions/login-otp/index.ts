import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const { action, email, code } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up user
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = list?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check 2FA enabled
    const { data: profile } = await supabase.from("profiles").select("two_factor_enabled, full_name").eq("user_id", user.id).maybeSingle();
    const twoFA = !!profile?.two_factor_enabled;

    if (action === "send") {
      if (!twoFA) {
        return new Response(JSON.stringify({ ok: true, twoFactor: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email service not configured");

      const newCode = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await sha256(newCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase.from("login_otp_codes").insert({
        user_id: user.id, email, code_hash: codeHash, expires_at: expiresAt,
      });

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fff;color:#111;">
          <h1 style="color:#b8860b;margin:0 0 12px;">Your FamePass login code</h1>
          <p>Hi ${profile?.full_name || "there"},</p>
          <p>Use the code below to complete your sign-in. It expires in 10 minutes.</p>
          <div style="font-size:32px;letter-spacing:8px;font-weight:bold;background:#f4f4f4;padding:16px;text-align:center;border-radius:8px;margin:20px 0;">${newCode}</div>
          <p style="color:#666;font-size:12px;">If you didn't request this, you can safely ignore the email.</p>
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
          subject: "Your FamePass login verification code",
          html,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Resend [${res.status}]: ${t}`);
      }

      return new Response(JSON.stringify({ ok: true, twoFactor: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!code) {
        return new Response(JSON.stringify({ error: "code required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const codeHash = await sha256(String(code));
      const { data: rows } = await supabase
        .from("login_otp_codes")
        .select("*")
        .eq("user_id", user.id)
        .is("consumed_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      const row = rows?.[0];
      if (!row || row.code_hash !== codeHash) {
        return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("login_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("login-otp error", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
