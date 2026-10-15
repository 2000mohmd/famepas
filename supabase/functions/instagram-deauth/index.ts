// Instagram deauthorization + data deletion callbacks (Meta App Dashboard ->
// Instagram -> API setup with Instagram login -> Business login settings).
//
// Meta POSTs application/x-www-form-urlencoded with one field, `signed_request`
// = "<base64url HMAC-SHA256 sig>.<base64url JSON payload>", signed with the
// Instagram app secret. The payload's user_id is the Instagram user id we store
// as social_integrations.open_id.
//
// Register the same function twice:
//   Deauthorize callback URL:   <SUPABASE_URL>/functions/v1/instagram-deauth
//   Data deletion request URL:  <SUPABASE_URL>/functions/v1/instagram-deauth?type=deletion
// Deletion must answer { url, confirmation_code } per Meta's spec.
//
// What gets removed (Privacy Policy section 8): the Instagram connection (token,
// handle, ids) and any half-finished Instagram signup. The FamePass account,
// bookings, venues and other data are untouched.
//
// Secrets: INSTAGRAM_CLIENT_SECRET (or META_APP_SECRET), SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. verify_jwt = false — Meta never sends a user JWT.
import { createClient } from "npm:@supabase/supabase-js@2";

const SECRET = Deno.env.get("INSTAGRAM_CLIENT_SECRET") || Deno.env.get("META_APP_SECRET") || "";
const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://famepass.app";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const b64urlToBytes = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

/** Returns the payload when the HMAC checks out, otherwise null. */
export async function parseSignedRequest(signed: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [sigPart, payloadPart] = signed.split(".");
    if (!sigPart || !payloadPart || !secret) return null;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    // crypto.subtle.verify is constant-time.
    const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sigPart), new TextEncoder().encode(payloadPart));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadPart)));
    return payload?.algorithm && String(payload.algorithm).toUpperCase() !== "HMAC-SHA256" ? null : payload;
  } catch { return null; } // malformed base64/JSON is a bad request, not a crash
}

if (import.meta.main) Deno.serve(async (req) => {
  // Meta never sends preflight, but browsers and tests may; answer it like the other functions.
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type" } });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const isDeletion = new URL(req.url).searchParams.get("type") === "deletion";

  const form = await req.formData().catch(() => null);
  const signed = form?.get("signed_request");
  if (typeof signed !== "string") return json({ error: "signed_request required" }, 400);

  const payload = await parseSignedRequest(signed, SECRET);
  const igUserId = payload?.user_id != null ? String(payload.user_id) : "";
  if (!igUserId) {
    console.warn("instagram-deauth: rejected request (bad signature or no user_id)");
    return json({ error: "Invalid signed_request" }, 403);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows, error } = await admin.from("social_integrations")
    .delete().eq("platform", "instagram").eq("open_id", igUserId).select("influencer_id");
  if (error) {
    console.error("instagram-deauth: delete failed", error.code);
    return json({ error: "Could not process request" }, 500);
  }
  const creatorIds = (rows ?? []).map((r: { influencer_id: string | null }) => r.influencer_id).filter(Boolean) as string[];
  if (creatorIds.length) {
    await admin.from("profiles").update({ instagram_verified: false, instagram_verified_at: null }).in("user_id", creatorIds);
  }
  await admin.from("pending_instagram_signups").delete().eq("ig_user_id", igUserId);
  console.log("instagram-deauth: processed", { type: isDeletion ? "deletion" : "deauthorize", connections_removed: rows?.length ?? 0 });

  if (!isDeletion) return json({ success: true });
  const confirmation_code = crypto.randomUUID();
  return json({ url: `${SITE_URL}/privacy?deletion=${confirmation_code}`, confirmation_code });
});
