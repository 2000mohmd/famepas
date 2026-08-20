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

    // Pass role + venue fields in user_metadata so the handle_new_user trigger
    // assigns the correct role and creates the profile/venue rows. Admins are
    // auto-approved by the trigger; we activate venues below.
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || (venue_name ? `${venue_name} Owner` : email),
        role,
        // NOTE: venue_name is intentionally omitted so the handle_new_user
        // trigger does not insert a pending venue row; we insert it below
        // ourselves with approved status (no race, no duplicates).
      },
    });
    if (createError) {
      const msg = createError.message || "";
      const isDuplicate = /already been registered|already registered|email_exists|duplicate/i.test(msg);
      // Return 200 so supabase-js surfaces the payload instead of a generic
      // "Edge function returned 400" message in the client.
      return new Response(
        JSON.stringify({
          error: isDuplicate
            ? "This email is already registered. Use a different email, or find the existing account in the users list."
            : msg,
          code: isDuplicate ? "email_exists" : "create_user_error",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = newUser.user.id;

    // Admin-created accounts skip the approval queue.
    await supabaseAdmin.from("profiles").update({ approval_status: "approved" }).eq("user_id", userId);

    let venue = null;
    if (role === "venue" && venue_name) {
      const { data: venueData, error: venueError } = await supabaseAdmin
        .from("venues")
        .insert({
          owner_id: userId,
          name: venue_name,
          category: venue_category || "dining",
          city: venue_city || null,
          email,
          approval_status: "approved",
          is_active: true,
        })
        .select()
        .maybeSingle();
      if (venueError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(JSON.stringify({ error: `Failed to create venue: ${venueError.message}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
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
