// Verify influencer handles and pull real follower counts.
// Instagram: RapidAPI providers with a public web-profile fallback.
// TikTok: RapidAPI with a public web fallback.
// Optional secret: RAPIDAPI_KEY
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY") ?? "";
const RAPIDAPI_KEY_STABLE = Deno.env.get("RAPIDAPI_KEY_STABLE") ?? RAPIDAPI_KEY;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clean = (h: string) => (h || "").trim().replace(/^@+/, "");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type Profile = {
  exists: true;
  followers: number;
  full_name: string | null;
  is_verified: boolean;
};

type Lookup =
  | { status: "found"; profile: Profile }
  | { status: "not_found" }
  | { status: "unavailable"; reason: string };

async function fetchInstagram(handle: string, diag: string[]): Promise<Lookup> {
  const rapidHosts = [
    "instagram-scraper-api2.p.rapidapi.com",
    "social-api4.p.rapidapi.com",
    "instagram-social-api.p.rapidapi.com",
  ];

  if (RAPIDAPI_KEY) {
    for (const host of rapidHosts) {
      try {
        const res = await fetch(
          `https://${host}/v1/info?username_or_id_or_url=${encodeURIComponent(handle)}`,
          { headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": host } },
        );
        const text = await res.text();
        if (!res.ok) {
          diag.push(`ig:${host} ${res.status} ${text.slice(0, 120)}`);
          continue;
        }
        let json: any = null;
        try { json = JSON.parse(text); } catch { /* ignore */ }
        const d = json?.data;
        if (d && (d.follower_count != null || d.followers != null || d.username)) {
          return {
            status: "found",
            profile: {
              exists: true,
              followers: Number(d.follower_count ?? d.followers ?? 0),
              full_name: d.full_name ?? null,
              is_verified: !!d.is_verified,
            },
          };
        }
        diag.push(`ig:${host} 200 no-data ${text.slice(0, 120)}`);
      } catch (e) {
        diag.push(`ig:${host} threw ${String(e).slice(0, 100)}`);
      }
    }
  } else {
    diag.push("ig: no RAPIDAPI_KEY");
  }

  // Public fallback — Instagram's own web profile endpoint (no key needed).
  try {
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
      {
        headers: {
          "x-ig-app-id": "936619743392459",
          "user-agent": UA,
          accept: "*/*",
        },
      },
    );
    const text = await res.text();
    if (res.ok) {
      const u = JSON.parse(text)?.data?.user;
      if (u) {
        return {
          status: "found",
          profile: {
            exists: true,
            followers: Number(u.edge_followed_by?.count ?? 0),
            full_name: u.full_name ?? null,
            is_verified: !!u.is_verified,
          },
        };
      }
      diag.push("ig:web 200 no-user");
      return { status: "not_found" };
    }
    if (res.status === 404) {
      diag.push("ig:web 404");
      return { status: "not_found" };
    }
    diag.push(`ig:web ${res.status} ${text.slice(0, 120)}`);
  } catch (e) {
    diag.push(`ig:web threw ${String(e).slice(0, 100)}`);
  }

  return { status: "unavailable", reason: diag.join(" | ") };
}

