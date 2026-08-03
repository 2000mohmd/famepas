import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description:
    "Get the signed-in user's FamePass profile (name, handles, followers, score) and the venues they own, if any.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input: Record<string, never>, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const [{ data: profile, error }, { data: venues }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, bio, city, country, avatar_url, instagram_handle, tiktok_handle, followers_count, tiktok_followers, engagement_rate, influencer_score, badge, niche, approval_status")
        .eq("user_id", userId!)
        .maybeSingle(),
      supabase.from("venues").select("id, name, city, category, approval_status, is_active").eq("owner_id", userId!),
    ]);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const result = { profile: profile ?? null, venues: venues ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
