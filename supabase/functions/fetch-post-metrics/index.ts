// Subscribe to: instagram-scraper-api2 and tiktok-scraper7
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

function pickNumber(...vals: any[]): number {
  for (const v of vals) {
    const n = typeof v === "string" ? parseInt(v, 10) : v;
    if (typeof n === "number" && !isNaN(n)) return n;
  }
  return 0;
}

async function fetchOfficial(sb: any, influencerId: string | undefined, url: string, isIg: boolean) {
  if (!influencerId) return null;
  const { data: integ } = await sb.from("social_integrations").select("access_token")
    .eq("influencer_id", influencerId).eq("platform", isIg ? "instagram" : "tiktok")
    .eq("status", "connected").maybeSingle();
  const token = integ?.access_token;
  if (!token) return null;
  try {
    if (isIg) {
      const code = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[2];
      if (!code) return null;
      let next: string | null = `https://graph.instagram.com/v21.0/me/media?fields=id,permalink,like_count,comments_count,media_type,thumbnail_url,media_url&limit=50&access_token=${token}`;
      let media: any = null;
      for (let i = 0; i < 4 && next && !media; i++) {
        const r = await fetch(next); const j = await r.json();
        media = (j.data || []).find((m: any) => (m.permalink || "").includes(`/${code}`));
        next = j.paging?.next ?? null;
      }
      if (!media) return null;
      const ins: Record<string, number> = {};
      const ir = await fetch(`https://graph.instagram.com/v21.0/${media.id}/insights?metric=views,reach,saved,shares,total_interactions&access_token=${token}`);
      const ij = await ir.json();
      for (const m of ij.data || []) ins[m.name] = m.values?.[0]?.value ?? m.total_value?.value ?? 0;
      return {
        likes: media.like_count ?? 0, comments: media.comments_count ?? 0,
        views: ins.views ?? 0, shares: ins.shares ?? 0, saves: ins.saved ?? 0, reach: ins.reach ?? 0,
        thumbnail_url: media.thumbnail_url || media.media_url, external_post_id: media.id,
      };
    }
    const vid = url.match(/\/video\/(\d+)/)?.[1];
    if (!vid) return null;
    const r = await fetch("https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count,cover_image_url", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ filters: { video_ids: [vid] } }),
    });
    const v = (await r.json())?.data?.videos?.[0];
    if (!v) return null;
    return { likes: v.like_count ?? 0, comments: v.comment_count ?? 0, views: v.view_count ?? 0,
      shares: v.share_count ?? 0, thumbnail_url: v.cover_image_url, external_post_id: v.id };
  } catch (e) { console.error("official fetch failed", (e as Error).message); return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { deliverable_id, post_url } = await req.json().catch(() => ({}));
    if (!deliverable_id || !post_url) {
      return json({ error: "Missing deliverable_id or post_url", code: "BAD_REQUEST" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header", code: "UNAUTHORIZED" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      console.error("auth.getUser failed", userErr);
      return json({ error: "Invalid or expired session", code: "UNAUTHORIZED" }, 401);
    }

    const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [{ data: roles }, { data: deliverable }] = await Promise.all([
      userClient.from("user_roles").select("role").eq("user_id", user.id),
      sbAdmin.from("deliverables").select("influencer_id, booking_id").eq("id", deliverable_id).maybeSingle(),
    ]);

    const isAdmin = roles?.some((r: any) => r.role === "admin");
    const isOwner = deliverable?.influencer_id === user.id;

    let isVenue = false;
    if (!isAdmin && !isOwner && deliverable?.booking_id) {
      const { data: b } = await sbAdmin.from("bookings").select("venue_id").eq("id", deliverable.booking_id).maybeSingle();
      if (b?.venue_id) {
        const { data: v } = await sbAdmin.from("venues").select("owner_id").eq("id", b.venue_id).maybeSingle();
        isVenue = v?.owner_id === user.id;
      }
    }

    if (!isAdmin && !isOwner && !isVenue) {
      return json({ error: "Forbidden: not the deliverable owner or an admin", code: "FORBIDDEN" }, 403);
    }

    const isInstagram = post_url.includes("instagram.com");
    const isTikTok = post_url.includes("tiktok.com");
    if (!isInstagram && !isTikTok) {
      return json({ error: "URL must be from instagram.com or tiktok.com", code: "UNSUPPORTED_URL" }, 400);
    }

    // 1) Official APIs via the creator's linked account (preferred).
    const official = await fetchOfficial(sbAdmin, deliverable?.influencer_id, post_url, isInstagram);
    if (official) {
      const { error } = await sbAdmin.from("deliverables").update({
        post_url, likes: official.likes, comments: official.comments, views: official.views,
        shares: official.shares, saves: official.saves ?? 0,
        thumbnail_url: official.thumbnail_url ?? null, external_post_id: official.external_post_id ?? null,
        metrics_updated_at: new Date().toISOString(),
      }).eq("id", deliverable_id);
      if (error) console.error("DB update error:", error.message);
      return json({ success: true, source: "official", metrics: official });
    }
    // Only official APIs are used. Keep the link so the venue can open the post.
    await sbAdmin.from("deliverables").update({ post_url }).eq("id", deliverable_id);
    return json({ success: false, fallback: true, error: "Creator hasn't linked this account yet", code: "NOT_LINKED" }, 200);

  } catch (err: any) {
    console.error("Unexpected error:", err?.message);
    return json({ success: false, error: err?.message || "Unexpected error", code: "INTERNAL", fallback: true }, 200);
  }
});
