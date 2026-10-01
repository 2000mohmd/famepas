// Direct calls to our own OpenAI account (not the Lovable AI gateway).
// Model can be overridden with the OPENAI_MODEL secret without a code change.
export const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";

export type ModelResult = { content: string; error?: undefined; status?: undefined } | { error: string; status: number; content?: undefined };

export const callOpenAI = async (messages: unknown[], jsonMode = false): Promise<ModelResult> => {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return { error: "OPENAI_API_KEY not configured", status: 500 };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`OpenAI error [${res.status}]: ${text}`);
    if (res.status === 429) return { error: "Rate limit or quota reached on the OpenAI account. Try again shortly.", status: 429 };
    if (res.status === 401) return { error: "The OpenAI key is missing or invalid.", status: 500 };
    return { error: `AI request failed (${res.status})`, status: 502 };
  }
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content ?? "" };
};
