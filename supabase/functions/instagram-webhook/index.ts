// Instagram Webhooks callback endpoint — Meta's Webhooks product, SEPARATE
// from the OAuth login flow in ../instagram-oauth (which handles creators
// signing in / connecting accounts). This function handles:
//   - GET: Meta's one-time verification handshake. When you add this
//     function's URL as the "Callback URL" in Meta App Dashboard ->
//     Instagram -> Webhooks, Meta sends hub.mode/hub.verify_token/
//     hub.challenge and we must echo the challenge back as plain text.
//   - POST: actual webhook event deliveries (comments, mentions, messages,
//     insights, etc.). Each payload is signed; we verify before parsing.
//
// Required secrets (Supabase project settings -> Edge Functions -> Secrets):
//   INSTAGRAM_WEBHOOK_VERIFY_TOKEN - an arbitrary secret string we invent
//     ourselves; the SAME value must be pasted into the "Verify Token"
//     field in Meta App Dashboard -> Instagram -> Webhooks, next to this
//     function's URL as the "Callback URL".
//   INSTAGRAM_CLIENT_SECRET        - the existing Instagram App Secret,
//     reused here to verify the x-hub-signature-256 payload signature.
//
// NOTE: no Supabase Authorization check anywhere — Meta's servers call
// this directly and never send a user JWT (see config.toml verify_jwt=false).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const VERIFY_TOKEN = Deno.env.get("INSTAGRAM_WEBHOOK_VERIFY_TOKEN") ?? "";
const APP_SECRET = Deno.env.get("INSTAGRAM_CLIENT_SECRET") ?? "";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toHex(sig);
}

/** Constant-time string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // --- GET: Meta verification handshake ---
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      // Meta requires the literal hub.challenge value as plain text.
      return new Response(challenge ?? "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return new Response("Verification failed", {
      status: 403,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // --- POST: event delivery ---
  if (req.method === "POST") {
    // Read raw text first — signature is over the exact bytes, before JSON parsing.
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") ?? "";

    if (!APP_SECRET || !signature) {
      return new Response("Verification failed", { status: 403, headers: { "Content-Type": "text/plain" } });
    }
    const expected = `sha256=${await hmacSha256Hex(APP_SECRET, rawBody)}`;
    if (!timingSafeEqual(signature, expected)) {
      console.warn("instagram-webhook: bad signature");
      return new Response("Verification failed", { status: 403, headers: { "Content-Type": "text/plain" } });
    }

    try {
      const payload = JSON.parse(rawBody);
      const summary = {
        object: payload?.object,
        entries: Array.isArray(payload?.entry)
          ? payload.entry.map((e: { id?: unknown }) => e?.id)
          : [],
        fields: Array.isArray(payload?.entry)
          ? payload.entry.flatMap((e: Record<string, unknown>) =>
            Object.keys(e ?? {}).filter((k) => k !== "id" && k !== "time")
          )
          : [],
      };
      console.log("instagram-webhook event", JSON.stringify(summary));
    } catch (e) {
      console.warn("instagram-webhook: payload not JSON", e);
    }

    // Meta expects a fast 200 ack and retries on anything else.
    return new Response("", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405, headers: { "Content-Type": "text/plain" } });
});
