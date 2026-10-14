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
// Two families of actions:
//   - "initiate" / "exchange": an already-logged-in creator connecting (or
//     reconnecting) Instagram from Settings. Requires Authorization: Bearer
//     <user JWT>, which supabase.functions.invoke() attaches automatically
//     for a signed-in user.
//   - "login_initiate" / "identify": "Continue with Instagram" from the
//     Login page — no Supabase session exists yet, so these are public.
//     "identify" either signs a returning creator straight in (their
//     Instagram is already linked to a social_integrations row) or, for a
//     brand-new creator, stashes the verified Instagram identity in
//     pending_instagram_signups for the signup wizard to pick up.
//
// Required secrets (Supabase project settings -> Edge Functions -> Secrets):
//   INSTAGRAM_CLIENT_ID       - Instagram App ID (Meta App Dashboard -> Instagram -> API setup with Instagram business login)
//   INSTAGRAM_CLIENT_SECRET   - Instagram App Secret (same page)
//   PUBLIC_SITE_URL           - e.g. https://famepass.app (must match the
//                               redirect URI registered on the Instagram app)
//
// Actions (all POST):
//   { action: "initiate" }                          -> { url }                                   [auth required]
//   { action: "exchange", code, state }              -> { success, handle }                       [auth required]
//   { action: "login_initiate" }                     -> { url }                                   [public]
//   { action: "identify", code, state }              -> { mode: "login", email, hashed_token }
//                                                     |  { mode: "new", link_token, username, account_type } [public]
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { mirrorAvatar, applyProfileAvatar } from "../_shared/avatar.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("INSTAGRAM_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("INSTAGRAM_CLIENT_SECRET") ?? "";
const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://famepass.app";
const REDIRECT_URI = `${SITE_URL}/instagram/callback`;

