// Phyllo Connect for creators (replaces our own Meta / TikTok OAuth apps).
// Actions (POST, signed-in creator only — identity comes from the session):
//   { action: "start" }                              -> { user_id, sdk_token, environment, work_platforms }
//   { action: "account_connected", account_id }      -> { success, platform, handle }
//   { action: "disconnect", platform }               -> { success }
// See ../_shared/phyllo.ts for secrets and the stored-row shape.
import { createClient } from "npm:@supabase/supabase-js@2";
import { mirrorAvatar, applyProfileAvatar } from "../_shared/avatar.ts";
import { createSdkToken, getAccount, getOrCreateUser, getProfile, phyllo, phylloEnv, platformOf, PHYLLO_SCOPE, workPlatformIds } from "../_shared/phyllo.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in" }, 401);
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "influencer").maybeSingle();
    if (!role) return json({ error: "Only creators can connect social accounts here" }, 403);

    const body = await req.json().catch(() => ({}));
    const { data: profile } = await admin.from("profiles").select("full_name, phyllo_user_id").eq("user_id", user.id).maybeSingle();
    const phylloUser = await getOrCreateUser(user.id, profile?.full_name ?? "", profile?.phyllo_user_id ?? null);
    if (!phylloUser.ok) return json({ error: phylloUser.error }, 502);
    const phylloUserId = phylloUser.body.id;
    if (phylloUserId !== profile?.phyllo_user_id) {
      await admin.from("profiles").update({ phyllo_user_id: phylloUserId }).eq("user_id", user.id);
    }

    if (body.action === "start") {
      const [token, platforms] = await Promise.all([createSdkToken(phylloUserId), workPlatformIds()]);
      if (!token.ok || !token.body?.sdk_token) return json({ error: token.ok ? "Phyllo didn't return a connect token" : token.error }, 502);
      return json({ user_id: phylloUserId, sdk_token: token.body.sdk_token, environment: phylloEnv(), work_platforms: platforms });
    }

    if (body.action === "account_connected") {
      const accountId = typeof body.account_id === "string" ? body.account_id : "";
      if (!accountId) return json({ error: "account_id required" }, 400);
      const acct = await getAccount(accountId);
      if (!acct.ok) return json({ error: acct.error }, 502);
      // The browser only tells us an id; Phyllo confirms whose account it is.
      if (acct.body?.user?.id !== phylloUserId) return json({ error: "That account isn't linked to you" }, 403);
      const platform = platformOf(acct.body?.work_platform?.name);
      if (!platform) return json({ error: "Only Instagram and TikTok are supported" }, 400);

      const prof = await getProfile(accountId); // may be null right after connecting while Phyllo syncs
      const handle = prof?.handle ?? acct.body?.platform_username ?? acct.body?.username ?? null;
      const row = {
        influencer_id: user.id, venue_id: null, platform, handle, display_name: prof?.full_name ?? handle,
        access_token: null, refresh_token: null, token_expires_at: null, open_id: accountId, scope: PHYLLO_SCOPE,
        status: "connected", connected_at: new Date().toISOString(),
      };
      const { data: existing } = await admin.from("social_integrations").select("id").eq("influencer_id", user.id).eq("platform", platform).maybeSingle();
      const { error: dbErr } = existing
        ? await admin.from("social_integrations").update(row).eq("id", existing.id)
        : await admin.from("social_integrations").insert(row);
      if (dbErr) return json({ error: dbErr.message }, 500);

      const profileUpdate: Record<string, unknown> = platform === "instagram"
        ? { ...(handle ? { instagram_handle: handle } : {}), instagram_verified: !!handle, instagram_verified_at: new Date().toISOString(), ...(prof?.followers != null ? { followers_count: prof.followers } : {}) }
        : { ...(handle ? { tiktok_handle: handle } : {}), ...(prof?.followers != null ? { tiktok_followers: prof.followers } : {}) };
      await admin.from("profiles").update(profileUpdate).eq("user_id", user.id);
      if (prof?.image_url) await applyProfileAvatar(admin, user.id, await mirrorAvatar(admin, user.id, platform, prof.image_url));

      return json({ success: true, platform, handle, profile_ready: !!prof });
    }

    if (body.action === "disconnect") {
      const platform = body.platform === "tiktok" ? "tiktok" : "instagram";
      const { data: integ } = await admin.from("social_integrations").select("id, open_id, scope").eq("influencer_id", user.id).eq("platform", platform).maybeSingle();
      if (integ?.scope === PHYLLO_SCOPE && integ.open_id) await phyllo(`/v1/accounts/${encodeURIComponent(integ.open_id)}/disconnect`, { method: "POST" });
      if (integ) await admin.from("social_integrations").delete().eq("id", integ.id);
      if (platform === "instagram") await admin.from("profiles").update({ instagram_verified: false }).eq("user_id", user.id);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("phyllo function error", String((e as Error)?.message ?? e).slice(0, 200));
    return json({ error: "Something went wrong connecting your account" }, 500);
  }
});
