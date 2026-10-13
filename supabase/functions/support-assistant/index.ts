import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callOpenAI } from "../_shared/openai.ts";

// First-line AI support for venue/creator Messages. Answers what it can from
// the chatbot knowledge base; anything that needs a person is flagged
// needs_human so the FamePass team picks it up. The caller's own message is
// already saved before this runs, so a failure here never loses a message.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PROMPT = `You are the FamePass support assistant inside the app's Messages screen.
FamePass connects Lebanese venues (restaurants, cafes, spas, hotels, gyms, shops) with content creators: venues post offers, creators apply, visit, check in with a QR code, and post content; venues review the content.

You are talking to a {ROLE}. Answer how-to and product questions yourself, clearly and briefly (1-4 short sentences, friendly, no markdown headings). Reply in the same language the user writes in (English or Arabic).

Set "escalate": true when the request needs a person on the FamePass team, for example:
- account approval, suspension, deleting an account or data
- payments, plans, billing, refunds, invoices
- disputes, no-shows, complaints, reporting a creator or venue, safety concerns
- bugs, errors, something not working, missing data
- changing information they can't edit themselves
- anything you are not sure about, or the user explicitly asks for a human
When escalating, still reply: acknowledge, say the FamePass team will follow up here, and ask for any detail that would help (e.g. which booking or offer).

Respond ONLY with JSON: {"reply": string, "escalate": boolean, "reason": string}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { message_id } = await req.json().catch(() => ({}));
    if (typeof message_id !== "string") return json({ error: "message_id required" }, 400);

    const { data: msg } = await admin.from("messages").select("id, sender_id, receiver_id, venue_id, content").eq("id", message_id).maybeSingle();
    if (!msg || msg.sender_id !== user.id) return json({ error: "Message not found" }, 404);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
    const role = roleSet.has("venue") ? "venue owner" : roleSet.has("influencer") ? "content creator" : null;
    if (!role) return json({ error: "Support assistant is for venues and creators" }, 403);

    // Recent thread with the support team, oldest first.
    const supportId = msg.receiver_id;
    const { data: recent } = await admin.from("messages")
      .select("sender_id, content, created_at")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${supportId}),and(sender_id.eq.${supportId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: false }).limit(12);
    const history = (recent ?? []).reverse().map((m: { sender_id: string; content: string }) => ({
      role: m.sender_id === user.id ? "user" : "assistant",
      content: String(m.content ?? "").slice(0, 1500),
    }));

    const { data: kb } = await admin.from("chatbot_knowledge")
      .select("entry_type, question, answer, doc_title, doc_content").eq("is_active", true);
    const knowledge = (kb ?? []).map((k: any) => k.entry_type === "qa" ? `Q: ${k.question}\nA: ${k.answer}` : `### ${k.doc_title}\n${k.doc_content}`).join("\n\n");

    const system = PROMPT.replace("{ROLE}", role) + (knowledge ? `\n\n## FamePass knowledge base\n${knowledge}` : "");
    const result = await callOpenAI([{ role: "system", content: system }, ...history], true);
    if (result.error) return json({ error: result.error }, result.status);

    let parsed: { reply?: string; escalate?: boolean; reason?: string } = {};
    try { parsed = JSON.parse(result.content); } catch { parsed = { reply: result.content, escalate: true, reason: "unparseable" }; }
    const reply = (parsed.reply ?? "").trim() || "Thanks — I've passed this to the FamePass team and they'll reply here.";
    const escalate = parsed.escalate !== false;

    const { data: saved, error: insErr } = await admin.from("messages").insert({
      sender_id: supportId, receiver_id: user.id, venue_id: msg.venue_id, content: reply,
      message_type: "text", ai_generated: true,
    }).select("id, sender_id, receiver_id, content, created_at, ai_generated").single();
    if (insErr) return json({ error: insErr.message }, 500);

    // Escalated → stays unread ("New" in the admin inbox) and flagged.
    // Resolved by the AI → marked read so the team inbox only lights up for real work.
    await admin.from("messages").update(escalate ? { needs_human: true } : { is_read: true }).eq("id", msg.id);

    return json({ message: saved, escalate, reason: parsed.reason ?? null });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