// https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
// Only what the platform reads: profile/followers/media (basic) and post +
// account insights for campaign tracking. Every extra scope is another
// screencast and justification in Meta App Review, so don't add unused ones.
const SCOPES = [
  "instagram_business_basic",
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

function buildAuthUrl(state: string) {
  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", state);
  return authUrl.toString();
}

type ExchangeResult =
  | { ok: true; accessToken: string; expiresAt: string; igUserId: string | null; scope: string; username: string | null; accountType: string | null; pictureUrl: string | null; followersCount: number | null }
  | { ok: false; error: string };

/** Shared by "exchange" (logged-in connect) and "identify" (logged-out login/signup): code -> long-lived token + basic profile. */
async function exchangeCode(rawCode: string): Promise<ExchangeResult> {
  // Instagram sometimes appends "#_" to the redirected code — strip it.
  const code = rawCode.replace(/#_$/, "");
  if (!code) return { ok: false, error: "Missing code" };

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
    return { ok: false, error: shortTok?.error_message || "Could not exchange the authorization code" };
  }

  // Step 2: exchange for a long-lived token (~60 days).
  // Instagram's docs say GET, but some app configurations answer GET with
  // IGApiException "Unsupported request - method type: get" — so fall back to
  // POST, and if both fail keep the short-lived token rather than failing the
  // whole sign-in (the creator is still authenticated; we just re-link sooner).
  const longParams = {
    grant_type: "ig_exchange_token",
    client_secret: CLIENT_SECRET,
    access_token: shortTok.access_token,
  };
  // The unversioned path is answered with "Unsupported request" for Business
  // Login apps; the versioned path works. Try versioned first, then legacy.
  let longTok: any = null;
  for (const base of [
    "https://graph.instagram.com/v23.0/access_token",
    "https://graph.instagram.com/v21.0/access_token",
    "https://graph.instagram.com/access_token",
  ]) {
    const u = new URL(base);
    for (const [k, v] of Object.entries(longParams)) u.searchParams.set(k, v);
    longTok = await safeJson(await fetch(u.toString()));
    if (longTok?.access_token) break;
    console.error(`instagram long-lived token error at ${base}`, longTok);
  }

  const accessToken: string = longTok?.access_token ?? shortTok.access_token;
  const expiresInSec: number = longTok?.access_token
    ? (longTok.expires_in ?? 5184000)
    : 3600;
  if (!longTok?.access_token) {
    console.error("instagram long-lived token error (POST too) — using short-lived token", longTok);
  }

  // Step 3: basic profile
  let username: string | null = null;
  let accountType: string | null = null;
  let pictureUrl: string | null = null;
  let followersCount: number | null = null;
  try {
    const profRes = await fetch(
      `https://graph.instagram.com/me?fields=user_id,username,account_type,profile_picture_url,followers_count&access_token=${encodeURIComponent(accessToken)}`,
    );
    const prof = await safeJson(profRes);
    // Log unconditionally while we're chasing why photo/handle keep coming
    // back empty — a 200 with fields just missing wouldn't trip an error
    // check, and that silent gap is exactly how the last connections ended
    // up with no photo and nobody able to tell why.
    console.log("instagram /me profile fetch", profRes.status, JSON.stringify(prof));
    if (!profRes.ok || prof?.error) {
      console.error("instagram /me profile fetch failed", profRes.status, prof);
    } else {
      username = prof?.username ?? null;
      accountType = prof?.account_type ?? null;
      pictureUrl = prof?.profile_picture_url ?? null;
      followersCount = typeof prof?.followers_count === "number" ? prof.followers_count : null;
    }
  } catch (e) { console.error("instagram /me profile fetch threw", e); }

  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  return {
    ok: true,
    accessToken,
    expiresAt,
    igUserId: shortTok.user_id ? String(shortTok.user_id) : null,
    scope: shortTok.permissions ? String(shortTok.permissions) : SCOPES,
    username,
    accountType,
    pictureUrl,
    followersCount,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return json({
        error: "Instagram app keys not configured yet. Add INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET in backend secrets.",
        code: "MISSING_KEYS",
      }, 503);
    }

    // --- Public actions: no Supabase session exists yet (Login page's "Continue with Instagram") ---

    if (body.action === "login_initiate") {
      const state = `login:${crypto.randomUUID()}`;
      return json({ url: buildAuthUrl(state) });
    }

    if (body.action === "identify") {
      const state: string = body.state ?? "";
      if (!state.startsWith("login:")) {
        return json({ error: "Invalid state", code: "BAD_REQUEST" }, 400);
      }

      const result = await exchangeCode(String(body.code ?? ""));
      if (!result.ok) return json({ error: result.error, code: "PROVIDER_ERROR" }, 200);
      if (!result.igUserId) return json({ error: "Instagram did not return an account id", code: "PROVIDER_ERROR" }, 200);

      const { data: existing } = await admin
        .from("social_integrations")
        .select("influencer_id")
        .eq("platform", "instagram")
        .eq("open_id", result.igUserId)
        .not("influencer_id", "is", null)
        .maybeSingle();

      if (existing?.influencer_id) {
        // Returning creator — refresh the stored token, then hand back a
        // magic-link token the client exchanges for a session (no password).
        const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(existing.influencer_id);
        if (userErr || !userRes?.user?.email) {
          console.error("identify: could not load user for existing link", userErr);
          return json({ error: "Could not find the account for this Instagram profile", code: "PROVIDER_ERROR" }, 200);
        }
        const email = userRes.user.email;

        await admin.from("social_integrations").update({
          handle: result.username,
          display_name: result.username,
          access_token: result.accessToken,
          token_expires_at: result.expiresAt,
          scope: result.scope,
          status: "connected",
        }).eq("influencer_id", existing.influencer_id).eq("platform", "instagram");

        const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
        if (linkErr || !link?.properties?.hashed_token) {
          console.error("identify: generateLink failed", linkErr);
          return json({ error: "Could not sign you in — please try again", code: "PROVIDER_ERROR" }, 200);
        }
        return json({ mode: "login", email, hashed_token: link.properties.hashed_token });
      }

      // Brand-new creator — stash the verified identity for the signup wizard.
      const { data: pending, error: pendingErr } = await admin.from("pending_instagram_signups").insert({
        ig_user_id: result.igUserId,
        ig_username: result.username,
        ig_account_type: result.accountType,
        ig_picture_url: result.pictureUrl,
        access_token: result.accessToken,
        scope: result.scope,
        token_expires_at: result.expiresAt,
      }).select("id").single();
      if (pendingErr || !pending) {
        console.error("identify: pending_instagram_signups insert failed", pendingErr);
        return json({ error: "Could not start signup — please try again", code: "DB_UPDATE_FAILED" }, 200);
      }

      return json({ mode: "new", link_token: pending.id, username: result.username, account_type: result.accountType });
    }

    // --- Authenticated actions: an already-logged-in creator connecting Instagram from Settings ---

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header", code: "UNAUTHORIZED" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid or expired session", code: "UNAUTHORIZED" }, 401);

    // Venues connect the same way as creators; the venue id rides along as the
    // 4th state segment and ownership is re-checked on both ends.
    const ownsVenue = async (venueId: string) => {
      const { data } = await admin.from("venues").select("id").eq("id", venueId).eq("owner_id", user.id).maybeSingle();
      return !!data;
    };

    if (body.action === "initiate") {
      const venueId: string = typeof body.venue_id === "string" ? body.venue_id : "";
      if (venueId && !(await ownsVenue(venueId))) return json({ error: "Not your venue", code: "FORBIDDEN" }, 403);
      // Remember where the user started (preview, famepass.app, www…) so the
      // callback page can forward the code back to the domain holding their session.
      const origin = req.headers.get("origin") ?? "";
      const originTag = origin ? btoa(origin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : "";
      const state = `${user.id}:${crypto.randomUUID()}:${originTag}${venueId ? `:${venueId}` : ""}`;
      return json({ url: buildAuthUrl(state) });
    }

    if (body.action === "exchange") {
      const state: string = body.state ?? "";
      const [stateOwner, , , venueId] = state.split(":");
      if (!stateOwner || stateOwner !== user.id) {
        return json({ error: "State does not match the signed-in user", code: "FORBIDDEN" }, 403);
      }

      const result = await exchangeCode(String(body.code ?? ""));
      if (!result.ok) return json({ error: result.error, code: "PROVIDER_ERROR" }, 200);

      if (venueId) {
        if (!(await ownsVenue(venueId))) return json({ error: "Not your venue", code: "FORBIDDEN" }, 403);
        const { error: vErr } = await admin.from("social_integrations").upsert({
          venue_id: venueId,
          influencer_id: null,
          platform: "instagram",
          handle: result.username,
          display_name: result.username,
          avatar_url: result.pictureUrl,
          access_token: result.accessToken,
          refresh_token: null,
          token_expires_at: result.expiresAt,
          open_id: result.igUserId,
          scope: result.scope,
          status: "connected",
          connected_at: new Date().toISOString(),
        }, { onConflict: "venue_id,platform" });
        if (vErr) {
          console.error("venue social_integrations save failed", vErr);
          return json({ error: vErr.message, code: "DB_UPDATE_FAILED" }, 200);
        }
        return json({ success: true, handle: result.username, venue: true });
      }

      // The (influencer_id, platform) unique index is partial, so PostgREST
      // upsert/ON CONFLICT can't target it — update-then-insert instead.
      const row = {
        influencer_id: user.id,
        venue_id: null,
        platform: "instagram",
        handle: result.username,
        display_name: result.username,
        access_token: result.accessToken,
        refresh_token: null, // Instagram has no refresh token; re-exchange the long-lived token before it expires instead.
        token_expires_at: result.expiresAt,
        open_id: result.igUserId,
        scope: result.scope,
        status: "connected",
        connected_at: new Date().toISOString(),
      };

      const { data: existing } = await admin
        .from("social_integrations")
        .select("id")
        .eq("influencer_id", user.id)
        .eq("platform", "instagram")
        .maybeSingle();

      const { error: dbErr } = existing
        ? await admin.from("social_integrations").update(row).eq("id", existing.id)
        : await admin.from("social_integrations").insert(row);

      if (dbErr) {
        console.error("social_integrations save failed", dbErr);
        return json({ error: dbErr.message, code: "DB_UPDATE_FAILED" }, 200);
      }

      // Keep profiles.instagram_verified in sync — it's the single source of
      // truth the dashboard nudge and offer-apply gate check. Adnan, "Creator
      // Page fixes" #3: pull the follower count from Instagram itself rather
      // than trusting whatever the creator typed before connecting.
      await admin.from("profiles").update({
        instagram_handle: result.username,
        instagram_verified: true,
        instagram_verified_at: new Date().toISOString(),
        ...(result.followersCount != null ? { followers_count: result.followersCount } : {}),
      }).eq("user_id", user.id);

      await applyProfileAvatar(admin, user.id, await mirrorAvatar(admin, user.id, "instagram", result.pictureUrl));

      return json({ success: true, handle: result.username });
    }

    return json({ error: "Unknown action", code: "BAD_REQUEST" }, 400);
  } catch (e) {
    console.error("instagram-oauth unexpected error", e);
    return json({ error: String(e), code: "INTERNAL" }, 500);
  }
});
