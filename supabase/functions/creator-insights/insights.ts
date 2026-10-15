// Instagram account insights (reach, total_interactions) for the last 28 days.
// https://developers.facebook.com/documentation/instagram-platform/api-reference/instagram-user/insights
//
// Meta documents these as period=day + metric_type=total_value over an explicit
// since/until window (max 30 days); without the window they cover only the last
// 24h. Each metric is its own request so one incompatible metric can't sink the
// other. A failure is never reported as 0: values are null plus a reason.
//
// Nothing here may log or return a token, OAuth code or full request URL.

export const METRICS = ["reach", "total_interactions"] as const;
export type Metric = typeof METRICS[number];
type FetchLike = (url: string) => Promise<Response>;

export type MetricResult = { value: number | null; error: string | null; empty: boolean };
export type AccountInsights = {
  reach: number | null;
  total_interactions: number | null;
  insights_available: boolean;
  insights_error: string | null;
};

export const NO_DATA = "No Instagram insights are available for this period yet.";
export const NO_ACCESS = "Instagram Insights access isn't available for this account yet.";
export const EXPIRED = "The Instagram connection has expired. Reconnect Instagram.";
export const NOT_CONNECTED = "Instagram isn't connected.";
export const MALFORMED = "Instagram returned an unexpected insights response.";

/** Strip anything token-shaped from text before it is logged or returned. */
export const redact = (s: string) =>
  s.replace(/\b(access_token|client_secret|code|token|signed_request)=[^&\s"']+/gi, "$1=[redacted]")
    .replace(/\b(IG|EAA)[A-Za-z0-9_-]{20,}/g, "[redacted]")
    .replace(/https?:\/\/[^\s"']*graph\.instagram\.com[^\s"']*/gi, "[instagram api]");

export const window28 = (nowMs: number) => {
  const until = Math.floor(nowMs / 1000);
  return { since: until - 28 * 86400, until };
};

/** Meta error -> short, safe message for the UI. */
export function classifyMetaError(status: number, err: { code?: number; message?: string } | undefined): string {
  const code = Number(err?.code);
  const msg = String(err?.message ?? "");
  if (code === 190) return EXPIRED;
  if (code === 10 || (code >= 200 && code <= 299) || /permission|not authorized|not have access|insufficient/i.test(msg)) return NO_ACCESS;
  const clean = redact(msg).slice(0, 200).trim();
  return clean ? `Instagram error: ${clean}` : `Instagram returned an error (${status}).`;
}

/** Read one metric from a Meta insights body: total_value, or daily values[] summed inside the window. */
export function parseInsight(body: any, metric: Metric, since: number, until: number): { value: number | null; empty: boolean; malformed: boolean } {
  if (!body || !Array.isArray(body.data)) return { value: null, empty: false, malformed: true };
  const entry = body.data.find((d: any) => d?.name === metric) ?? (body.data.length === 1 ? body.data[0] : undefined);
  if (!entry) return { value: null, empty: true, malformed: false };
  const total = entry.total_value?.value;
  if (typeof total === "number" && Number.isFinite(total)) return { value: total, empty: false, malformed: false };
  if (Array.isArray(entry.values)) {
    let sum = 0, seen = 0;
    for (const v of entry.values) {
      const t = Date.parse(v?.end_time ?? "") / 1000;
      if (typeof v?.value !== "number" || !Number.isFinite(v.value) || !Number.isFinite(t)) continue;
      if (t < since || t > until) continue;
      sum += v.value; seen++;
    }
    return seen ? { value: sum, empty: false, malformed: false } : { value: null, empty: true, malformed: false };
  }
  return { value: null, empty: false, malformed: true };
}

export async function fetchMetric(fetchImpl: FetchLike, igId: string, token: string, metric: Metric, nowMs: number): Promise<MetricResult> {
  if (!token) return { value: null, error: NOT_CONNECTED, empty: false };
  const { since, until } = window28(nowMs);
  const params = new URLSearchParams({
    metric, period: "day", metric_type: "total_value", since: String(since), until: String(until), access_token: token,
  });
  let res: Response;
  try {
    res = await fetchImpl(`https://graph.instagram.com/v21.0/${encodeURIComponent(igId)}/insights?${params}`);
  } catch (e) {
    console.error("creator-insights: request failed", { phase: "insights", metric, error: redact(String((e as Error)?.message ?? e)) });
    return { value: null, error: "Couldn't reach Instagram.", empty: false };
  }
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* handled below */ }
  if (!res.ok || body?.error) {
    console.error("creator-insights: insights refused", { phase: "insights", metric, status: res.status, error_code: body?.error?.code ?? null, error_message: redact(String(body?.error?.message ?? "")) });
    return { value: null, error: classifyMetaError(res.status, body?.error), empty: false };
  }
  const parsed = parseInsight(body, metric, since, until);
  if (parsed.malformed) {
    console.error("creator-insights: malformed insights body", { phase: "insights", metric, status: res.status });
    return { value: null, error: MALFORMED, empty: false };
  }
  return { value: parsed.value, error: null, empty: parsed.empty };
}

export async function accountInsights(fetchImpl: FetchLike, igId: string, token: string, nowMs = Date.now()): Promise<AccountInsights> {
  const [reach, total_interactions] = await Promise.all(METRICS.map((m) => fetchMetric(fetchImpl, igId, token, m, nowMs)));
  const available = reach.value !== null || total_interactions.value !== null;
  const firstError = reach.error ?? total_interactions.error;
  return {
    reach: reach.value,
    total_interactions: total_interactions.value,
    insights_available: available,
    insights_error: available ? null : (firstError ?? NO_DATA),
  };
}
