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

async function fetchInstagramMetrics(postUrl: string) {
  const shortcode = postUrl.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/)?.[2];
  if (!shortcode) throw new Error("Invalid Instagram URL");

  const res = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${shortcode}`,
    {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com",
      },
    },
  );
  const json = await res.json();
  const data = json?.data;
  return {
    likes: data?.like_count ?? 0,
    comments: data?.comment_count ?? 0,
    views: data?.video_view_count ?? data?.play_count ?? 0,
    shares: 0,
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
  const json = await res.json();
  const stats = json?.data?.stats;
  return {
    likes: stats?.diggCount ?? 0,
    comments: stats?.commentCount ?? 0,
    views: stats?.playCount ?? 0,
    shares: stats?.shareCount ?? 0,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { deliverable_id, post_url } = await req.json();
    if (!deliverable_id || !post_url) {
      return new Response(JSON.stringify({ error: "Missing deliverable_id or post_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isInstagram = post_url.includes("instagram.com");
    const isTikTok = post_url.includes("tiktok.com");

    let metrics = { likes: 0, comments: 0, views: 0, shares: 0 };

    if (isInstagram) metrics = await fetchInstagramMetrics(post_url);
    else if (isTikTok) metrics = await fetchTikTokMetrics(post_url);
    else throw new Error("URL must be from instagram.com or tiktok.com");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from("deliverables")
      .update({
        post_url,
        likes: metrics.likes,
        comments: metrics.comments,
        views: metrics.views,
        shares: metrics.shares,
      })
      .eq("id", deliverable_id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, metrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
