import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Leads sent as context are capped and trimmed — the whole pipeline in one
 *  prompt is both expensive and worse at answering than a focused slice. */
const MAX_CONTEXT_LEADS = 300;

const callModel = async (apiKey: string, messages: unknown[], jsonMode = false) => {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (res.status === 429) return { error: "Rate limit reached. Try again shortly.", status: 429 };
  if (res.status === 402) return { error: "AI credits exhausted.", status: 402 };
  if (!res.ok) return { error: `AI request failed (${res.status})`, status: 502 };
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content ?? "" };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Everything below runs as the caller, never as the service role, so a
    // rep's questions can only ever reach their own leads — the same rows
    // RLS would hand them in the UI.
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const { data: roles } = await caller.from("user_roles").select("role").eq("user_id", user.id);
    const isSales = (roles ?? []).some((r: { role: string }) =>
      ["sales_rep", "sales_manager", "admin"].includes(r.role));
    if (!isSales) return json({ error: "Sales access required" }, 403);

    const { action, notes, question } = await req.json();

    if (action === "extract_tasks") {
      if (!notes?.trim()) return json({ error: "No notes given" }, 400);
      const today = new Date().toISOString().slice(0, 10);
      const result = await callModel(apiKey, [
        {
          role: "system",
          content:
            "You pull follow-up actions out of a sales rep's meeting notes for a venue-partnership pipeline in Lebanon. " +
            `Today is ${today}. Reply with JSON only: ` +
            '{"next_action": string, "next_action_date": "YYYY-MM-DD", "summary": string, "suggested_stage": string|null}. ' +
            "next_action is one short imperative line. next_action_date is when the rep should act, inferred from the notes " +
            "(\"next week\" means 7 days out); if the notes give no timing, use 3 days from today. " +
            "summary is one sentence for the activity log. " +
            "suggested_stage is one of new, contacted, meeting_booked, meeting_done, signed_up, lost — or null if the notes don't make it clear. " +
            "Never invent commitments that are not in the notes.",
        },
        { role: "user", content: notes },
      ], true);
      if (result.error) return json({ error: result.error }, result.status);
      try {
        return json(JSON.parse(result.content));
      } catch {
        return json({ error: "Could not read the model's reply" }, 502);
      }
    }

    if (action === "ask") {
      if (!question?.trim()) return json({ error: "No question given" }, 400);
      const { data: leads } = await caller
        .from("leads")
        .select("venue_name, contact_name, category, area, city, stage, source, next_action, next_action_date, lost_reason, created_at, stage_changed_at")
        .limit(MAX_CONTEXT_LEADS);

      const result = await callModel(apiKey, [
        {
          role: "system",
          content:
            "You answer questions about a venue-sales pipeline using only the JSON rows provided. " +
            `Today is ${new Date().toISOString().slice(0, 10)}. ` +
            "Be short and concrete, lead with the number asked for, and name the venues when there are only a few. " +
            "If the rows do not contain the answer, say so plainly rather than guessing. " +
            "These rows are already limited to what this user is allowed to see; never claim to know about anything else.",
        },
        { role: "user", content: `Question: ${question}\n\nLeads:\n${JSON.stringify(leads ?? [])}` },
      ]);
      if (result.error) return json({ error: result.error }, result.status);
      return json({ answer: result.content, rows_considered: (leads ?? []).length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
