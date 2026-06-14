import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Heart, MessageCircle, Share2, Film, Ticket, CalendarCheck, TrendingUp } from "lucide-react";

type Period = "7d" | "30d" | "90d" | "all";

const VenueReports = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  const sinceISO = useMemo(() => {
    if (period === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - ({ "7d": 7, "30d": 30, "90d": 90 } as any)[period]);
    return d.toISOString();
  }, [period]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: venues } = await supabase.from("venues").select("id").eq("owner_id", user.id);
      const venueIds = (venues ?? []).map((v: any) => v.id);
      if (venueIds.length === 0) { setLoading(false); return; }

      // bookings for these venues
      let bq = supabase.from("bookings").select("id,status,created_at,completed_at,venue_id").in("venue_id", venueIds);
      if (sinceISO) bq = bq.gte("created_at", sinceISO);
      const { data: bks } = await bq;
      setBookings(bks ?? []);

      // deliverables for those bookings
      const bookingIds = (bks ?? []).map((b: any) => b.id);
      if (bookingIds.length > 0) {
        const { data: ds } = await supabase.from("deliverables").select("*").in("booking_id", bookingIds);
        setDeliverables(ds ?? []);
      } else setDeliverables([]);

      // redemptions via offers
      const { data: offers } = await supabase.from("offers").select("id").in("venue_id", venueIds);
      const offerIds = (offers ?? []).map((o: any) => o.id);
      if (offerIds.length > 0) {
        let rq = supabase.from("offer_redemptions").select("id,status,created_at,redeemed_at,offer_id").in("offer_id", offerIds);
        if (sinceISO) rq = rq.gte("created_at", sinceISO);
        const { data: rs } = await rq;
        setRedemptions(rs ?? []);
      } else setRedemptions([]);

      setLoading(false);
    })();
  }, [user, sinceISO]);

  const m = useMemo(() => {
    const sum = (k: string) => deliverables.reduce((a, d) => a + (Number(d[k]) || 0), 0);
    const views = sum("views"), likes = sum("likes"), comments = sum("comments"), shares = sum("shares");
    const engagement = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;
    const posts = deliverables.filter(d => d.status === "approved" || d.status === "submitted").length;
    const byType = { post: 0, reel: 0, story: 0, video: 0, review: 0, other: 0 } as Record<string, number>;
    deliverables.forEach(d => { byType[d.content_type] = (byType[d.content_type] || 0) + 1; });
    const redeemed = redemptions.filter(r => r.status === "redeemed" || r.redeemed_at).length;
    const completed = bookings.filter(b => b.status === "completed").length;
    const noShow = bookings.filter(b => b.status === "no_show").length;
    return { views, likes, comments, shares, engagement, posts, byType, redeemed, completed, noShow, totalBookings: bookings.length, totalRedemptions: redemptions.length };
  }, [deliverables, redemptions, bookings]);

  const Stat = ({ icon: Icon, label, value, sub }: any) => (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary"><Icon className="w-4 h-4" /></div>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-bold text-foreground">Reports</h1>
          <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
            {(["7d","30d","90d","all"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium ${period===p?"bg-foreground text-white":"text-muted-foreground hover:text-foreground"}`}>
                {p === "all" ? "All time" : `Last ${p.replace("d"," days")}`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-border rounded-2xl py-24 text-center text-muted-foreground">Loading…</div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Reach & Engagement</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Stat icon={Eye} label="Total views" value={m.views.toLocaleString()} />
              <Stat icon={Heart} label="Total likes" value={m.likes.toLocaleString()} />
              <Stat icon={MessageCircle} label="Comments" value={m.comments.toLocaleString()} />
              <Stat icon={Share2} label="Shares" value={m.shares.toLocaleString()} />
              <Stat icon={TrendingUp} label="Engagement rate" value={`${m.engagement.toFixed(2)}%`} sub="(likes+comments+shares)/views" />
              <Stat icon={Film} label="Posts published" value={m.posts} />
              <Stat icon={Film} label="Reels / Videos" value={(m.byType.reel||0) + (m.byType.video||0)} />
              <Stat icon={Film} label="Stories" value={m.byType.story || 0} />
            </div>

            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Redemptions & Bookings</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Stat icon={Ticket} label="Offers redeemed" value={m.redeemed} sub={`of ${m.totalRedemptions} claims`} />
              <Stat icon={CalendarCheck} label="Bookings completed" value={m.completed} sub={`of ${m.totalBookings}`} />
              <Stat icon={CalendarCheck} label="No-shows" value={m.noShow} />
              <Stat icon={TrendingUp} label="Completion rate"
                value={m.totalBookings ? `${Math.round((m.completed / m.totalBookings) * 100)}%` : "—"} />
            </div>

            {deliverables.length === 0 && bookings.length === 0 && (
              <div className="bg-white border border-border rounded-2xl py-12 text-center text-muted-foreground text-sm">
                No activity in this date range yet. Once influencers redeem offers and post content, metrics will appear here.
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VenueReports;
