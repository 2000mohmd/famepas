// Adnan, recap C9: the 7-day "is the post still live" check, automated via
// the official Instagram Graph API using the creator's own linked account
// (the same official-APIs-only lookup fetch-post-metrics already uses).
// TikTok posts are skipped here and left for the existing manual
// AdminRedemptions "Still live / Deleted" review until the TikTok app is
// approved -- same gap as the rest of the TikTok integration.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { listPosts, PHYLLO_SCOPE, postKey } from "../_shared/phyllo.ts";

/** Via Phyllo: is the post among the creator's last 180 days of posts? null = can't tell (skip, never strike). */
async function phylloPostStillLive(accountId: string, postUrl: string): Promise<boolean | null> {
  const key = postKey(postUrl);
  if (!key) return null;
  const posts = await listPosts(accountId, Date.now() - 180 * 86400_000);
  if (!posts.ok) return null;
  return posts.body.some((p) => postKey(p.url) === key);
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function instagramPostStillLive(accessToken: string, postUrl: string): Promise<boolean | null> {
  const code = postUrl.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[2];
  if (!code) return null; // not a recognizable IG post URL -- leave for manual review
  let next: string | null = `https://graph.instagram.com/v21.0/me/media?fields=id,permalink&limit=50&access_token=${accessToken}`;
  for (let i = 0; i < 6 && next; i++) {
    const r: Response = await fetch(next);
    if (!r.ok) return null; // token expired/revoked etc -- leave for manual review, don't strike on an API error
    const j: any = await r.json();
    if ((j.data || []).some((m: any) => (m.permalink || "").includes(`/${code}`))) return true;
    next = j.paging?.next ?? null;
  }
  return false; // walked the creator's whole media list, post is gone
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: due, error } = await sb
    .from("offer_redemptions")
    .select("id, post_url, influencer_id")
    .eq("delivery_stage", "verified")
    .not("post_check_due_at", "is", null)
    .lte("post_check_due_at", new Date().toISOString());
  if (error) return json({ error: error.message }, 500);

  let checked = 0, confirmedLive = 0, struck = 0, skipped = 0;
  for (const r of due ?? []) {
    const isIg = !!r.post_url?.includes("instagram.com");
    const isTt = !!r.post_url?.includes("tiktok.com");
    if (!isIg && !isTt) { skipped++; continue; }
    const { data: integ } = await sb.from("social_integrations").select("access_token, open_id, scope")
      .eq("influencer_id", r.influencer_id).eq("platform", isIg ? "instagram" : "tiktok").eq("status", "connected").maybeSingle();
    const viaPhyllo = integ?.scope === PHYLLO_SCOPE && !!integ.open_id;
    // TikTok is only checkable through Phyllo; native TikTok stays manual review.
    if (!viaPhyllo && (!isIg || !integ?.access_token)) { skipped++; continue; }

    const stillLive = viaPhyllo
      ? await phylloPostStillLive(integ!.open_id!, r.post_url)
      : await instagramPostStillLive(integ!.access_token!, r.post_url);
    if (stillLive === null) { skipped++; continue; }
    checked++;
    await sb.rpc("auto_check_post_still_live", { _redemption_id: r.id, _still_live: stillLive });
    if (stillLive) confirmedLive++; else struck++;
  }

  return json({ due: (due ?? []).length, checked, confirmedLive, struck, skipped });
});
