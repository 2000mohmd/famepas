import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin action for accounts that signed up as a venue by mistake (they meant
// to join as a creator). A venue account has rows in venues/brands/
// organizations (and venue_locations, cleaned up by that table's
// ON DELETE CASCADE on venue_id) that an influencer never has, while
// `profiles` is shared across both account types and doesn't need to move.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: "Admins only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { venue_id } = await req.json();
    if (!venue_id) return new Response(JSON.stringify({ error: "venue_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: venue, error: venueErr } = await supabaseAdmin
      .from("venues")
      .select("id, owner_id, brand_id, name, contact_phone, contact_person_name, city, country, brands(organization_id)")
      .eq("id", venue_id)
      .maybeSingle();
    if (venueErr || !venue) return new Response(JSON.stringify({ error: "Venue not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ownerId = venue.owner_id;
    const organizationId = (venue as any).brands?.organization_id ?? null;

    await supabaseAdmin.from("venues").delete().eq("id", venue.id);
    if (venue.brand_id) await supabaseAdmin.from("brands").delete().eq("id", venue.brand_id);
    if (organizationId) await supabaseAdmin.from("organizations").delete().eq("id", organizationId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", ownerId).eq("role", "venue");
    await supabaseAdmin.from("user_roles").upsert({ user_id: ownerId, role: "influencer" }, { onConflict: "user_id,role" });

    const profileData = {
      user_id: ownerId,
      full_name: venue.contact_person_name || venue.name || null,
      phone: venue.contact_phone || null,
      city: venue.city || null,
      country: venue.country || null,
      niche: [],
      approval_status: "pending",
    };
    const { data: updated } = await supabaseAdmin.from("profiles").update(profileData).eq("user_id", ownerId).select();
    if (!updated || updated.length === 0) await supabaseAdmin.from("profiles").insert(profileData);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
