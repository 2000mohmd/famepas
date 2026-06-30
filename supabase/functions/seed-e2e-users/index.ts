// One-shot test seeder. Only creates accounts under the @famepass.e2e domain.
// Safe to leave in repo because the email-domain gate makes it useless for non-test data.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_DOMAIN = "@famepass.e2e";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { email, password, role, venue_name } = await req.json();
    if (!email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      return new Response(JSON.stringify({ error: `email must end with ${ALLOWED_DOMAIN}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["admin", "venue", "influencer"].includes(role)) {
      return new Response(JSON.stringify({ error: "bad role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Delete any existing user with this email so seeding is idempotent.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) await admin.auth.admin.deleteUser(existing.id);

    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: {
        full_name: `E2E ${role}`,
        role,
        ...(role === "venue" && venue_name ? { venue_name, venue_category: "dining", venue_city: "Dubai" } : {}),
      },
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uid = created.user.id;
    await admin.from("profiles").update({ approval_status: "approved" }).eq("user_id", uid);
    if (role === "venue") {
      await admin.from("venues").update({ approval_status: "approved", is_active: true }).eq("owner_id", uid);
    }
    return new Response(JSON.stringify({ ok: true, user_id: uid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
