import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (!authHeader) return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: "Only admins can create users" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { email, password, role, venue_name, venue_category, venue_city, full_name, permissions } = await req.json();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || (venue_name ? `${venue_name} Owner` : email) },
    });
    if (createError) return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userId = newUser.user.id;
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });

    let venue = null;
    if (role === "venue" && venue_name) {
      const { data: venueData } = await supabaseAdmin.from("venues").insert({
        name: venue_name, category: venue_category || "dining", city: venue_city || null, email, owner_id: userId,
      }).select().single();
      venue = venueData;
    }

    if (role === "admin" && Array.isArray(permissions) && permissions.length > 0) {
      const rows = permissions.map((p: string) => ({ user_id: userId, permission: p, created_by: caller.id }));
      await supabaseAdmin.from("admin_user_permissions").insert(rows);
    }

    return new Response(JSON.stringify({ user: newUser.user, venue }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
