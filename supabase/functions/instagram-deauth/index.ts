// Instagram deauthorization and data deletion callback.
// Meta calls this when a creator removes FamePass from their Instagram app settings,
// or requests data deletion. We verify the request, then revoke the token and clear data.
//
// Required secrets: META_APP_SECRET (or falls back to INSTAGRAM_CLIENT_SECRET)
// No Authorization check — Meta's servers call this directly with a signed request.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function verifyMetaSignature(body: string, xHubSignature: string): Promise<boolean> {
  const appSecret = Deno.env.get("META_APP_SECRET") ?? Deno.env.get("INSTAGRAM_CLIENT_SECRET") ?? "";
  if (!appSecret) {
    console.error("Missing app secret for Meta signature verification");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computed = "sha256=" + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return computed === xHubSignature;
  } catch (e) {
    console.error("Signature verification failed", { error: (e as Error).message });
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.text();
    const xHubSignature = req.headers.get("x-hub-signature-256") ?? "";

    if (!await verifyMetaSignature(body, xHubSignature)) {
      console.warn("instagram-deauth: signature verification failed");
      return json({ error: "Signature verification failed" }, 403);
    }

    const payload = JSON.parse(body);
    const { signed_request, object } = payload;

    // Deauthorization: when user removes the app from their Instagram settings.
    // signed_request contains encoded user ID and auth token info.
    if (object === "instagram" && signed_request) {
      try {
        const [encodedSig, encodedPayload] = signed_request.split(".");
        const appSecret = Deno.env.get("META_APP_SECRET") ?? Deno.env.get("INSTAGRAM_CLIENT_SECRET") ?? "";
        const decoder = new TextDecoder();
        const payloadStr = decoder.decode(Uint8Array.from(atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
        const decoded = JSON.parse(payloadStr);
        const igUserId = decoded.user_id;

        if (igUserId) {
          const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

          // Find and delete the Instagram social integration for this user.
          // This revokes the token from our side (Meta also invalidates it).
          const { error: delErr } = await admin
            .from("social_integrations")
            .delete()
            .eq("platform", "instagram")
            .eq("open_id", String(igUserId));

          if (delErr) {
            console.error("deauth: failed to delete integration", delErr.message);
            return json({ error: delErr.message }, 500);
          }

          console.log("instagram deauth: integration deleted", { ig_user_id: igUserId });
        }
      } catch (e) {
        console.error("deauth: signed_request decode failed", { error: (e as Error).message });
        return json({ error: "Could not decode request" }, 400);
      }

      return json({ data: "deauth acked" });
    }

    // Data deletion: when user requests deletion via Instagram settings or a consent flow.
    // The request body should contain a user ID or email to delete associated data.
    // Per the Privacy Policy, we delete the linked Instagram social_integrations row
    // and keep the FamePass account itself (user can delete that via FamePass settings).
    if (object === "user" && payload.uid) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      // payload.uid is the Instagram user ID for this request.
      // Delete only the Instagram integration, not the whole user account.
      const { error: delErr } = await admin
        .from("social_integrations")
        .delete()
        .eq("platform", "instagram")
        .eq("open_id", String(payload.uid));

      if (delErr) {
        console.error("deletion: failed to delete integration", delErr.message);
        return json({ error: delErr.message }, 500);
      }

      console.log("instagram data deletion: integration deleted", { ig_user_id: payload.uid });
      return json({ data: "deletion acked" });
    }

    return json({ error: "Unknown object type" }, 400);
  } catch (e) {
    console.error("instagram-deauth error", { error: (e as Error).message });
    return json({ error: (e as Error).message }, 500);
  }
});
