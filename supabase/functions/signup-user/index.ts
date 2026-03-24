import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { email, password, role, full_name, phone, instagram_handle, tiktok_handle, tiktok_followers, social_links, venue_name, venue_category, venue_city } = await req.json();

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: "Email, password and role are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["venue", "influencer"].includes(role)) {
      return new Response(JSON.stringify({ error: "Role must be venue or influencer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || (venue_name ? `${venue_name} Owner` : email) },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Assign role
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });

    // For influencer: upsert profile with social info
    if (role === "influencer") {
      // Wait for any trigger, then upsert
      await new Promise(resolve => setTimeout(resolve, 500));
      const profileData = {
        user_id: userId,
        full_name: full_name || null,
        phone: phone || null,
        instagram_handle: instagram_handle || null,
        tiktok_handle: tiktok_handle || null,
        tiktok_followers: tiktok_followers || 0,
        social_links: social_links || {},
      };
      // Try update first, if no rows affected, insert
      const { data: updated } = await supabaseAdmin.from("profiles").update(profileData).eq("user_id", userId).select();
      if (!updated || updated.length === 0) {
        await supabaseAdmin.from("profiles").insert(profileData);
      }
    } else {
      // For venue: ensure profile exists
      await new Promise(resolve => setTimeout(resolve, 300));
      const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("profiles").insert({ user_id: userId, full_name: venue_name ? `${venue_name} Owner` : email });
      }
    }

    // For venue: create venue record
    let venue = null;
    if (role === "venue" && venue_name) {
      const { data: venueData } = await supabaseAdmin.from("venues").insert({
        name: venue_name,
        category: venue_category || "dining",
        city: venue_city || null,
        email,
        owner_id: userId,
      }).select().single();
      venue = venueData;
    }

    return new Response(JSON.stringify({ user: newUser.user, venue }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
