import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Heart, MessageCircle, Share2, Film, Ticket, CalendarCheck, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format } from "date-fns";

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

  // Time-series: bookings per day
  const trendData = useMemo(() => {
    const map: Record<string, { date: string; bookings: number; redemptions: number }> = {};
    const key = (s: string) => format(new Date(s), "MMM d");
    bookings.forEach(b => {
      const k = key(b.created_at);
      if (!map[k]) map[k] = { date: k, bookings: 0, redemptions: 0 };
      map[k].bookings += 1;
    });
    redemptions.forEach(r => {
      const k = key(r.created_at);
      if (!map[k]) map[k] = { date: k, bookings: 0, redemptions: 0 };
      map[k].redemptions += 1;
    });
    return Object.values(map).slice(-30);
  }, [bookings, redemptions]);

  const typeData = useMemo(() =>
    Object.entries(m.byType).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v })),
    [m.byType]
  );
  const pieColors = ["#e8547a", "#f4a261", "#2a9d8f", "#264653", "#e9c46a", "#9b87f5"];

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="bg-white border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-3">Activity trend</h3>
                {trendData.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="bookings" stroke="#e8547a" strokeWidth={2} />
                      <Line type="monotone" dataKey="redemptions" stroke="#2a9d8f" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold mb-3">Content mix</h3>
                {typeData.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No content yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {typeData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5 mb-8">
              <h3 className="text-sm font-semibold mb-3">Engagement breakdown</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  { metric: "Views", value: m.views },
                  { metric: "Likes", value: m.likes },
                  { metric: "Comments", value: m.comments },
                  { metric: "Shares", value: m.shares },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#e8547a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
