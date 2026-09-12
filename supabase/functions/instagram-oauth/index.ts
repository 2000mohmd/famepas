// Instagram Business Login for creators (Instagram API with Instagram Login —
// the api.instagram.com / graph.instagram.com flow, not the older Facebook
// Login for Business one). Mirrors the shape of ../tiktok-oauth but:
//   - the OAuth redirect_uri is a page in the app (/instagram/callback),
//     which calls this function to do the actual exchange, instead of this
//     function being the redirect_uri itself.
//   - identity comes from the caller's Supabase session (Authorization
//     header), not a client-supplied id, so a crafted `state`/body can't
//     attach a token to someone else's row.
//
// Required secrets (Supabase project settings -> Edge Functions -> Secrets):
//   INSTAGRAM_CLIENT_ID       - Instagram App ID (Meta App Dashboard -> Instagram -> API setup with Instagram business login)
//   INSTAGRAM_CLIENT_SECRET   - Instagram App Secret (same page)
//   PUBLIC_SITE_URL           - e.g. https://famepass.app (must match the
//                               redirect URI registered on the Instagram app)
//
// Actions (both POST, both require Authorization: Bearer <user JWT>, which
// supabase.functions.invoke() attaches automatically for a signed-in user):
//   { action: "initiate" }                  -> { url }
//   { action: "exchange", code, state }     -> { success, handle }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("INSTAGRAM_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("INSTAGRAM_CLIENT_SECRET") ?? "";
const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://famepass.app";
const REDIRECT_URI = `${SITE_URL}/instagram/callback`;

// https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
].join(",");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function safeJson(res: Response) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header", code: "UNAUTHORIZED" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid or expired session", code: "UNAUTHORIZED" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return json({
        error: "Instagram app keys not configured yet. Add INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET in backend secrets.",
        code: "MISSING_KEYS",
      }, 503);
    }

    if (body.action === "initiate") {
      const state = `${user.id}:${crypto.randomUUID()}`;
      const authUrl = new URL("https://www.instagram.com/oauth/authorize");
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("state", state);
      return json({ url: authUrl.toString() });
    }

    if (body.action === "exchange") {
      const state: string = body.state ?? "";
      const stateOwner = state.split(":")[0];
      if (!stateOwner || stateOwner !== user.id) {
        return json({ error: "State does not match the signed-in user", code: "FORBIDDEN" }, 403);
      }

      // Instagram sometimes appends "#_" to the redirected code — strip it.
      const code: string = String(body.code ?? "").replace(/#_$/, "");
      if (!code) return json({ error: "Missing code", code: "BAD_REQUEST" }, 400);

      // Step 1: short-lived token (~1 hour)
      const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
          code,
        }),
      });
      const shortTok = await safeJson(shortRes);
      if (!shortRes.ok || !shortTok.access_token) {
        console.error("instagram short-lived token error", shortTok);
        return json({
          error: shortTok?.error_message || "Could not exchange the authorization code",
          code: "PROVIDER_ERROR",
        }, 200);
      }

      // Step 2: exchange for a long-lived token (~60 days)
      const longUrl = new URL("https://graph.instagram.com/access_token");
      longUrl.searchParams.set("grant_type", "ig_exchange_token");
      longUrl.searchParams.set("client_secret", CLIENT_SECRET);
      longUrl.searchParams.set("access_token", shortTok.access_token);
      const longRes = await fetch(longUrl.toString());
      const longTok = await safeJson(longRes);
      if (!longRes.ok || !longTok.access_token) {
        console.error("instagram long-lived token error", longTok);
        return json({
          error: longTok?.error?.message || "Could not get a long-lived token",
          code: "PROVIDER_ERROR",
        }, 200);
      }

      // Step 3: basic profile, so we have something to show in the UI
      let username: string | null = null;
      try {
        const profRes = await fetch(
          `https://graph.instagram.com/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(longTok.access_token)}`,
        );
        const prof = await safeJson(profRes);
        username = prof?.username ?? null;
      } catch (_e) { /* non-fatal — we still have the token */ }

      const expiresAt = new Date(Date.now() + (longTok.expires_in ?? 0) * 1000).toISOString();

      const { error: dbErr } = await admin.from("social_integrations").upsert({
        influencer_id: user.id,
        venue_id: null,
        platform: "instagram",
        handle: username,
        display_name: username,
        access_token: longTok.access_token,
        refresh_token: null, // Instagram has no refresh token; re-exchange the long-lived token before it expires instead.
        token_expires_at: expiresAt,
        open_id: shortTok.user_id ? String(shortTok.user_id) : null,
        scope: shortTok.permissions ? String(shortTok.permissions) : SCOPES,
        status: "connected",
        connected_at: new Date().toISOString(),
      }, { onConflict: "influencer_id,platform" });

      if (dbErr) {
        console.error("social_integrations upsert failed", dbErr);
        return json({ error: dbErr.message, code: "DB_UPDATE_FAILED" }, 200);
      }

      return json({ success: true, handle: username });
    }

    return json({ error: "Unknown action", code: "BAD_REQUEST" }, 400);
  } catch (e) {
    console.error("instagram-oauth unexpected error", e);
    return json({ error: String(e), code: "INTERNAL" }, 500);
  }
});
