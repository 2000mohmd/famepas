import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brief_id } = await req.json();
    if (!brief_id) throw new Error("brief_id required");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: brief, error: be } = await supabase
      .from("venue_briefs").select("*").eq("id", brief_id).single();
    if (be || !brief) throw new Error("Brief not found");

    // DB-side hard filters
    let q = supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, bio, niche, followers_count, tiktok_followers, engagement_rate, influencer_score, city, country, instagram_handle, tiktok_handle, is_verified, badge")
      .eq("approval_status", "approved")
      .eq("is_suspended", false);

    if (brief.min_followers) q = q.gte("followers_count", brief.min_followers);
    if (brief.max_followers) q = q.lte("followers_count", brief.max_followers);
    if (brief.city) q = q.ilike("city", `%${brief.city}%`);

    const { data: candidates } = await q.limit(60);
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter influencer role
    const ids = candidates.map((c: any) => c.user_id);
    const { data: roles } = await supabase.from("user_roles").select("user_id").in("user_id", ids).eq("role", "influencer");
    const okIds = new Set((roles ?? []).map((r: any) => r.user_id));
    const filtered = candidates.filter((c: any) => okIds.has(c.user_id));

    // Niche overlap pre-score (helps AI)
    const briefNiches = (brief.niches ?? []).map((n: string) => n.toLowerCase());
    const enriched = filtered.map((c: any) => {
      const cniches = (c.niche ?? []).map((n: string) => String(n).toLowerCase());
      const overlap = briefNiches.length ? cniches.filter((n: string) => briefNiches.includes(n)).length : 0;
      return { ...c, _overlap: overlap };
    }).sort((a, b) => (b._overlap - a._overlap) || ((b.influencer_score ?? 0) - (a.influencer_score ?? 0)))
      .slice(0, 25);

    // Ask AI to rank
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a matching engine for an influencer marketplace. Given a venue brief and a candidate list, return the best-fit influencers with a score 0-100 and a one-sentence reasoning. Respond ONLY via the rank_influencers tool.",
          },
          {
            role: "user",
            content: `BRIEF:\nTitle: ${brief.title}\nDescription: ${brief.description}\nCategory: ${brief.category ?? "-"}\nCity: ${brief.city ?? "-"}\nNiches: ${(brief.niches ?? []).join(", ") || "-"}\nMin followers: ${brief.min_followers ?? 0}\nBudget: $${brief.budget ?? 0}\nDeliverables: ${brief.deliverables ?? "-"}\n\nCANDIDATES:\n${enriched.map((c, i) => `${i + 1}. id=${c.user_id} | ${c.full_name} | ${c.followers_count ?? 0} followers | niche:[${(c.niche ?? []).join(",")}] | city:${c.city ?? "-"} | score:${c.influencer_score ?? 0} | bio:${(c.bio ?? "").slice(0, 120)}`).join("\n")}\n\nReturn up to 10 best matches.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "rank_influencers",
            description: "Return ranked influencer matches",
            parameters: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      influencer_id: { type: "string" },
                      score: { type: "integer", minimum: 0, maximum: 100 },
                      reasoning: { type: "string" },
                    },
                    required: ["influencer_id", "score", "reasoning"],
                  },
                },
              },
              required: ["matches"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "rank_influencers" } },
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) throw new Error(`AI error ${aiRes.status}`);

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { matches: [] };
    const matches: { influencer_id: string; score: number; reasoning: string }[] = args.matches ?? [];

    // Persist matches
    await supabase.from("brief_matches").delete().eq("brief_id", brief_id);
    if (matches.length) {
      await supabase.from("brief_matches").insert(
        matches.map((m) => ({ brief_id, influencer_id: m.influencer_id, score: m.score, reasoning: m.reasoning }))
      );
    }
    await supabase.from("venue_briefs").update({ status: "matched" }).eq("id", brief_id);

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
