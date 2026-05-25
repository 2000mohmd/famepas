import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway error: ${res.status} ${text}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
