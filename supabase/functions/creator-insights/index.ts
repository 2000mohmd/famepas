// Returns a creator's connected Instagram / TikTok account stats.
// Viewable by: the creator themself, an admin, or a venue owner who has worked
// with that creator (booking or invitation).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const num = (v: unknown) => {
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return typeof n === "number" && !isNaN(n) ? n : null;
};

async function safeJson(res: Response) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}

async function instagramStats(token: string) {
  const out: Record<string, unknown> = {};
  const meRes = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type,followers_count,follows_count,media_count&access_token=${encodeURIComponent(token)}`,
  );
  const me = await safeJson(meRes);
  if (!meRes.ok) {
    return { error: me?.error?.message || "Instagram rejected the stored access token" };
  }
  out.username = me?.username ?? null;
  out.account_type = me?.account_type ?? null;
  out.followers = num(me?.followers_count);
  out.following = num(me?.follows_count);
  out.media_count = num(me?.media_count);

  // Account-level insights (last 28 days). Only available for business/creator
  // accounts with the insights permission — treat failures as "not available".
  try {
    const igId = me?.user_id ?? "me";
    const insRes = await fetch(
      `https://graph.instagram.com/v21.0/${igId}/insights?metric=reach,accounts_engaged,total_interactions&period=days_28&metric_type=total_value&access_token=${encodeURIComponent(token)}`,
    );
    const ins = await safeJson(insRes);
    if (insRes.ok && Array.isArray(ins?.data)) {
      for (const m of ins.data) {
        out[m?.name] = num(m?.total_value?.value);
      }
    }
  } catch (_) { /* insights are best-effort */ }

  return out;
}

async function tiktokStats(token: string) {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url,follower_count,following_count,likes_count,video_count",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = await safeJson(res);
  if (!res.ok) return { error: body?.error?.message || "TikTok rejected the stored access token" };
  const u = body?.data?.user ?? {};
  return {
    username: u.username ?? u.display_name ?? null,
    followers: num(u.follower_count),
    following: num(u.following_count),
    likes: num(u.likes_count),
    media_count: num(u.video_count),
    avatar_url: u.avatar_url ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { influencer_id } = await req.json().catch(() => ({}));
    if (!influencer_id) return json({ error: "Missing influencer_id", code: "BAD_REQUEST" }, 400);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header", code: "UNAUTHORIZED" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid or expired session", code: "UNAUTHORIZED" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let allowed = user.id === influencer_id;
    if (!allowed) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
      allowed = !!roles?.some((r: any) => r.role === "admin");
    }
    if (!allowed) {
      const { data: venues } = await admin.from("venues").select("id").eq("owner_id", user.id);
      const venueIds = (venues ?? []).map((v: any) => v.id);
      if (venueIds.length) {
        const [{ count: bCount }, { count: iCount }] = await Promise.all([
          admin.from("bookings").select("id", { count: "exact", head: true })
            .eq("influencer_id", influencer_id).in("venue_id", venueIds),
          admin.from("invitations").select("id", { count: "exact", head: true })
            .eq("influencer_id", influencer_id).in("venue_id", venueIds),
        ]);
        allowed = (bCount ?? 0) > 0 || (iCount ?? 0) > 0;
      }
    }
    if (!allowed) return json({ error: "Forbidden", code: "FORBIDDEN" }, 403);

    const [{ data: integrations }, { data: profile }] = await Promise.all([
      admin.from("social_integrations")
        .select("platform,handle,display_name,access_token,status,connected_at,token_expires_at")
        .eq("influencer_id", influencer_id),
      admin.from("profiles")
        .select("full_name,avatar_url,instagram_handle,tiktok_handle,followers_count,tiktok_followers,engagement_rate,influencer_score")
        .eq("user_id", influencer_id).maybeSingle(),
    ]);

    const result: Record<string, any> = {
      profile: profile ?? null,
      instagram: { connected: false },
      tiktok: { connected: false },
    };

    for (const row of integrations ?? []) {
      const platform = row.platform === "instagram" ? "instagram" : row.platform === "tiktok" ? "tiktok" : null;
      if (!platform || !row.access_token) continue;
      const base = {
        connected: row.status === "connected",
        handle: row.handle ?? row.display_name ?? null,
        connected_at: row.connected_at ?? null,
      };
      try {
        const stats = platform === "instagram"
          ? await instagramStats(row.access_token)
          : await tiktokStats(row.access_token);
        result[platform] = { ...base, ...stats };
      } catch (e) {
        result[platform] = { ...base, error: String(e) };
      }
    }

    // Keep the cached follower counts on the profile fresh for listings.
    const update: Record<string, unknown> = {};
    if (typeof result.instagram?.followers === "number") update.followers_count = result.instagram.followers;
    if (typeof result.tiktok?.followers === "number") update.tiktok_followers = result.tiktok.followers;
    if (Object.keys(update).length) {
      await admin.from("profiles").update(update).eq("user_id", influencer_id);
    }

    return json(result);
  } catch (e) {
    console.error("creator-insights error", e);
    return json({ error: String(e), code: "INTERNAL" }, 500);
  }
});
