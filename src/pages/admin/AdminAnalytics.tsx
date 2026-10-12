import DashboardLayout from "@/components/DashboardLayout";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import StatCard from "@/components/StatCard";
import { TrendingUp, Users, Tag, Eye, Filter, CalendarIcon, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    return { fromISO: from.toISOString(), toISO: new Date().toISOString(), rangeLabel: t("admin.analytics.lastNDays", { count: days }) };
  }, [rangeKey, customRange, t]);

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

      // "Active Venues" is a status, not a date-range metric — approved and
      // currently active, full stop. (Previously scoped to "created in range",
      // which is why this card showed 1 while the venues list showed 12.)
      let venueQuery = supabase.from("venues").select("id", { count: "exact", head: true }).eq("is_active", true).eq("approval_status", "approved");
      if (cityFilter !== "all") venueQuery = venueQuery.eq("city", cityFilter);

      let venueListQuery = supabase.from("venues").select("name, id, category").eq("is_active", true).limit(20);
      if (cityFilter !== "all") venueListQuery = venueListQuery.eq("city", cityFilter);

      let categoriesQuery = supabase.from("venues").select("category");
      if (cityFilter !== "all") categoriesQuery = categoriesQuery.eq("city", cityFilter);

      const [venues, claims, completed, offersTotal, offersInRange, liveOffers, venueList, categoriesRaw] = await Promise.all([
        venueQuery,
        // Claims/completed are all-time totals so they match the Dashboard &
        // Redemptions list pages (previously scoped to range, which is why
        // this showed "2, 0 completed" while those pages showed "14, 2").
        supabase.from("offer_redemptions").select("id", { count: "exact", head: true }),
        supabase.from("offer_redemptions").select("id", { count: "exact", head: true })
          .in("status", ["redeemed", "completed"]),
        // Total offers is an all-time figure so it matches the Dashboard & Offers pages
        supabase.from("offers").select("id", { count: "exact", head: true }),
        inRange(supabase.from("offers").select("id", { count: "exact", head: true })),
        // Live = active AND not past its end date, matching Deep Analytics.
        supabase.from("offers").select("id, ends_at").eq("is_active", true),
        venueListQuery,
        categoriesQuery,
      ]);

      setStats((s) => ({
        ...s,
        venues: venues.count ?? 0,
        claims: claims.count ?? 0,
        completedRedemptions: completed.count ?? 0,
        offers: offersTotal.count ?? 0,
        offersInRange: offersInRange.count ?? 0,
        liveOffers: ((liveOffers.data as any[]) ?? []).filter(
          (o) => !o.ends_at || new Date(o.ends_at).getTime() > Date.now()
        ).length,
      }));

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
      // The "Active Influencers" card must actually mean active (claimed/delivered
      // in range), not "registered in range" — those are two different numbers
      // and conflating them is exactly what made the three admin pages disagree.
      setStats((s) => ({ ...s, influencers: activeInfluencerIds.size }));


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
      <AdminPermissionGate permission="manage_analytics">
      <div className="animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("admin.analytics.titlePrefix")} <span className="text-gold">{t("navLabel.Analytics", "Analytics")}</span></h1>
            <p className="text-muted-foreground">{t("admin.analytics.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <SelectValue placeholder={t("admin.analytics.allCities")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.analytics.allCities")}</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t("admin.analytics.last7Days")}</SelectItem>
                <SelectItem value="30">{t("admin.analytics.last30Days")}</SelectItem>
                <SelectItem value="90">{t("admin.analytics.last90Days")}</SelectItem>
                <SelectItem value="custom">{t("admin.analytics.customRange")}</SelectItem>
              </SelectContent>
            </Select>
            {rangeKey === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !customRange?.from && "text-muted-foreground")}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {customRange?.from ? rangeLabel : t("admin.analytics.pickDates")}
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
          <p className="text-xs text-muted-foreground">{t("admin.analytics.showingDataFor", { range: rangeLabel.toLowerCase() })}</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/analytics/deep">{t("admin.analytics.openDeepAnalytics")}</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="space-y-2">
            <StatCard title={t("admin.analytics.activeVenues")} value={stats.venues} icon={<Eye className="w-6 h-6" />} trend={cityFilter !== "all" ? t("admin.analytics.inCity", { city: cityFilter }) : t("admin.analytics.platformWide")} trendUp />
            <div className="px-1 text-xs text-muted-foreground space-y-0.5">
              <p>{t("admin.analytics.signedUp", { count: sub.venuesSignedUp })}</p>
              <p>{t("admin.analytics.postedOffer", { count: sub.venuesPosted })}</p>
            </div>
          </div>
          <div className="space-y-2">
            <StatCard title={t("admin.analytics.activeInfluencers")} value={stats.influencers} icon={<Users className="w-6 h-6" />} trend={t("admin.analytics.claimedDelivered", { range: rangeLabel.toLowerCase() })} trendUp />
            <div className="px-1 text-xs text-muted-foreground space-y-0.5">
              <p>{t("admin.analytics.registeredInRange", { count: sub.influencersRegistered, range: rangeLabel.toLowerCase() })}</p>
            </div>
          </div>
          <div className="space-y-2">
            <StatCard title={t("admin.analytics.visitCompletionRate")} value={`${redemptionRate}%`} icon={<Tag className="w-6 h-6" />} trend={t("admin.analytics.completedOverClaimed")} trendUp={redemptionRate > 50} />
            <div className="px-1 text-xs text-muted-foreground space-y-0.5">
              <p>{t("admin.analytics.totalVisitsClaimed", { count: stats.claims })}</p>
              <p>{t("admin.analytics.completedCount", { count: stats.completedRedemptions })}</p>
            </div>
          </div>
          <div className="space-y-2">
            <StatCard title={t("admin.analytics.totalOffers")} value={stats.offers} icon={<TrendingUp className="w-6 h-6" />} trend={t("admin.analytics.allTimeAcrossVenues")} trendUp />
            <div className="px-1 text-xs text-muted-foreground space-y-0.5">
              <p>{t("admin.analytics.createdInRange", { count: stats.offersInRange, range: rangeLabel.toLowerCase() })}</p>
              <p>{t("admin.analytics.liveRightNow", { count: sub.offersLive })}</p>
              <p>{t("admin.analytics.doneInRange", { count: sub.offersDone })}</p>
            </div>
          </div>
          <StatCard title={t("admin.analytics.liveOffers")} value={stats.liveOffers} icon={<Zap className="w-6 h-6" />} trend={t("admin.analytics.currentlyActiveAllTime")} trendUp />
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Venues */}
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">{t("admin.analytics.topVenuesByVisits")}</h2>
            {loading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded-lg bg-secondary/50 animate-pulse" />)}</div>
            ) : topVenues.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("admin.analytics.noVenueData")}</p>
            ) : (
              <div className="space-y-3">
                {topVenues.map((v, i) => (
                  <div key={v.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <span className="text-gold font-bold text-sm w-6">#{i + 1}</span>
                      <span className="text-foreground text-sm">{v.name}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">{t("admin.analytics.creatorVisitsCount", { count: v.redemptions })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">{t("admin.analytics.venueCategories")}</h2>
            {loading ? (
              <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-8 rounded bg-secondary/50 animate-pulse" />)}</div>
            ) : categoryStats.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("admin.analytics.noCategoryData")}</p>
            ) : (
              <div className="space-y-4">
                {categoryStats.map(({ name, count }) => {
                  const pct = Math.round((count / maxCat) * 100);
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">{formatLabel(name)}</span>
                        <span className="text-gold">{t("admin.analytics.venuesCount", { count })}</span>
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
      </AdminPermissionGate>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