async function fetchTikTok(handle: string, diag: string[]): Promise<Lookup> {
  if (RAPIDAPI_KEY) {
    try {
      const res = await fetch(
        `https://tiktok-scraper7.p.rapidapi.com/user/info?unique_id=${encodeURIComponent(handle)}`,
        {
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "tiktok-scraper7.p.rapidapi.com",
          },
        },
      );
      const text = await res.text();
      if (res.ok) {
        let json: any = null;
        try { json = JSON.parse(text); } catch { /* ignore */ }
        const s = json?.data?.stats;
        if (s) {
          return {
            status: "found",
            profile: {
              exists: true,
              followers: Number(s.followerCount ?? 0),
              full_name: json?.data?.user?.nickname ?? null,
              is_verified: !!json?.data?.user?.verified,
            },
          };
        }
        diag.push(`tt:rapid 200 no-data ${text.slice(0, 120)}`);
      } else {
        diag.push(`tt:rapid ${res.status} ${text.slice(0, 120)}`);
      }
    } catch (e) {
      diag.push(`tt:rapid threw ${String(e).slice(0, 100)}`);
    }
  } else {
    diag.push("tt: no RAPIDAPI_KEY");
  }

  // Public fallback — parse the profile page for follower count.
  try {
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(handle)}`, {
      headers: { "user-agent": UA, accept: "text/html" },
    });
    const html = await res.text();
    if (res.status === 404) return { status: "not_found" };
    if (res.ok) {
      const m = html.match(/"followerCount":(\d+)/);
      const nameMatch = html.match(/"nickname":"([^"]*)"/);
      if (m) {
        return {
          status: "found",
          profile: {
            exists: true,
            followers: Number(m[1]),
            full_name: nameMatch?.[1] ?? null,
            is_verified: /"verified":true/.test(html),
          },
        };
      }
      if (/couldn't find this account|Page Not Found/i.test(html)) return { status: "not_found" };
      diag.push("tt:web 200 no-count");
    } else {
      diag.push(`tt:web ${res.status}`);
    }
  } catch (e) {
    diag.push(`tt:web threw ${String(e).slice(0, 100)}`);
  }

  return { status: "unavailable", reason: diag.join(" | ") };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    // Auth is OPTIONAL: when present, persist updates on the profile.
    let userId: string | null = null;
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }

    const body = await req.json().catch(() => ({}));
    const ig = body.instagram_handle ? clean(body.instagram_handle) : null;
    const tt = body.tiktok_handle ? clean(body.tiktok_handle) : null;
    const selfReported = Number(body.self_reported_followers) || 0;

    const diag: string[] = [];
    const result: Record<string, any> = {};
    let realTotal = 0;

    if (ig) {
      const r = await fetchInstagram(ig, diag);
      if (r.status === "found") {
        result.instagram = { ...r.profile, status: "found" };
        realTotal += r.profile.followers;
      } else if (r.status === "not_found") {
        result.instagram = { exists: false, followers: 0, status: "not_found" };
      } else {
        result.instagram = { exists: null, followers: 0, status: "unavailable", reason: r.reason };
      }
    }
    if (tt) {
      const r = await fetchTikTok(tt, diag);
      if (r.status === "found") {
        result.tiktok = { ...r.profile, status: "found" };
        realTotal += r.profile.followers;
      } else if (r.status === "not_found") {
        result.tiktok = { exists: false, followers: 0, status: "not_found" };
      } else {
        result.tiktok = { exists: null, followers: 0, status: "unavailable", reason: r.reason };
      }
    }

    const updates: Record<string, any> = {};
    if (result.instagram?.followers) {
      updates.followers_count = result.instagram.followers;
    } else if (result.tiktok?.followers) {
      updates.followers_count = result.tiktok.followers;
      updates.tiktok_followers = result.tiktok.followers;
    }
    if (result.tiktok?.followers) updates.tiktok_followers = result.tiktok.followers;
    if (ig) {
      updates.instagram_verified =
        result.instagram?.status === "found" ? true
          : result.instagram?.status === "not_found" ? false
            : null;
    }

    const flagged =
      realTotal > 0 &&
      selfReported > 0 &&
      (selfReported > realTotal * 2 || selfReported * 2 < realTotal);

    if (userId && Object.keys(updates).length) {
      const { error: updErr } = await supabase.from("profiles").update(updates).eq("user_id", userId);
      if (updErr) console.warn("profile update failed:", updErr.message);
    }

    if (diag.length) console.log("fetch-profile-stats diag:", diag.join(" | "));

    return new Response(
      JSON.stringify({
        ok: true,
        verified: result,
        followers_total: realTotal,
        flagged,
        applied: userId ? updates : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
