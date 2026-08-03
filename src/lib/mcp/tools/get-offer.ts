import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_offer",
  title: "Get offer",
  description: "Get the full details of a single FamePass offer, including the venue that published it.",
  inputSchema: { offer_id: z.string().uuid().describe("The offer id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ offer_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("offers")
      .select(
        "*, venues(id, name, city, country, category, description, logo_url, cover_image_url), categories(id, name)",
      )
      .eq("id", offer_id)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Offer not found." }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { offer: data },
    };
  },
});
