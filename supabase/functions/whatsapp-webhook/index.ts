import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Meta calls this directly (no Supabase JWT). Incoming replies are matched to
// leads with normalize_lb_phone() via find_leads_by_phone, then logged as
// 'whatsapp' activities.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

const validSignature = async (raw: string, header: string | null, secret: string) => {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
};

const describe = (m: any): string => {
  switch (m.type) {
    case "text": return m.text?.body ?? "";
    case "button": return m.button?.text ?? "[button]";
    case "interactive": return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "[interactive]";
    case "reaction": return `reacted ${m.reaction?.emoji ?? ""}`;
    default: return `[${m.type}]${m[m.type]?.caption ? " " + m[m.type].caption : ""}`;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    const u = new URL(req.url);
    if (u.searchParams.get("hub.mode") === "subscribe" &&
        u.searchParams.get("hub.verify_token") === Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN")) {
      return new Response(u.searchParams.get("hub.challenge") ?? "", { headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const secret = Deno.env.get("WHATSAPP_APP_SECRET") ?? Deno.env.get("META_APP_SECRET");
  if (!secret || !(await validSignature(raw, req.headers.get("x-hub-signature-256"), secret))) {
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload = JSON.parse(raw);
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const names: Record<string, string> = {};
        for (const c of value.contacts ?? []) names[c.wa_id] = c.profile?.name ?? "";
        for (const m of value.messages ?? []) {
          const { data: leads, error } = await admin.rpc("find_leads_by_phone", { _phone: m.from });
          if (error) { console.error("lead lookup failed", error); continue; }
          if (!leads?.length) { console.log(`No lead for WhatsApp sender ${m.from}`); continue; }
          const who = names[m.from] ? ` (${names[m.from]})` : "";
          const happened = m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : new Date().toISOString();
          const rows = leads.map((l: { id: string }) => ({
            lead_id: l.id, user_id: null, type: "whatsapp",
            outcome: `Reply${who}: ${describe(m)}`.slice(0, 2000), happened_at: happened,
          }));
          const { error: insErr } = await admin.from("lead_activities").insert(rows);
          if (insErr) console.error("activity insert failed", insErr);
        }
      }
    }
  } catch (err) {
    console.error("webhook processing error", err);
  }
  return new Response("ok", { status: 200 });
});
