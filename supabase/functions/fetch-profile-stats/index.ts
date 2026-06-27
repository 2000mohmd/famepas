// Verify influencer handles and pull real follower counts via RapidAPI.
// Required secret: RAPIDAPI_KEY
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clean = (h: string) => (h || "").trim().replace(/^@+/, "");

async function fetchInstagramProfile(handle: string) {
  const res = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(handle)}`,
    {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com",
      },
    },
  );
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const d = json?.data;
  if (!d) return null;
  return {
    exists: true,
    followers: d.follower_count ?? d.followers ?? 0,
    full_name: d.full_name ?? null,
    is_verified: !!d.is_verified,
  };
}

async function fetchTikTokProfile(handle: string) {
  const res = await fetch(
    `https://tiktok-scraper7.p.rapidapi.com/user/info?unique_id=${encodeURIComponent(handle)}`,
    {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "tiktok-scraper7.p.rapidapi.com",
      },
    },
  );
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const s = json?.data?.stats;
  if (!s) return null;
  return {
    exists: true,
    followers: s.followerCount ?? 0,
    full_name: json?.data?.user?.nickname ?? null,
    is_verified: !!json?.data?.user?.verified,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ig = body.instagram_handle ? clean(body.instagram_handle) : null;
    const tt = body.tiktok_handle ? clean(body.tiktok_handle) : null;
    const selfReported = Number(body.self_reported_followers) || 0;

    const result: Record<string, any> = {};
    let realTotal = 0;

    if (ig && RAPIDAPI_KEY) {
      try {
        const ig_data = await fetchInstagramProfile(ig);
        if (ig_data) { result.instagram = ig_data; realTotal += ig_data.followers; }
        else result.instagram = { exists: false, followers: 0 };
      } catch (e) {
        result.instagram = { error: String(e) };
      }
    }
    if (tt && RAPIDAPI_KEY) {
      try {
        const tt_data = await fetchTikTokProfile(tt);
        if (tt_data) { result.tiktok = tt_data; realTotal += tt_data.followers; }
        else result.tiktok = { exists: false, followers: 0 };
      } catch (e) {
        result.tiktok = { error: String(e) };
      }
    }

    // Update profile with verified follower counts (use the larger of the two when only one platform)
    const updates: Record<string, any> = {};
    if (result.instagram?.followers) {
      updates.followers_count = result.instagram.followers;
    } else if (result.tiktok?.followers) {
      updates.followers_count = result.tiktok.followers;
      updates.tiktok_followers = result.tiktok.followers;
    }
    if (result.tiktok?.followers) updates.tiktok_followers = result.tiktok.followers;

    // Flag if self-reported diverges from real by > 2x
    const flagged =
      realTotal > 0 &&
      selfReported > 0 &&
      (selfReported > realTotal * 2 || selfReported * 2 < realTotal);
    if (flagged) updates.followers_verification_flag = true;

    if (Object.keys(updates).length) {
      await supabase.from("profiles").update(updates).eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({ ok: true, verified: result, flagged, applied: updates }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
