import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const enc = new TextEncoder();

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(redemptionId: string, exp: number): Promise<string> {
  const body = `${redemptionId}.${exp}`;
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

async function verify(token: string): Promise<{ redemptionId: string; exp: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [redemptionId, expStr, sig] = parts;
  const expected = await hmac(`${redemptionId}.${expStr}`);
  if (expected !== sig) return null;
  const exp = parseInt(expStr);
  if (!exp || Date.now() > exp) return null;
  return { redemptionId, exp };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supaUrl, SECRET);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  const userClient = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { action, redemption_id, token } = await req.json();

  if (action === "issue") {
    const { data: red } = await admin.from("offer_redemptions").select("*").eq("id", redemption_id).maybeSingle();
    if (!red || red.influencer_id !== user.id) return new Response(JSON.stringify({ error: "Not allowed" }), { status: 403, headers: corsHeaders });
    if (red.qr_used_at) return new Response(JSON.stringify({ error: "Already used" }), { status: 400, headers: corsHeaders });
    const exp = Date.now() + 15 * 60 * 1000; // 15 min
    const signed = await sign(redemption_id, exp);
    await admin.from("offer_redemptions").update({ qr_token: signed, qr_expires_at: new Date(exp).toISOString() }).eq("id", redemption_id);
    return new Response(JSON.stringify({ token: signed, expires_at: exp }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "redeem") {
    const verified = await verify(token);
    if (!verified) return new Response(JSON.stringify({ error: "Invalid or expired QR" }), { status: 400, headers: corsHeaders });
    const { data: red } = await admin.from("offer_redemptions").select("*, offers(venue_id, venues(owner_id))").eq("id", verified.redemptionId).maybeSingle();
    if (!red) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
    const ownerId = (red as any).offers?.venues?.owner_id;
    const { data: isAdmin } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (user.id !== ownerId && !isAdmin) return new Response(JSON.stringify({ error: "Only the venue owner can scan" }), { status: 403, headers: corsHeaders });
    if (red.qr_used_at) return new Response(JSON.stringify({ error: "QR already used" }), { status: 400, headers: corsHeaders });
    if (red.qr_token !== token) return new Response(JSON.stringify({ error: "Token revoked" }), { status: 400, headers: corsHeaders });
    await admin.from("offer_redemptions").update({ qr_used_at: new Date().toISOString(), redeemed_at: new Date().toISOString(), status: "redeemed" }).eq("id", verified.redemptionId);
    return new Response(JSON.stringify({ ok: true, redemption_id: verified.redemptionId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
});
