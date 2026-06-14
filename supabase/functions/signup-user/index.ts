import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      email, password, role, full_name, phone,
      instagram_handle, tiktok_handle, tiktok_followers, social_links,
      // influencer profile extras
      bio, city, country, niche, followers_count,
      // venue (legacy + mobile)
      venue_name, venue_category, venue_city,
      // mobile hierarchy
      organization_name, organization_legal_name, organization_tax_id, organization_country,
      brand_name, brand_logo_url, brand_description,
      // mobile establishment fields
      venue_type, address_line1, address_line2, zip_code, timezone,
      contact_person_name, contact_phone, whatsapp_phone,
      latitude, longitude, signup_completed,
    } = body;

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

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: full_name || (venue_name ? `${venue_name} Owner` : email) },
    });
    if (createError) {
      const msg = createError.message || "";
      const isDuplicate = /already been registered|already registered|email_exists|duplicate/i.test(msg);
      return new Response(
        JSON.stringify({
          error: isDuplicate
            ? "This email is already registered. Please sign in instead."
            : msg,
          code: isDuplicate ? "email_exists" : "signup_error",
        }),
        { status: isDuplicate ? 409 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = newUser.user.id;

    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

    if (role === "influencer") {
      await new Promise(r => setTimeout(r, 500));
      const profileData: Record<string, unknown> = {
        user_id: userId, full_name: full_name || null, phone: phone || null,
        instagram_handle: instagram_handle || null, tiktok_handle: tiktok_handle || null,
        tiktok_followers: tiktok_followers || 0, social_links: social_links || {},
        bio: bio || null,
        city: city || null,
        country: country || null,
        niche: Array.isArray(niche) ? niche : (niche ? [niche] : null),
        followers_count: followers_count || 0,
        // Auto-approve influencers during development so they can immediately access the app
        approval_status: "approved",
      };
      const { data: updated } = await supabaseAdmin.from("profiles").update(profileData).eq("user_id", userId).select();
      if (!updated || updated.length === 0) await supabaseAdmin.from("profiles").insert(profileData);
    } else {
      await new Promise(r => setTimeout(r, 300));
      const profileData = {
        user_id: userId,
        full_name: full_name || (venue_name ? `${venue_name} Owner` : email),
        phone: phone || contact_phone || null,
        approval_status: "approved",
      };
      const { data: updated } = await supabaseAdmin.from("profiles").update(profileData).eq("user_id", userId).select();
      if (!updated || updated.length === 0) await supabaseAdmin.from("profiles").insert(profileData);
    }

    let venue = null;
    let organization = null;
    let brand = null;

    if (role === "venue" && venue_name) {
      // 1. Organization
      const { data: orgRow } = await supabaseAdmin.from("organizations").insert({
        owner_id: userId,
        name: organization_name || venue_name,
        legal_name: organization_legal_name || null,
        tax_id: organization_tax_id || null,
        country: organization_country || null,
      }).select().single();
      organization = orgRow;

      // 2. Brand
      const { data: brandRow } = await supabaseAdmin.from("brands").insert({
        organization_id: orgRow!.id,
        name: brand_name || venue_name,
        logo_url: brand_logo_url || null,
        description: brand_description || null,
      }).select().single();
      brand = brandRow;

      // 3. Venue (establishment)
      const { data: venueData } = await supabaseAdmin.from("venues").insert({
        owner_id: userId,
        brand_id: brandRow!.id,
        name: venue_name,
        category: venue_category || "dining",
        city: venue_city || null,
        country: organization_country || null,
        email,
        venue_type: venue_type || "physical",
        address: address_line1 || null,
        address_line1: address_line1 || null,
        address_line2: address_line2 || null,
        zip_code: zip_code || null,
        timezone: timezone || null,
        contact_person_name: contact_person_name || null,
        contact_phone: contact_phone || null,
        whatsapp_phone: whatsapp_phone || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        signup_completed: signup_completed ?? true,
        approval_status: "approved",
        is_active: true,
      }).select().single();
      venue = venueData;

      if (venue_city) {
        await supabaseAdmin
          .from("service_locations")
          .upsert({ city: venue_city, country: organization_country || null, is_active: true }, { onConflict: "city" });
      }
    }

    return new Response(JSON.stringify({ user: newUser.user, venue, organization, brand }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
