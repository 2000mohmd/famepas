// Per-venue TikTok OAuth (Login Kit). Handles two actions:
//   POST { action: "initiate", venue_id }  -> returns { url }
//   GET  ?code=...&state=...                -> exchanges code, stores tokens, redirects to /venue/settings
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY") ?? "";
const CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET") ?? "";
const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://famepas.lovable.app";
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/tiktok-oauth`;
const SCOPES = "user.info.basic,video.list";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const url = new URL(req.url);

    // OAuth callback (GET with ?code)
    if (req.method === "GET" && url.searchParams.get("code")) {
      const code = url.searchParams.get("code")!;
      const state = url.searchParams.get("state") ?? "";
      const venueId = state.split(":")[0];
      if (!venueId) return new Response("missing venue", { status: 400, headers: corsHeaders });

      if (!CLIENT_KEY || !CLIENT_SECRET) {
        return Response.redirect(`${SITE_URL}/venue/settings?tiktok=missing_keys`, 302);
      }

      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: CLIENT_KEY,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
        }),
      });
      const tok = await tokenRes.json();
      if (!tokenRes.ok || !tok.access_token) {
        console.error("tiktok token error", tok);
        return Response.redirect(`${SITE_URL}/venue/settings?tiktok=error`, 302);
      }

      // Fetch profile
      let display_name: string | null = null;
      let avatar_url: string | null = null;
      try {
        const profRes = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
          { headers: { Authorization: `Bearer ${tok.access_token}` } },
        );
        const prof = await profRes.json();
        display_name = prof?.data?.user?.display_name ?? null;
        avatar_url = prof?.data?.user?.avatar_url ?? null;
      } catch (_e) { /* ignore */ }

      const expiresAt = new Date(Date.now() + (tok.expires_in ?? 0) * 1000).toISOString();

      await admin.from("social_integrations").upsert({
        venue_id: venueId,
        platform: "tiktok",
        handle: display_name,
        display_name,
        avatar_url,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        token_expires_at: expiresAt,
        open_id: tok.open_id,
        scope: tok.scope,
        status: "connected",
        connected_at: new Date().toISOString(),
      }, { onConflict: "venue_id,platform" });

      return Response.redirect(`${SITE_URL}/venue/settings?tiktok=connected`, 302);
    }

    // Initiate
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    if (body.action === "initiate") {
      if (!CLIENT_KEY) {
        return new Response(
          JSON.stringify({ error: "TikTok app keys not configured yet. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in backend secrets." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const venueId = body.venue_id;
      if (!venueId) {
        return new Response(JSON.stringify({ error: "venue_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const state = `${venueId}:${crypto.randomUUID()}`;
      const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
      authUrl.searchParams.set("client_key", CLIENT_KEY);
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("state", state);
      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
