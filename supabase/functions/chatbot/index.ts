import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callOpenAI } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_PROMPT = `You are the FamePass assistant — a friendly, concise concierge for the FamePass website.

FamePass connects influencers with premium venues (restaurants, lounges, hotels, experiences) for exclusive offers and collaborations.

Keep replies short (1–3 short paragraphs), warm, and on-brand. If the knowledge base does not cover a question, suggest contacting support via the Contact page.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    // Load knowledge base
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: kb } = await supabase
      .from("chatbot_knowledge")
      .select("entry_type, question, answer, doc_title, doc_content, category")
      .eq("is_active", true);

    let knowledgeBlock = "";
    if (kb && kb.length) {
      const qa = kb.filter((k: any) => k.entry_type === "qa")
        .map((k: any) => `Q: ${k.question}\nA: ${k.answer}`).join("\n\n");
      const docs = kb.filter((k: any) => k.entry_type === "doc")
        .map((k: any) => `### ${k.doc_title}\n${k.doc_content}`).join("\n\n");
      knowledgeBlock = `\n\n## Knowledge Base\n${qa}\n\n${docs}`.trim();
    }

    const systemPrompt = BASE_PROMPT + (knowledgeBlock ? `\n\n${knowledgeBlock}` : "");

    // Only accept plain user/assistant turns from the caller; the system prompt is server-owned.
    const history = (Array.isArray(messages) ? messages : [])
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
    if (!history.length || history[history.length - 1].role !== "user") {
      return new Response(JSON.stringify({ error: "A user message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await callOpenAI([{ role: "system", content: systemPrompt }, ...history]);
    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ reply: result.content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
