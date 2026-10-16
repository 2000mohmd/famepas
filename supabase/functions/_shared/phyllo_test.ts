// deno test --allow-env supabase/functions/_shared/phyllo_test.ts
import { parsePost, parseProfile, phyllo, platformOf, postKey, sum28 } from "./phyllo.ts";

const eq = (a: unknown, b: unknown, what: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); };
const NOW = Date.parse("2026-10-16T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86400_000).toISOString();

Deno.test("profile: list response, reputation counts, @ stripped", () => {
  eq(parseProfile({ data: [{ platform_username: "@rafca", full_name: "Rafca", image_url: "https://x/p.jpg", reputation: { follower_count: 5400, following_count: 300, content_count: 120 } }] }),
    { handle: "rafca", full_name: "Rafca", image_url: "https://x/p.jpg", followers: 5400, following: 300, content_count: 120 }, "profile");
});

Deno.test("profile: missing fields are null, never 0; empty list is null", () => {
  eq(parseProfile({ data: [{ username: "x" }] }), { handle: "x", full_name: null, image_url: null, followers: null, following: null, content_count: null }, "sparse");
  eq(parseProfile({ data: [] }), null, "empty");
});

Deno.test("post: engagement mapped, unknowns null", () => {
  eq(parsePost({ id: "c1", url: "https://www.instagram.com/p/ABC123/", published_at: daysAgo(1), engagement: { like_count: 10, comment_count: 2, reach_organic_count: 900, save_count: null } }),
    { id: "c1", url: "https://www.instagram.com/p/ABC123/", published_at: daysAgo(1), thumbnail_url: null, likes: 10, comments: 2, views: null, reach: 900, impressions: null, saves: null, shares: null }, "post");
});

Deno.test("28-day totals use only posts in the window and stay null when unknown", () => {
  const posts = [
    parsePost({ published_at: daysAgo(2), engagement: { reach_organic_count: 100, like_count: 5, comment_count: 1 } }),
    parsePost({ published_at: daysAgo(20), engagement: { reach_organic_count: 50, save_count: 2 } }),
    parsePost({ published_at: daysAgo(40), engagement: { reach_organic_count: 999, like_count: 999 } }),
  ];
  eq(sum28(posts, NOW), { posts: 2, reach: 150, total_interactions: 8 }, "window");
  eq(sum28([parsePost({ published_at: daysAgo(1), engagement: {} })], NOW), { posts: 1, reach: null, total_interactions: null }, "unknown");
  eq(sum28([], NOW), { posts: 0, reach: null, total_interactions: null }, "none");
});

Deno.test("post keys and platforms", () => {
  eq(postKey("https://www.instagram.com/reel/Cx9_ab-1/?igsh=1"), "Cx9_ab-1", "ig reel");
  eq(postKey("https://www.tiktok.com/@a/video/7351234567890"), "7351234567890", "tiktok");
  eq(postKey("https://example.com"), null, "other");
  eq([platformOf("Instagram"), platformOf("TikTok"), platformOf("YouTube")], ["instagram", "tiktok", null], "platforms");
});

Deno.test("missing credentials: no request, clear error", async () => {
  Deno.env.delete("PHYLLO_CLIENT_ID"); Deno.env.delete("PHYLLO_CLIENT_SECRET");
  let called = false;
  const r = await phyllo("/v1/users", {}, (() => { called = true; return Promise.resolve(new Response("{}")); }) as typeof fetch);
  if (r.ok || called) throw new Error("should fail without credentials and not call Phyllo");
});

Deno.test("error responses and logs never include the client secret", async () => {
  Deno.env.set("PHYLLO_CLIENT_ID", "cid"); Deno.env.set("PHYLLO_CLIENT_SECRET", "TOP-SECRET-VALUE");
  const logged: string[] = []; const orig = console.error;
  console.error = (...a: unknown[]) => { logged.push(JSON.stringify(a)); };
  let auth = "";
  try {
    const r = await phyllo("/v1/users?x=1", {}, ((_u: string, init: RequestInit) => {
      auth = (init.headers as Record<string, string>).Authorization;
      return Promise.resolve(new Response(JSON.stringify({ error: { message: "invalid credentials" } }), { status: 401 }));
    }) as unknown as typeof fetch);
    if (r.ok || r.error !== "invalid credentials") throw new Error(JSON.stringify(r));
  } finally { console.error = orig; Deno.env.delete("PHYLLO_CLIENT_ID"); Deno.env.delete("PHYLLO_CLIENT_SECRET"); }
  if (auth !== `Basic ${btoa("cid:TOP-SECRET-VALUE")}`) throw new Error("basic auth header wrong");
  const all = logged.join("\n");
  if (all.includes("TOP-SECRET-VALUE") || all.includes(btoa("cid:TOP-SECRET-VALUE")) || all.includes("x=1")) throw new Error("secret or query leaked into logs");
});
