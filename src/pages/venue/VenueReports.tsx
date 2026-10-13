import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Heart, MessageCircle, Share2, Film, Ticket, CalendarCheck, TrendingUp, BarChart3, Plus, Search, Users, DollarSign } from "lucide-react";
import { VenueHero, VenueStat, VenuePanel, VenueEmpty, BrandButton, SectionLabel } from "@/components/venue/VenueUI";
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
  const [offers, setOffers] = useState<any[]>([]);

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
      let bq = supabase.from("bookings").select("id,status,created_at,completed_at,venue_id,offer_id").in("venue_id", venueIds);
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
      const { data: offerRows } = await supabase.from("offers").select("id,title").in("venue_id", venueIds);
      setOffers(offerRows ?? []);
      const offerIds = (offerRows ?? []).map((o: any) => o.id);
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
    const effectiveType = (d: any) => {
      const url: string = (d.post_url || d.content_url || "").toLowerCase();
      if (/\/reels?\//.test(url) || /tiktok\.com\/.+\/video\//.test(url) || /vm\.tiktok\.com/.test(url)) return "reel";
      return d.content_type;
    };
    const posts = deliverables.filter(d => (d.status === "approved" || d.status === "submitted") && effectiveType(d) !== "reel" && effectiveType(d) !== "video").length;
    const byType = { post: 0, reel: 0, story: 0, video: 0, review: 0, other: 0 } as Record<string, number>;
    deliverables.forEach(d => { const t = effectiveType(d); byType[t] = (byType[t] || 0) + 1; });
    const redeemed = redemptions.filter(r => r.status === "redeemed" || r.redeemed_at).length;
    const completed = bookings.filter(b => b.status === "completed").length;
    const noShow = bookings.filter(b => b.status === "no_show").length;
    // Adnan, Venue Portal item 10: a headline "what's this worth" number.
    // No agreed methodology yet, so this uses a disclosed, adjustable
    // per-engagement rate rather than presenting an unexplained dollar figure.
    const EMV_RATE_PER_ENGAGEMENT = 0.05;
    const estimatedMediaValue = (likes + comments + shares) * EMV_RATE_PER_ENGAGEMENT;
    return { views, likes, comments, shares, engagement, posts, byType, redeemed, completed, noShow, totalBookings: bookings.length, totalRedemptions: redemptions.length, estimatedMediaValue };
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
  const pieColors = ["#510000", "#CD9774", "#8C3A2B", "#E8C9A8", "#B5654A", "#3A1A14"];

  // Per-offer (campaign) performance: posts delivered and the reach they earned.
  const campaignRows = useMemo(() => {
    const offerTitle: Record<string, string> = {};
    offers.forEach((o: any) => { offerTitle[o.id] = o.title; });
    const bookingOffer: Record<string, string | null> = {};
    bookings.forEach((b: any) => { bookingOffer[b.id] = b.offer_id ?? null; });

    const rows: Record<string, any> = {};
    const bump = (key: string) => (rows[key] ??= {
      key, title: key === "none" ? "Direct bookings" : (offerTitle[key] || "Offer"),
      posts: 0, views: 0, likes: 0, comments: 0, shares: 0, bookings: 0,
    });

    bookings.forEach((b: any) => { bump(b.offer_id ?? "none").bookings += 1; });
    deliverables.forEach((d: any) => {
      const r = bump(bookingOffer[d.booking_id] ?? "none");
      r.posts += 1;
      r.views += Number(d.views) || 0;
      r.likes += Number(d.likes) || 0;
      r.comments += Number(d.comments) || 0;
      r.shares += Number(d.shares) || 0;
    });
    return Object.values(rows).sort((a: any, b: any) => b.views - a.views);
  }, [offers, bookings, deliverables]);

  const hasActivity = deliverables.length > 0 || bookings.length > 0 || redemptions.length > 0;
  const periodLabel = (p: Period) => (p === "all" ? "All time" : p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days");
  const chartTick = { fontSize: 12, fill: "hsl(0 5% 44%)" };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in space-y-8">
        <VenueHero
          eyebrow="Performance"
          title="Reports"
          subtitle="What creators are doing for your venue — visits, reach and the value of the content they publish."
          actions={
            <div className="inline-flex gap-1 p-1.5 rounded-full" style={{ background: "hsl(var(--venue-brand-foreground) / .1)" }}>
              {(["7d", "30d", "90d", "all"] as Period[]).map((p) => (
                <button key={p} type="button" onClick={() => setPeriod(p)}
                  className="h-10 px-4 rounded-full text-sm font-semibold transition"
                  style={period === p ? { background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" } : { color: "hsl(var(--venue-brand-foreground) / .75)" }}>
                  {periodLabel(p)}
                </button>
              ))}
            </div>
          }
          aside={!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Users, label: "Creator visits", value: m.completed.toLocaleString() },
                { icon: Eye, label: "Total reach", value: m.views.toLocaleString() },
                { icon: DollarSign, label: "Est. media value", value: `$${m.estimatedMediaValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-3xl p-6" style={{ background: "hsl(var(--venue-brand-foreground) / .07)", border: "1px solid hsl(var(--venue-brand-foreground) / .12)" }}>
                  <Icon className="w-5 h-5 mb-6" style={{ color: "hsl(var(--primary))" }} />
                  <p className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none">{value}</p>
                  <p className="text-sm mt-2 opacity-70">{label}</p>
                </div>
              ))}
            </div>
          )}
        />

        {loading ? (
          <div className="rounded-[2rem] bg-card border border-border py-24 text-center text-muted-foreground">Loading…</div>
        ) : !hasActivity ? (
          <VenueEmpty
            icon={BarChart3}
            title={`No activity in the last ${periodLabel(period).toLowerCase()}`}
            body="As soon as creators redeem your offers and post about your venue, their reach, engagement and visits show up here."
            actions={<>
              <BrandButton to="/venue/campaigns/new"><Plus /> Create an offer</BrandButton>
              <BrandButton to="/venue/discover"><Search /> Discover creators</BrandButton>
            </>}
          />
        ) : (
          <>
            <div className="space-y-4">
              <SectionLabel>Reach & engagement</SectionLabel>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <VenueStat icon={Eye} label="Total views" value={m.views.toLocaleString()} accent />
                <VenueStat icon={Heart} label="Total likes" value={m.likes.toLocaleString()} />
                <VenueStat icon={MessageCircle} label="Comments" value={m.comments.toLocaleString()} />
                <VenueStat icon={Share2} label="Shares" value={m.shares.toLocaleString()} />
                <VenueStat icon={TrendingUp} label="Engagement rate" value={`${m.engagement.toFixed(2)}%`} />
                <VenueStat icon={Film} label="Posts published" value={m.posts} />
                <VenueStat icon={Film} label="Reels / videos" value={(m.byType.reel || 0) + (m.byType.video || 0)} />
                <VenueStat icon={Film} label="Stories" value={m.byType.story || 0} />
              </div>
            </div>

            <div className="space-y-4">
              <SectionLabel>Creator visits & bookings</SectionLabel>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <VenueStat icon={Ticket} label="Offers redeemed" value={m.redeemed} hint={`of ${m.totalRedemptions} claims`} />
                <VenueStat icon={CalendarCheck} label="Bookings completed" value={m.completed} hint={`of ${m.totalBookings} bookings`} />
                <VenueStat icon={CalendarCheck} label="No-shows" value={m.noShow} />
                <VenueStat icon={TrendingUp} label="Completion rate" value={m.totalBookings ? `${Math.round((m.completed / m.totalBookings) * 100)}%` : "—"} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <VenuePanel title="Activity trend">
                {trendData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">Nothing in this period yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="4 4" stroke="hsl(30 12% 90%)" vertical={false} />
                      <XAxis dataKey="date" tick={chartTick} axisLine={false} tickLine={false} />
                      <YAxis tick={chartTick} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid hsl(30 12% 88%)" }} />
                      <Legend />
                      <Line type="monotone" dataKey="bookings" stroke="hsl(0 100% 16%)" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="redemptions" stroke="hsl(24 47% 63%)" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </VenuePanel>

              <VenuePanel title="Content mix">
                {typeData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">No posts yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={3}>
                        {typeData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 14 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </VenuePanel>
            </div>

            <VenuePanel title="Engagement breakdown">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  { metric: "Views", value: m.views },
                  { metric: "Likes", value: m.likes },
                  { metric: "Comments", value: m.comments },
                  { metric: "Shares", value: m.shares },
                ]}>
                  <CartesianGrid strokeDasharray="4 4" stroke="hsl(30 12% 90%)" vertical={false} />
                  <XAxis dataKey="metric" tick={chartTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartTick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "hsl(30 14% 94%)" }} contentStyle={{ borderRadius: 14 }} />
                  <Bar dataKey="value" fill="hsl(0 100% 16%)" radius={[12, 12, 4, 4]} maxBarSize={72} />
                </BarChart>
              </ResponsiveContainer>
            </VenuePanel>

            <VenuePanel title="Offer performance" className="overflow-x-auto">
              {campaignRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">No offer activity in this period.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      {["Offer", "Bookings", "Posts", "Views", "Likes", "Comments", "Engagement"].map((h) => (
                        <th key={h} className="pb-3 pr-4 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaignRows.map((r: any) => {
                      const er = r.views > 0 ? ((r.likes + r.comments + r.shares) / r.views) * 100 : 0;
                      return (
                        <tr key={r.key} className="border-b border-border/60 last:border-0">
                          <td className="py-4 pr-4 font-bold text-foreground">{r.title}</td>
                          <td className="py-4 pr-4">{r.bookings}</td>
                          <td className="py-4 pr-4">{r.posts}</td>
                          <td className="py-4 pr-4">{r.views.toLocaleString()}</td>
                          <td className="py-4 pr-4">{r.likes.toLocaleString()}</td>
                          <td className="py-4 pr-4">{r.comments.toLocaleString()}</td>
                          <td className="py-4 pr-4">
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold" style={{ background: "hsl(var(--primary) / .18)", color: "hsl(var(--venue-brand))" }}>{er.toFixed(2)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </VenuePanel>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VenueReports;
