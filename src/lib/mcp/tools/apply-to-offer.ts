import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "apply_to_offer",
  title: "Apply to an offer",
  description:
    "Apply the signed-in influencer to a FamePass offer. Creates a pending redemption the venue can approve.",
  inputSchema: {
    offer_id: z.string().uuid().describe("The offer to apply to."),
    preferred_date: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Preferred visit date, ISO format (YYYY-MM-DD)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ offer_id, preferred_date }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: existing } = await supabase
      .from("offer_redemptions")
      .select("id, status")
      .eq("offer_id", offer_id)
      .eq("influencer_id", userId!)
      .maybeSingle();

    if (existing) {
      return {
        content: [{ type: "text", text: `Already applied. Current status: ${existing.status}.` }],
        structuredContent: { redemption: existing, already_applied: true },
      };
    }

    const { data, error } = await supabase
      .from("offer_redemptions")
      .insert({ offer_id, influencer_id: userId!, preferred_date: preferred_date ?? null, status: "pending" })
      .select()
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: `Applied. Redemption ${data?.id} is pending venue approval.` }],
      structuredContent: { redemption: data },
    };
  },
});
