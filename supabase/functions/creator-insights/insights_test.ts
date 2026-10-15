// deno test supabase/functions/creator-insights/insights_test.ts
import { accountInsights, fetchMetric, parseInsight, redact, window28, MALFORMED, NO_ACCESS, NO_DATA, NOT_CONNECTED } from "./insights.ts";

const NOW = Date.parse("2026-10-16T12:00:00Z");
const TOKEN = "IGAAtest" + "x".repeat(40);
const eq = (a: unknown, b: unknown, what: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); };

// Fake Meta: per-metric JSON bodies, records every URL it was called with.
const fakeMeta = (bodies: Record<string, { status?: number; body: unknown }>) => {
  const urls: string[] = [];
  const fetchImpl = (url: string) => {
    urls.push(url);
    const metric = new URL(url).searchParams.get("metric")!;
    const r = bodies[metric] ?? { body: { data: [] } };
    return Promise.resolve(new Response(JSON.stringify(r.body), { status: r.status ?? 200 }));
  };
  return { fetchImpl, urls };
};

Deno.test("total_value response", async () => {
  const m = fakeMeta({
    reach: { body: { data: [{ name: "reach", period: "day", total_value: { value: 4200 } }] } },
    total_interactions: { body: { data: [{ name: "total_interactions", period: "day", total_value: { value: 310 } }] } },
  });
  eq(await accountInsights(m.fetchImpl, "123", TOKEN, NOW), { reach: 4200, total_interactions: 310, insights_available: true, insights_error: null }, "result");
  // Request shape: one metric per call, period=day, total_value, 28-day since/until, never days_28.
  eq(m.urls.length, 2, "one request per metric");
  const { since, until } = window28(NOW);
  for (const u of m.urls) {
    const q = new URL(u).searchParams;
    eq([q.get("period"), q.get("metric_type"), q.get("since"), q.get("until")], ["day", "total_value", String(since), String(until)], "query");
    if (u.includes("days_28")) throw new Error("days_28 must not be used");
  }
});

Deno.test("daily values[] response sums only inside the window", () => {
  const { since, until } = window28(NOW);
  const day = (offsetDays: number, value: number) => ({ value, end_time: new Date((until - offsetDays * 86400) * 1000).toISOString() });
  const body = { data: [{ name: "reach", values: [day(1, 10), day(5, 20), day(40, 999), day(-3, 999)] }] };
  eq(parseInsight(body, "reach", since, until), { value: 30, empty: false, malformed: false }, "sum");
});

Deno.test("empty data is not zero", async () => {
  const m = fakeMeta({ reach: { body: { data: [] } }, total_interactions: { body: { data: [] } } });
  eq(await accountInsights(m.fetchImpl, "123", TOKEN, NOW), { reach: null, total_interactions: null, insights_available: false, insights_error: NO_DATA }, "empty");
});

Deno.test("Meta permission error is not zero and gives a safe message", async () => {
  const err = { status: 400, body: { error: { code: 10, type: "OAuthException", message: "Application does not have permission for this action" } } };
  const m = fakeMeta({ reach: err, total_interactions: err });
  eq(await accountInsights(m.fetchImpl, "123", TOKEN, NOW), { reach: null, total_interactions: null, insights_available: false, insights_error: NO_ACCESS }, "denied");
});

Deno.test("unsupported request returns the sanitized Meta message", async () => {
  const m = fakeMeta({ reach: { status: 400, body: { error: { code: 100, message: `Unsupported request - method type: get access_token=${TOKEN}` } } } });
  const r = await fetchMetric(m.fetchImpl, "123", TOKEN, "reach", NOW);
  if (r.value !== null || !r.error?.startsWith("Instagram error: Unsupported request")) throw new Error(JSON.stringify(r));
  if (r.error.includes(TOKEN) || r.error.includes("IGAA")) throw new Error("token leaked into returned error");
});

Deno.test("one metric failing does not hide the other", async () => {
  const m = fakeMeta({
    reach: { body: { data: [{ name: "reach", total_value: { value: 77 } }] } },
    total_interactions: { status: 400, body: { error: { code: 100, message: "bad metric" } } },
  });
  eq(await accountInsights(m.fetchImpl, "123", TOKEN, NOW), { reach: 77, total_interactions: null, insights_available: true, insights_error: null }, "partial");
});

Deno.test("missing token makes no request", async () => {
  const m = fakeMeta({});
  eq(await fetchMetric(m.fetchImpl, "123", "", "reach", NOW), { value: null, error: NOT_CONNECTED, empty: false }, "no token");
  eq(m.urls.length, 0, "no request without a token");
});

Deno.test("malformed metric response", async () => {
  const m = fakeMeta({ reach: { body: { data: [{ name: "reach", total_value: { value: "lots" } }] } }, total_interactions: { body: { unexpected: true } } });
  const r = await accountInsights(m.fetchImpl, "123", TOKEN, NOW);
  eq([r.reach, r.total_interactions, r.insights_available, r.insights_error], [null, null, false, MALFORMED], "malformed");
});

Deno.test("logs never contain the token, OAuth code or request URL", async () => {
  const logged: string[] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => { logged.push(JSON.stringify(a)); };
  try {
    const m = fakeMeta({ reach: { status: 400, body: { error: { code: 100, message: `bad https://graph.instagram.com/v21.0/1/insights?access_token=${TOKEN}&code=AQDsecretcode` } } } });
    await fetchMetric(m.fetchImpl, "123", TOKEN, "reach", NOW);
    await fetchMetric(() => Promise.reject(new Error(`network down for access_token=${TOKEN}`)), "123", TOKEN, "reach", NOW);
  } finally { console.error = orig; }
  const all = logged.join("\n");
  if (!logged.length) throw new Error("expected log lines");
  for (const secret of [TOKEN, "AQDsecretcode", "graph.instagram.com"]) if (all.includes(secret)) throw new Error(`leaked: ${secret}`);
  eq(redact(`code=abc&access_token=${TOKEN}`), "code=[redacted]&access_token=[redacted]", "redact");
});
