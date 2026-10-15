// deno test supabase/functions/instagram-deauth/index_test.ts
import { parseSignedRequest } from "./index.ts";

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sign(payload: unknown, secret: string) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return `${b64url(sig)}.${body}`;
}

Deno.test("accepts a correctly signed request", async () => {
  const p = await parseSignedRequest(await sign({ algorithm: "HMAC-SHA256", user_id: "TEST-IG-1" }, "s3cret"), "s3cret");
  if (p?.user_id !== "TEST-IG-1") throw new Error("expected payload");
});

Deno.test("rejects a wrong secret, tampering, and junk", async () => {
  const good = await sign({ algorithm: "HMAC-SHA256", user_id: "TEST-IG-1" }, "s3cret");
  const [sig] = good.split(".");
  const forged = `${sig}.${b64url(new TextEncoder().encode(JSON.stringify({ algorithm: "HMAC-SHA256", user_id: "OTHER" })))}`;
  for (const s of [await sign({ user_id: "TEST-IG-1" }, "wrong"), forged, "junk", ""]) {
    if (await parseSignedRequest(s, "s3cret")) throw new Error(`accepted: ${s.slice(0, 20)}`);
  }
});
