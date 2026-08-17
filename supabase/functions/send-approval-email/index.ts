import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // --- auth: caller must be an authenticated admin ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    // --- input ---
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind;
    const userId: string | undefined = body?.user_id;
    const venueId: string | undefined = body?.venue_id;

    if (kind !== "venue" && kind !== "influencer") {
      return json({ error: "kind must be 'venue' or 'influencer'" }, 400);
    }

    let email: string | null = null;
    let name = "there";

    if (kind === "venue") {
      if (!venueId) return json({ error: "venue_id is required" }, 400);
      const { data: venue } = await admin
        .from("venues")
        .select("name, email, owner_id")
        .eq("id", venueId)
        .maybeSingle();
      if (!venue) return json({ error: "Venue not found" }, 404);
      name = venue.name || "there";
      email = venue.email ?? null;
      if (!email && venue.owner_id) {
        const { data: owner } = await admin.auth.admin.getUserById(venue.owner_id);
        email = owner?.user?.email ?? null;
      }
    } else {
      if (!userId) return json({ error: "user_id is required" }, 400);
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();
      name = profile?.full_name || "there";
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      email = authUser?.user?.email ?? null;
    }

    if (!email) return json({ error: "No email address on record" }, 400);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return json({ success: false, error: "Email service is not configured" }, 200);
    }

    const intro =
      kind === "venue"
        ? "Your venue has been approved by the FamePass team. You can now sign in, publish campaigns and start matching with creators."
        : "Your creator account has been approved by the FamePass team. You can now sign in, browse venue offers and start applying.";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#111;">
        <h1 style="color:#b8860b;margin:0 0 12px;">You're approved 🎉</h1>
        <p style="font-size:16px;line-height:1.5;">Hi ${name},</p>
        <p style="font-size:16px;line-height:1.5;">${intro}</p>
        <p style="margin-top:24px;">
          <a href="https://famepass.app/login" style="background:#b8860b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Sign in to FamePass</a>
        </p>
        <p style="font-size:13px;color:#666;margin-top:24px;">If the button doesn't work, open https://famepass.app/login</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "FamePass <notify@famepass.app>",
        to: [email],
        subject: "Your FamePass account is approved",
        html,
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`Resend request failed [${res.status}]: ${details}`);
      return json({ success: false, error: "Email provider error", status: res.status, details }, 200);
    }

    return json({ success: true, sent_to: email });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-approval-email failed:", message);
    return json({ error: message }, 500);
  }
});
