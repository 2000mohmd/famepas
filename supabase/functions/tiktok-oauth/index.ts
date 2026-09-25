// TikTok Login Kit OAuth. Two audiences share this function:
//
//   1. Creators (influencers) linking their own TikTok from Settings.
//      Mirrors ../instagram-oauth: the redirect_uri is a page in the app
//      (/tiktok/callback) which POSTs the code back here for a server-side
//      exchange. Identity comes from the caller's Supabase session, never
//      from client-supplied ids.
//        POST { action: "initiate" }                -> { url }            [auth required]
//        POST { action: "exchange", code, state }   -> { success, handle } [auth required]
//
//   2. Venues (legacy flow): this function URL is itself the redirect_uri.
//        POST { action: "initiate", venue_id }      -> { url }
//        GET  ?code=...&state=<venue_id>:...        -> redirects to /venue/settings
//
// Required secrets:
//   TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET  (TikTok for Developers -> your app -> Login Kit)
//   PUBLIC_SITE_URL                           e.g. https://famepass.app
// Register BOTH redirect URIs on the TikTok app:
//   https://famepass.app/tiktok/callback                                   (creators)
//   <SUPABASE_URL>/functions/v1/tiktok-oauth                               (venues)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY") ?? "";
const CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET") ?? "";
const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://famepass.app";
const VENUE_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/tiktok-oauth`;
const CREATOR_REDIRECT_URI = `${SITE_URL}/tiktok/callback`;
const SCOPES = "user.info.basic,user.info.profile,user.info.stats,video.list";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function safeJson(res: Response) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}

function buildAuthUrl(state: string, redirectUri: string) {
  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", CLIENT_KEY);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  return authUrl.toString();
}

type ExchangeResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: string;
      openId: string | null;
      scope: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
      followers: number | null;
    }
  | { ok: false; error: string };

async function exchangeCode(rawCode: string, redirectUri: string): Promise<ExchangeResult> {
  const code = decodeURIComponent(String(rawCode ?? "")).replace(/\*.*$/, "");
  if (!code) return { ok: false, error: "Missing code" };

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const tok = await safeJson(tokenRes);
  if (!tokenRes.ok || !tok.access_token) {
    console.error("tiktok token error", tok);
    return { ok: false, error: tok?.error_description || tok?.error || "Could not exchange the authorization code" };
  }

  let username: string | null = null;
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  let followers: number | null = null;
  try {
    const profRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,username,avatar_url,follower_count",
      { headers: { Authorization: `Bearer ${tok.access_token}` } },
    );
    const prof = await safeJson(profRes);
    const u = prof?.data?.user ?? {};
    username = u.username ?? null;
    displayName = u.display_name ?? null;
    avatarUrl = u.avatar_url ?? null;
    followers = typeof u.follower_count === "number" ? u.follower_count : null;
  } catch (_e) { /* non-fatal — we still have the token */ }

  return {
    ok: true,
    accessToken: tok.access_token,
    refreshToken: tok.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (tok.expires_in ?? 0) * 1000).toISOString(),
    openId: tok.open_id ? String(tok.open_id) : null,
    scope: tok.scope ?? SCOPES,
    username,
    displayName,
    avatarUrl,
    followers,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const url = new URL(req.url);

    // --- Venue legacy callback (GET with ?code) ---
    if (req.method === "GET" && url.searchParams.get("code")) {
      const state = url.searchParams.get("state") ?? "";
      const venueId = state.split(":")[0];
      if (!venueId) return new Response("missing venue", { status: 400, headers: corsHeaders });
      if (!CLIENT_KEY || !CLIENT_SECRET) {
        return Response.redirect(`${SITE_URL}/venue/settings?tiktok=missing_keys`, 302);
      }

      const result = await exchangeCode(url.searchParams.get("code")!, VENUE_REDIRECT_URI);
      if (!result.ok) return Response.redirect(`${SITE_URL}/venue/settings?tiktok=error`, 302);

      await admin.from("social_integrations").upsert({
        venue_id: venueId,
        platform: "tiktok",
        handle: result.username ?? result.displayName,
        display_name: result.displayName,
        avatar_url: result.avatarUrl,
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        token_expires_at: result.expiresAt,
        open_id: result.openId,
        scope: result.scope,
        status: "connected",
        connected_at: new Date().toISOString(),
      }, { onConflict: "venue_id,platform" });

      return Response.redirect(`${SITE_URL}/venue/settings?tiktok=connected`, 302);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    if (!CLIENT_KEY || !CLIENT_SECRET) {
      return json({
        error: "TikTok app keys not configured yet. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in backend secrets.",
        code: "MISSING_KEYS",
      }, 503);
    }

    // --- Venue initiate (venue_id supplied, no session needed) ---
    if (body.action === "initiate" && body.venue_id) {
      const state = `${body.venue_id}:${crypto.randomUUID()}`;
      return json({ url: buildAuthUrl(state, VENUE_REDIRECT_URI) });
    }

    // --- Creator actions: require a Supabase session ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header", code: "UNAUTHORIZED" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid or expired session", code: "UNAUTHORIZED" }, 401);

    if (body.action === "initiate") {
      const state = `${user.id}:${crypto.randomUUID()}`;
      return json({ url: buildAuthUrl(state, CREATOR_REDIRECT_URI) });
    }

    if (body.action === "exchange") {
      const state: string = body.state ?? "";
      if (state.split(":")[0] !== user.id) {
        return json({ error: "State does not match the signed-in user", code: "FORBIDDEN" }, 403);
      }

      const result = await exchangeCode(String(body.code ?? ""), CREATOR_REDIRECT_URI);
      if (!result.ok) return json({ error: result.error, code: "PROVIDER_ERROR" }, 200);

      const handle = result.username ?? result.displayName;

      // Partial unique index on (influencer_id, platform) — ON CONFLICT can't
      // target it, so update-then-insert manually.
      const row = {
        influencer_id: user.id,
        venue_id: null,
        platform: "tiktok",
        handle,
        display_name: result.displayName,
        avatar_url: result.avatarUrl,
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        token_expires_at: result.expiresAt,
        open_id: result.openId,
        scope: result.scope,
        status: "connected",
        connected_at: new Date().toISOString(),
      };

      const { data: existing } = await admin
        .from("social_integrations")
        .select("id")
        .eq("influencer_id", user.id)
        .eq("platform", "tiktok")
        .maybeSingle();

      const { error: dbErr } = existing
        ? await admin.from("social_integrations").update(row).eq("id", existing.id)
        : await admin.from("social_integrations").insert(row);

      if (dbErr) {
        console.error("social_integrations save failed", dbErr);
        return json({ error: dbErr.message, code: "DB_UPDATE_FAILED" }, 200);
      }

      const profileUpdate: Record<string, unknown> = {};
      if (handle) profileUpdate.tiktok_handle = handle;
      if (typeof result.followers === "number") profileUpdate.tiktok_followers = result.followers;
      if (Object.keys(profileUpdate).length) {
        await admin.from("profiles").update(profileUpdate).eq("user_id", user.id);
      }

      return json({ success: true, handle, followers: result.followers });
    }

    return json({ error: "Unknown action", code: "BAD_REQUEST" }, 400);
  } catch (e) {
    console.error("tiktok-oauth unexpected error", e);
    return json({ error: String(e), code: "INTERNAL" }, 500);
  }
});
