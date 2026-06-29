// Required secret: RAPIDAPI_KEY — get it from https://rapidapi.com
// Subscribe to: instagram-scraper-api2 and tiktok-scraper7
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
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

async function safeJson(res: Response) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}

async function fetchInstagramMetrics(postUrl: string) {
  const shortcode = postUrl.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[2];
  if (!shortcode) throw new Error("Invalid Instagram URL — expected /p/, /reel/, /reels/ or /tv/ link");

  const res = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(shortcode)}`,
    {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com",
      },
    },
  );

  const body = await safeJson(res);
  if (!res.ok) {
    const err: any = new Error(`Instagram API ${res.status}: ${body?.message || body?._raw || "request failed"}`);
    err.status = res.status;
    err.fallback = res.status >= 500 || res.status === 429;
    throw err;
  }

  const d = body?.data || body;
  return {
    likes: pickNumber(d?.like_count, d?.likes_count, d?.likes),
    comments: pickNumber(d?.comment_count, d?.comments_count, d?.comments),
    views: pickNumber(d?.video_view_count, d?.play_count, d?.view_count, d?.views),
    shares: pickNumber(d?.share_count, d?.shares),
  };
}

async function fetchTikTokMetrics(postUrl: string) {
  const res = await fetch(
    `https://tiktok-scraper7.p.rapidapi.com/video/info?url=${encodeURIComponent(postUrl)}`,
    {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "tiktok-scraper7.p.rapidapi.com",
      },
    },
  );
  const body = await safeJson(res);
  if (!res.ok) {
    const err: any = new Error(`TikTok API ${res.status}: ${body?.message || body?._raw || "request failed"}`);
    err.status = res.status;
    err.fallback = res.status >= 500 || res.status === 429;
    throw err;
  }
  const s = body?.data?.stats || body?.data || {};
  return {
    likes: pickNumber(s?.diggCount, s?.likeCount),
    comments: pickNumber(s?.commentCount),
    views: pickNumber(s?.playCount, s?.viewCount),
    shares: pickNumber(s?.shareCount),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!RAPIDAPI_KEY) {
      return json({ error: "RAPIDAPI_KEY is not configured", fallback: true, code: "MISSING_API_KEY" }, 200);
    }

    const { deliverable_id, post_url } = await req.json().catch(() => ({}));
    if (!deliverable_id || !post_url) {
      return json({ error: "Missing deliverable_id or post_url", code: "BAD_REQUEST" }, 400);
    }

    const isInstagram = post_url.includes("instagram.com");
    const isTikTok = post_url.includes("tiktok.com");
    if (!isInstagram && !isTikTok) {
      return json({ error: "URL must be from instagram.com or tiktok.com", code: "UNSUPPORTED_URL" }, 400);
    }

    let metrics = { likes: 0, comments: 0, views: 0, shares: 0 };
    try {
      metrics = isInstagram ? await fetchInstagramMetrics(post_url) : await fetchTikTokMetrics(post_url);
    } catch (apiErr: any) {
      console.error("Provider error:", apiErr?.message);
      const fallback = !!apiErr?.fallback || true;
      // Still save the post_url so the venue sees the link, just no metrics yet.
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await sb.from("deliverables").update({ post_url }).eq("id", deliverable_id);
      } catch (_) { /* ignore */ }
      return json({
        success: false,
        fallback,
        error: apiErr?.message || "Provider request failed",
        code: apiErr?.status === 401 ? "PROVIDER_UNAUTHORIZED"
            : apiErr?.status === 429 ? "PROVIDER_RATE_LIMITED"
            : "PROVIDER_UNAVAILABLE",
      }, 200);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await sb
      .from("deliverables")
      .update({
        post_url,
        likes: metrics.likes,
        comments: metrics.comments,
        views: metrics.views,
        shares: metrics.shares,
      })
      .eq("id", deliverable_id);

    if (error) {
      console.error("DB update error:", error.message);
      return json({ success: false, error: error.message, code: "DB_UPDATE_FAILED", fallback: true }, 200);
    }

    return json({ success: true, metrics });
  } catch (err: any) {
    console.error("Unexpected error:", err?.message);
    return json({ success: false, error: err?.message || "Unexpected error", code: "INTERNAL", fallback: true }, 200);
  }
});
