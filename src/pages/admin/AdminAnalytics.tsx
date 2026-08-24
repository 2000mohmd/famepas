import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { TrendingUp, Users, Tag, Eye, Filter, CalendarIcon, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Link } from "react-router-dom";
import { formatLabel } from "./_format";


interface CategoryStat { name: string; count: number; }

type RangeKey = "7" | "30" | "90" | "custom";

const AdminAnalytics = () => {
  const [stats, setStats] = useState({
    venues: 0,
    influencers: 0,
    claims: 0,
    completedRedemptions: 0,
    offers: 0,
    offersInRange: 0,
    liveOffers: 0,
  });
  const [sub, setSub] = useState({
    venuesSignedUp: 0, venuesPosted: 0,
    influencersActive: 0, influencersRegistered: 0,
    offersLive: 0, offersDone: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [topVenues, setTopVenues] = useState<{ name: string; redemptions: number }[]>([]);
  const [cityFilter, setCityFilter] = useState("all");
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState<RangeKey>("30");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();


  const { fromISO, toISO, rangeLabel } = useMemo(() => {
    if (rangeKey === "custom" && customRange?.from) {
      const to = customRange.to ?? customRange.from;
      const end = new Date(to); end.setHours(23, 59, 59, 999);
      return {
        fromISO: new Date(customRange.from).toISOString(),
        toISO: end.toISOString(),
        rangeLabel: `${format(customRange.from, "MMM d")} – ${format(to, "MMM d, yyyy")}`,
      };
    }
    const days = parseInt(rangeKey === "custom" ? "30" : rangeKey, 10);
    const from = new Date(); from.setDate(from.getDate() - days);
    return { fromISO: from.toISOString(), toISO: new Date().toISOString(), rangeLabel: `Last ${days} days` };
  }, [rangeKey, customRange]);

  useEffect(() => {
    const fetchFilters = async () => {
      const { data } = await supabase.from("venues").select("city").not("city", "is", null);
      const unique = Array.from(new Set((data ?? []).map((v: any) => v.city).filter(Boolean))).sort();
      setCities(unique as string[]);
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const inRange = (q: any) => q.gte("created_at", fromISO).lte("created_at", toISO);

      let venueQuery = inRange(supabase.from("venues").select("id", { count: "exact", head: true }).eq("is_active", true));
      if (cityFilter !== "all") venueQuery = venueQuery.eq("city", cityFilter);

      let venueListQuery = supabase.from("venues").select("name, id, category").eq("is_active", true).limit(20);
      if (cityFilter !== "all") venueListQuery = venueListQuery.eq("city", cityFilter);

      let categoriesQuery = supabase.from("venues").select("category");
      if (cityFilter !== "all") categoriesQuery = categoriesQuery.eq("city", cityFilter);

      const [venues, influencers, claims, completed, offersTotal, offersInRange, liveOffers, venueList, categoriesRaw] = await Promise.all([
        venueQuery,
        inRange(supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "influencer")),
        // Claims = every application/redemption record created in range
        inRange(supabase.from("offer_redemptions").select("id", { count: "exact", head: true })),
        // Completed redemptions = the visit actually happened
        inRange(supabase.from("offer_redemptions").select("id", { count: "exact", head: true }))
          .in("status", ["redeemed", "completed"]),
        // Total offers is an all-time figure so it matches the Dashboard & Offers pages
        supabase.from("offers").select("id", { count: "exact", head: true }),
        inRange(supabase.from("offers").select("id", { count: "exact", head: true })),
        // Live = active AND not past its end date, matching Deep Analytics.
        supabase.from("offers").select("id, ends_at").eq("is_active", true),
        venueListQuery,
        categoriesQuery,
      ]);

      setStats({
        venues: venues.count ?? 0,
        influencers: influencers.count ?? 0,
        claims: claims.count ?? 0,
        completedRedemptions: completed.count ?? 0,
        offers: offersTotal.count ?? 0,
        offersInRange: offersInRange.count ?? 0,
        liveOffers: ((liveOffers.data as any[]) ?? []).filter(
          (o) => !o.ends_at || new Date(o.ends_at).getTime() > Date.now()
        ).length,
      });

      // ---- Sub-metric breakdowns for the same range ----
      const [signups, postedRows, redRows, delRows, infProfiles, liveNow] = await Promise.all([
        (() => {
          let q = supabase.from("venues").select("id", { count: "exact", head: true })
            .gte("created_at", fromISO).lte("created_at", toISO);
          if (cityFilter !== "all") q = q.eq("city", cityFilter);
          return q;
        })(),
        supabase.from("offers").select("venue_id").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("offer_redemptions").select("influencer_id, status, redeemed_at, offer_id")
          .gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("deliverables").select("influencer_id").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("user_roles").select("user_id").eq("role", "influencer"),
        supabase.from("offers").select("id, is_active, ends_at").eq("is_active", true),
      ]);

      const postedVenueIds = new Set((postedRows.data ?? []).map((o: any) => o.venue_id));
      const activeInfluencerIds = new Set([
        ...(redRows.data ?? []).map((r: any) => r.influencer_id),
        ...(delRows.data ?? []).map((d: any) => d.influencer_id),
      ]);
      const infIds = (infProfiles.data ?? []).map((r: any) => r.user_id);
      let registered = 0;
      if (infIds.length) {
        const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true })
          .in("user_id", infIds).gte("created_at", fromISO).lte("created_at", toISO);
        registered = count ?? 0;
      }
      const nowMs = Date.now();
      const liveRightNow = (liveNow.data ?? []).filter((o: any) => !o.ends_at || new Date(o.ends_at).getTime() > nowMs).length;
      const doneOfferIds = new Set(
        (redRows.data ?? [])
          .filter((r: any) => ["redeemed", "completed"].includes(r.status))
          .map((r: any) => r.offer_id)
      );

      setSub({
        venuesSignedUp: signups.count ?? 0,
        venuesPosted: postedVenueIds.size,
        influencersActive: activeInfluencerIds.size,
        influencersRegistered: registered,
        offersLive: liveRightNow,
        offersDone: doneOfferIds.size,
      });


      // Build category distribution from venues
      const catMap: Record<string, number> = {};
      (categoriesRaw.data ?? []).forEach((v: any) => {
        catMap[v.category] = (catMap[v.category] ?? 0) + 1;
      });
      const catArr = Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
      setCategoryStats(catArr);

      // Top venues by real completed redemptions (not the stale offers.current_redemptions counter)
      const venueIds = (venueList.data ?? []).map((v: any) => v.id);
      if (venueIds.length > 0) {
        const { data: offerData } = await supabase.from("offers").select("id, venue_id").in("venue_id", venueIds);
        const offerIds = (offerData ?? []).map((o: any) => o.id);
        const offerVenue = new Map((offerData ?? []).map((o: any) => [o.id, o.venue_id]));
        const venueMap: Record<string, number> = {};
        if (offerIds.length > 0) {
          const { data: redeemedRows } = await supabase
            .from("offer_redemptions")
            .select("offer_id, status")
            .in("offer_id", offerIds)
            .in("status", ["redeemed", "completed"]);
          (redeemedRows ?? []).forEach((r: any) => {
            const vId = offerVenue.get(r.offer_id);
            if (vId) venueMap[vId] = (venueMap[vId] ?? 0) + 1;
          });
        }
        const ranked = (venueList.data ?? [])
          .map((v: any) => ({ name: v.name, redemptions: venueMap[v.id] ?? 0 }))
          .sort((a, b) => b.redemptions - a.redemptions)
          .slice(0, 5);
        setTopVenues(ranked);
      } else {
        setTopVenues([]);
      }
      setLoading(false);
    };
    fetchStats();
  }, [cityFilter, fromISO, toISO]);

  // Rate = completed redemptions out of all claims made in the range (never exceeds 100%)
  const redemptionRate = stats.claims > 0 ? Math.round((stats.completedRedemptions / stats.claims) * 100) : 0;
  const maxCat = Math.max(...categoryStats.map(c => c.count), 1);

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Platform <span className="text-gold">Analytics</span></h1>
            <p className="text-muted-foreground">Track platform performance and generate insights</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <SelectValue placeholder="All cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            {rangeKey === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !customRange?.from && "text-muted-foreground")}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {customRange?.from ? rangeLabel : "Pick dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={2}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-xs text-muted-foreground">Showing data for {rangeLabel.toLowerCase()}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/analytics/deep">Open deep analytics</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="space-y-2">
            <StatCard title="Active Venues" value={stats.venues} icon={<Eye className="w-6 h-6" />} trend={cityFilter !== "all" ? `In ${cityFilter}` : "Platform-wide"} trendUp />
            <div className="px-1 text-xs text-muted-foreground space-y-0.5">
              <p><span className="text-foreground font-medium">{sub.venuesSignedUp}</span> signed up</p>
              <p><span className="text-foreground font-medium">{sub.venuesPosted}</span> posted an offer</p>
            </div>
          </div>
          <div className="space-y-2">
            <StatCard title="Active Influencers" value={stats.influencers} icon={<Users className="w-6 h-6" />} trend="New in range" trendUp />
            <div className="px-1 text-xs text-muted-foreground space-y-0.5">
              <p><span className="text-foreground font-medium">{sub.influencersActive}</span> claimed or delivered something</p>
              <p><span className="text-foreground font-medium">{sub.influencersRegistered}</span> registered</p>
            </div>
          </div>
          <div className="space-y-2">
            <StatCard title="Redemption Rate" value={`${redemptionRate}%`} icon={<Tag className="w-6 h-6" />} trend="Completed ÷ claims" trendUp={redemptionRate > 50} />
            <div className="px-1 text-xs text-muted-foreground space-y-0.5">
              <p><span className="text-foreground font-medium">{stats.claims}</span> claims in range</p>
              <p><span className="text-foreground font-medium">{stats.completedRedemptions}</span> completed redemptions</p>
            </div>
          </div>
          <div className="space-y-2">
            <StatCard title="Total Offers" value={stats.offers} icon={<TrendingUp className="w-6 h-6" />} trend="All time, across all venues" trendUp />
            <div className="px-1 text-xs text-muted-foreground space-y-0.5">
              <p><span className="text-foreground font-medium">{stats.offersInRange}</span> created in the {rangeLabel.toLowerCase()}</p>
              <p><span className="text-foreground font-medium">{sub.offersLive}</span> live right now</p>
              <p><span className="text-foreground font-medium">{sub.offersDone}</span> with a completed redemption in range</p>
            </div>
          </div>
          <StatCard title="Live Offers" value={stats.liveOffers} icon={<Zap className="w-6 h-6" />} trend="Currently active (all time)" trendUp />
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Venues */}
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Top Venues by Redemptions</h2>
            {loading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded-lg bg-secondary/50 animate-pulse" />)}</div>
            ) : topVenues.length === 0 ? (
              <p className="text-muted-foreground text-sm">No venue data yet.</p>
            ) : (
              <div className="space-y-3">
                {topVenues.map((v, i) => (
                  <div key={v.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <span className="text-gold font-bold text-sm w-6">#{i + 1}</span>
                      <span className="text-foreground text-sm">{v.name}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">{v.redemptions} redemptions</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Venue Categories</h2>
            {loading ? (
              <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-8 rounded bg-secondary/50 animate-pulse" />)}</div>
            ) : categoryStats.length === 0 ? (
              <p className="text-muted-foreground text-sm">No category data yet.</p>
            ) : (
              <div className="space-y-4">
                {categoryStats.map(({ name, count }) => {
                  const pct = Math.round((count / maxCat) * 100);
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">{formatLabel(name)}</span>
                        <span className="text-gold">{count} venues</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full gradient-gold transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
