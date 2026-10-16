// Phyllo (getphyllo.com): one API for creators' Instagram / TikTok data, used
// instead of our own Meta / TikTok apps. Phyllo holds the platform approvals;
// creators connect through Phyllo Connect (browser SDK) and we read their
// profile and posts here, server-side only.
//
// Secrets (Lovable -> Cloud -> Secrets):
//   PHYLLO_CLIENT_ID, PHYLLO_CLIENT_SECRET
//   PHYLLO_ENVIRONMENT = sandbox | staging | production   (default sandbox)
//
// A Phyllo connection is stored as a normal social_integrations row with
// scope = 'phyllo', open_id = Phyllo account id, access_token = NULL.
// Never log or return the client secret or the Authorization header.

export type PhylloEnv = "sandbox" | "staging" | "production";
export const PHYLLO_SCOPE = "phyllo";

export const phylloEnv = (): PhylloEnv => {
  const v = (Deno.env.get("PHYLLO_ENVIRONMENT") ?? "sandbox").toLowerCase();
  return v === "production" || v === "staging" ? v : "sandbox";
};
export const phylloBaseUrl = (env: PhylloEnv = phylloEnv()) =>
  env === "production" ? "https://api.getphyllo.com" : `https://api.${env}.getphyllo.com`;

export type PhylloResult<T = any> = { ok: true; status: number; body: T } | { ok: false; status: number; error: string };

