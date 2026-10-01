import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sends WhatsApp template messages from a lead, on our own Meta number
// (direct Graph API). All DB access runs as the caller so RLS decides which
// leads they can message and log against.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const GRAPH = "https://graph.facebook.com/v21.0";

/** Stored phones come in many formats; no country code means Lebanese. */
const toE164Digits = (raw: string) => {
  const trimmed = raw.trim();
  let d = trimmed.replace(/\D/g, "");
  if (d.startsWith("00")) return d.slice(2);
  if (trimmed.startsWith("+") || d.startsWith("961")) return d;
  return "961" + d.replace(/^0+/, "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const wabaId = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID");
    if (!token || !phoneId || !wabaId) return json({ error: "WhatsApp isn't set up yet (missing Meta credentials)." }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in" }, 401);
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);
    const { data: roles } = await caller.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r: { role: string }) => ["sales_rep", "sales_manager", "admin"].includes(r.role))) {
      return json({ error: "Sales access required" }, 403);
    }

    const body = await req.json().catch(() => ({}));

    if (body.action === "list_templates") {
      const res = await fetch(`${GRAPH}/${wabaId}/message_templates?fields=name,language,status,components&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) return json({ error: "Meta request failed", status: res.status, details: text }, res.status);
      const templates = (JSON.parse(text).data ?? [])
        .filter((t: any) => t.status === "APPROVED")
        .map((t: any) => {
          const bodyText = t.components?.find((c: any) => c.type === "BODY")?.text ?? "";
          const params = new Set((bodyText.match(/\{\{\d+\}\}/g) ?? []) as string[]).size;
          return { name: t.name, language: t.language, body: bodyText, params };
        });
      return json({ templates });
    }

    if (body.action === "send") {
      const { lead_id, template_name, language, params } = body;
      if (typeof lead_id !== "string" || typeof template_name !== "string" || typeof language !== "string") {
        return json({ error: "lead_id, template_name and language are required" }, 400);
      }
      const values: string[] = Array.isArray(params) ? params.map((p) => String(p).slice(0, 500)) : [];

      // Only allow approved templates from our own WhatsApp account, with the exact parameter count.
      const tplRes = await fetch(`${GRAPH}/${wabaId}/message_templates?fields=name,language,status,components&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!tplRes.ok) return json({ error: "Could not verify template", status: tplRes.status, details: await tplRes.text() }, tplRes.status);
      const tpl = ((await tplRes.json()).data ?? []).find((t: any) => t.status === "APPROVED" && t.name === template_name && t.language === language);
      if (!tpl) return json({ error: "Template is not an approved template" }, 400);
      const tplBody = tpl.components?.find((c: any) => c.type === "BODY")?.text ?? "";
      const expected = new Set((tplBody.match(/\{\{\d+\}\}/g) ?? []) as string[]).size;
      if (values.length !== expected) return json({ error: `This template needs ${expected} value(s)` }, 400);

      // RLS: a rep only gets their own leads back; managers/admins get all.
      const { data: lead } = await caller.from("leads").select("id, phone, venue_name").eq("id", lead_id).maybeSingle();
      if (!lead) return json({ error: "Lead not found" }, 404);
      if (!lead.phone) return json({ error: "This lead has no phone number" }, 400);

      const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toE164Digits(lead.phone),
          type: "template",
          template: {
            name: template_name,
            language: { code: language },
            ...(values.length ? { components: [{ type: "body", parameters: values.map((text) => ({ type: "text", text })) }] } : {}),
          },
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`WhatsApp send failed [${res.status}]: ${text}`);
        return json({ error: "WhatsApp send failed", status: res.status, details: text }, res.status);
      }
      const messageId = JSON.parse(text).messages?.[0]?.id ?? null;
      const { error: logErr } = await caller.from("lead_activities").insert({
        lead_id, user_id: user.id, type: "whatsapp",
        outcome: `Sent template "${template_name}"${values.length ? ` (${values.join(", ")})` : ""}`,
      });
      return json({ ok: true, message_id: messageId, logged: !logErr });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
