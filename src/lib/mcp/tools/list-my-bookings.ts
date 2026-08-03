import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_bookings",
  title: "List my bookings",
  description:
    "List the signed-in user's FamePass bookings (as influencer, or as venue owner for their venues), newest first.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filter by booking status, e.g. upcoming, checked_in, completed."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("bookings")
      .select("id, status, scheduled_date, checked_in_at, completed_at, notes, offer_id, venue_id, influencer_id, offers(title), venues(name, city)")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const bookings = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(bookings, null, 2) }],
      structuredContent: { bookings, count: bookings.length },
    };
  },
});
