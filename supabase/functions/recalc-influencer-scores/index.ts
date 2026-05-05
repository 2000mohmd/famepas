import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Weighted formula: 35% delivery, 25% venue rating, 20% punctuality, 10% engagement, 10% (1 - cancellation rate)
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: influencers } = await supa
    .from("user_roles")
    .select("user_id")
    .eq("role", "influencer");

  let updated = 0;
  for (const { user_id } of influencers ?? []) {
    const { data: bookings } = await supa
      .from("bookings")
      .select("status, scheduled_date, checked_in_at, completed_at")
      .eq("influencer_id", user_id);

    const total = bookings?.length || 0;
    const completed = bookings?.filter(b => b.status === "completed").length || 0;
    const cancelled = bookings?.filter(b => b.status === "cancelled" || b.status === "no_show").length || 0;

    // Delivery rate: deliverables submitted vs completed bookings
    const completedIds = bookings?.filter(b => b.status === "completed").map((_, i) => i) || [];
    const { count: deliverablesCount } = await supa
      .from("deliverables")
      .select("*", { count: "exact", head: true })
      .eq("influencer_id", user_id);
    const delivery = completed > 0 ? Math.min(1, (deliverablesCount || 0) / completed) : 0.5;

    // Punctuality: checked in within 15 min of scheduled
    const punctualBookings = bookings?.filter(b => {
      if (!b.checked_in_at || !b.scheduled_date) return false;
      const diff = Math.abs(new Date(b.checked_in_at).getTime() - new Date(b.scheduled_date).getTime());
      return diff <= 15 * 60 * 1000;
    }).length || 0;
    const punctuality = completed > 0 ? punctualBookings / completed : 0.5;

    // Venue rating
    const { data: ratings } = await supa
      .from("reviews")
      .select("rating")
      .eq("reviewed_id", user_id)
      .eq("review_type", "venue_to_influencer");
    const avgRating = ratings?.length
      ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length / 5
      : 0.5;

    // Engagement
    const { data: profile } = await supa
      .from("profiles")
      .select("engagement_rate, followers_count")
      .eq("user_id", user_id)
      .maybeSingle();
    const engagement = Math.min(1, ((profile?.engagement_rate as any) || 2) / 10);

    const cancelScore = total > 0 ? 1 - (cancelled / total) : 1;

    const score = Math.round(
      (delivery * 0.35 + avgRating * 0.25 + punctuality * 0.2 + engagement * 0.10 + cancelScore * 0.10) * 100
    );

    let badge = "rising";
    if (score >= 85) badge = "elite";
    else if (score >= 70) badge = "verified";
    else if (score >= 50) badge = "established";

    await supa.from("profiles").update({ influencer_score: score, badge } as any).eq("user_id", user_id);
    updated++;
  }

  return new Response(JSON.stringify({ updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
