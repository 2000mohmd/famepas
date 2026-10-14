// Our own OpenAI account when OPENAI_API_KEY is set, otherwise the Lovable AI
// gateway (same OpenAI-compatible endpoint shape) on LOVABLE_API_KEY, which is
// always present in this project. Either model can be overridden by secret.
export const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
const GATEWAY_MODEL = Deno.env.get("LOVABLE_MODEL") || "google/gemini-2.5-flash";

export type ModelResult = { content: string; error?: undefined; status?: undefined } | { error: string; status: number; content?: undefined };

export const callOpenAI = async (messages: unknown[], jsonMode = false): Promise<ModelResult> => {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const gatewayKey = apiKey ? null : Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey && !gatewayKey) return { error: "No AI key configured (OPENAI_API_KEY or LOVABLE_API_KEY)", status: 500 };
  const url = apiKey ? "https://api.openai.com/v1/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey ?? gatewayKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: apiKey ? OPENAI_MODEL : GATEWAY_MODEL,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`AI error [${res.status}] via ${apiKey ? "openai" : "lovable gateway"}: ${text}`);
    if (res.status === 429) return { error: "Rate limit or quota reached on the AI account. Try again shortly.", status: 429 };
    if (res.status === 401 || res.status === 402) return { error: "The AI key is missing, invalid, or out of credit.", status: 500 };
    return { error: `AI request failed (${res.status})`, status: 502 };
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  // Gateway models sometimes wrap JSON in a ```json fence despite response_format.
  return { content: jsonMode ? content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "") : content };
};
