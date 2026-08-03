import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_offers",
  title: "List offers",
  description:
    "List active FamePass venue offers/campaigns, optionally filtered by city, offer type, or a text search on the title.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Text to match in the offer title."),
    city: z.string().trim().min(1).optional().describe("Filter by venue city."),
    offer_type: z.string().trim().min(1).optional().describe("Filter by offer type."),
    limit: z.number().int().min(1).max(50).default(20).describe("Max offers to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, city, offer_type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("offers")
      .select(
        "id, title, description, offer_type, value_worth, min_followers, starts_at, ends_at, cover_image_url, venues(id, name, city, category, logo_url)",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (search) query = query.ilike("title", `%${search}%`);
    if (offer_type) query = query.eq("offer_type", offer_type);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    let offers = data ?? [];
    if (city) {
      const needle = city.toLowerCase();
      offers = offers.filter((o: any) => (o.venues?.city ?? "").toLowerCase().includes(needle));
    }

    return {
      content: [{ type: "text", text: JSON.stringify(offers, null, 2) }],
      structuredContent: { offers, count: offers.length },
    };
  },
});