/** Authenticated call to Phyllo. Errors come back as a short, safe message. */
export async function phyllo<T = any>(path: string, init: { method?: string; body?: unknown } = {}, fetchImpl: typeof fetch = fetch): Promise<PhylloResult<T>> {
  const id = Deno.env.get("PHYLLO_CLIENT_ID") ?? "";
  const secret = Deno.env.get("PHYLLO_CLIENT_SECRET") ?? "";
  if (!id || !secret) return { ok: false, status: 503, error: "Phyllo isn't configured (missing PHYLLO_CLIENT_ID / PHYLLO_CLIENT_SECRET)." };
  let res: Response;
  try {
    res = await fetchImpl(`${phylloBaseUrl()}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/json" },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
  } catch (e) {
    console.error("phyllo: request failed", { path: path.split("?")[0], error: String((e as Error)?.message ?? e).slice(0, 200) });
    return { ok: false, status: 0, error: "Couldn't reach Phyllo." };
  }
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!res.ok) {
    const msg = String(body?.error?.message ?? body?.message ?? body?.error?.code ?? `Phyllo error ${res.status}`).slice(0, 200);
    console.error("phyllo: error response", { path: path.split("?")[0], status: res.status, message: msg });
    return { ok: false, status: res.status, error: msg };
  }
  return { ok: true, status: res.status, body };
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const first = (body: any) => (Array.isArray(body?.data) ? body.data[0] : body) ?? null;

/** Which FamePass platform a Phyllo work platform is (only the two we support). */
export const platformOf = (workPlatformName: unknown): "instagram" | "tiktok" | null => {
  const n = String(workPlatformName ?? "").toLowerCase();
  return n.includes("instagram") ? "instagram" : n.includes("tiktok") ? "tiktok" : null;
};

export type PhylloProfile = { handle: string | null; full_name: string | null; image_url: string | null; followers: number | null; following: number | null; content_count: number | null };

/** Normalize a /v1/profiles item (or list response). */
export function parseProfile(body: any): PhylloProfile | null {
  const p = first(body);
  if (!p || typeof p !== "object") return null;
  const rep = p.reputation ?? {};
  return {
    handle: (p.platform_username ?? p.username ?? null) && String(p.platform_username ?? p.username).replace(/^@+/, ""),
    full_name: p.full_name ?? null,
    image_url: p.image_url ?? null,
    followers: num(rep.follower_count) ?? num(rep.subscriber_count),
    following: num(rep.following_count),
    content_count: num(rep.content_count),
  };
}

export type PhylloPost = {
  id: string | null; url: string | null; published_at: string | null; thumbnail_url: string | null;
  likes: number | null; comments: number | null; views: number | null; reach: number | null;
  impressions: number | null; saves: number | null; shares: number | null;
};

/** Normalize a /v1/social/contents item. */
export function parsePost(c: any): PhylloPost {
  const e = c?.engagement ?? {};
  return {
    id: c?.id ?? null, url: c?.url ?? null, published_at: c?.published_at ?? null,
    thumbnail_url: c?.thumbnail_url ?? c?.media_url ?? null,
    likes: num(e.like_count), comments: num(e.comment_count), views: num(e.view_count),
    reach: num(e.reach_organic_count), impressions: num(e.impression_organic_count),
    saves: num(e.save_count), shares: num(e.share_count),
  };
}

/** The stable id inside an Instagram / TikTok post URL, for matching. */
export const postKey = (url: string | null | undefined): string | null =>
  url?.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? url?.match(/\/video\/(\d+)/)?.[1] ?? null;

/**
 * 28-day totals from the creator's posts in the window. Phyllo has no
 * account-level 28-day reach, so this is reach and interactions summed over
 * posts published in the last 28 days. null (not 0) when nothing is known.
 */
export function sum28(posts: PhylloPost[], nowMs: number) {
  const since = nowMs - 28 * 86400_000;
  const recent = posts.filter((p) => { const t = Date.parse(p.published_at ?? ""); return Number.isFinite(t) && t >= since && t <= nowMs; });
  const add = (vals: (number | null)[]) => { const known = vals.filter((v): v is number => v !== null); return known.length ? known.reduce((a, b) => a + b, 0) : null; };
  return {
    posts: recent.length,
    reach: add(recent.map((p) => p.reach)),
    total_interactions: add(recent.map((p) => {
      const parts = [p.likes, p.comments, p.saves, p.shares].filter((v): v is number => v !== null);
      return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
    })),
  };
}

// ---- API helpers -----------------------------------------------------------

/**
 * The creator's Phyllo user, created on first use (external_id = our auth user id).
 * Callers pass the id saved on profiles.phyllo_user_id and save the result, so a
 * reconnect never depends on Phyllo's lookup-by-external-id endpoint.
 */
export async function getOrCreateUser(externalId: string, name: string, storedId?: string | null): Promise<PhylloResult<{ id: string }>> {
  if (storedId) return { ok: true, status: 200, body: { id: storedId } };
  const found = await phyllo(`/v1/users/external_id/${encodeURIComponent(externalId)}`);
  if (found.ok && found.body?.id) return { ok: true, status: 200, body: { id: found.body.id } };
  if (!found.ok && found.status !== 404) return found;
  const created = await phyllo("/v1/users", { method: "POST", body: { name: name || "FamePass creator", external_id: externalId } });
  if (!created.ok) return created;
  return created.body?.id ? { ok: true, status: 200, body: { id: created.body.id } } : { ok: false, status: 502, error: "Phyllo didn't return a user id." };
}

export async function createSdkToken(userId: string) {
  return phyllo<{ sdk_token: string; expires_at?: string }>("/v1/sdk-tokens", { method: "POST", body: { user_id: userId, products: ["IDENTITY", "ENGAGEMENT"] } });
}

/** Phyllo's ids for Instagram and TikTok, looked up by name (they differ per environment). */
export async function workPlatformIds(): Promise<{ instagram: string | null; tiktok: string | null }> {
  const r = await phyllo("/v1/work-platforms?limit=100");
  const list: any[] = r.ok && Array.isArray(r.body?.data) ? r.body.data : [];
  const find = (p: "instagram" | "tiktok") => list.find((w) => platformOf(w?.name) === p)?.id ?? null;
  return { instagram: find("instagram"), tiktok: find("tiktok") };
}

export const getAccount = (accountId: string) => phyllo(`/v1/accounts/${encodeURIComponent(accountId)}`);

export async function getProfile(accountId: string): Promise<PhylloProfile | null> {
  const r = await phyllo(`/v1/profiles?account_id=${encodeURIComponent(accountId)}`);
  return r.ok ? parseProfile(r.body) : null;
}

/** Recent posts (newest first), up to `pages` x 100. */
export async function listPosts(accountId: string, sinceMs: number, pages = 3): Promise<PhylloResult<PhylloPost[]>> {
  const from = new Date(sinceMs).toISOString().slice(0, 10);
  const out: PhylloPost[] = [];
  for (let page = 0; page < pages; page++) {
    const r = await phyllo(`/v1/social/contents?account_id=${encodeURIComponent(accountId)}&from_date=${from}&limit=100&offset=${page * 100}`);
    if (!r.ok) return page === 0 ? r : { ok: true, status: 200, body: out };
    const rows: any[] = Array.isArray(r.body?.data) ? r.body.data : [];
    out.push(...rows.map(parsePost));
    if (rows.length < 100) break;
  }
  return { ok: true, status: 200, body: out };
}

export const NO_PHYLLO_DATA = "No posts from the last 28 days yet, so there are no 28-day totals.";
