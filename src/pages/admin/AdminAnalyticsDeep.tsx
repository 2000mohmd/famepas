import DashboardLayout from "@/components/DashboardLayout";
import AdminPermissionGate from "@/components/admin/AdminPermissionGate";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, ExternalLink, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type RangeKey = "7" | "30" | "90" | "custom";

const Metric = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="gradient-card rounded-xl border border-border p-5">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="gradient-card rounded-xl border border-border p-6">
    <h3 className="font-display text-lg font-bold text-foreground mb-4">{title}</h3>
    {children}
  </div>
);

const NoteBox = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-2 items-start rounded-lg border border-gold/40 bg-gold/5 p-3 text-xs text-muted-foreground">
    <Info className="w-4 h-4 text-gold shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
const days = (ms: number) => `${(ms / 86400000).toFixed(1)} d`;

const AdminAnalyticsDeep = () => {
  const { t } = useTranslation();
  const [rangeKey, setRangeKey] = useState<RangeKey>("30");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<any>({
    venues: [], offers: [], redemptions: [], deliverables: [], bookings: [],
    influencers: [], reviews: [], views: [],
  });

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
    const n = parseInt(rangeKey === "custom" ? "30" : rangeKey, 10);
    const from = new Date(); from.setDate(from.getDate() - n);
    return { fromISO: from.toISOString(), toISO: new Date().toISOString(), rangeLabel: t("admin.analyticsDeep.lastNDays", { n }) };
  }, [rangeKey, customRange, t]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [venues, offers, redemptions, deliverables, bookings, roles, reviews, views] = await Promise.all([
        supabase.from("venues").select("id,name,city,category,created_at,is_active"),
        supabase.from("offers").select("id,venue_id,title,created_at,is_active,ends_at,discount_value,current_redemptions"),
        supabase.from("offer_redemptions").select("id,offer_id,influencer_id,status,created_at,redeemed_at"),
        supabase.from("deliverables").select("id,booking_id,influencer_id,content_type,status,views,likes,comments,post_url,content_url,submitted_at,created_at,disputed,dispute_reason"),
        supabase.from("bookings").select("id,venue_id,influencer_id,offer_id,redemption_id,status,created_at"),
        supabase.from("user_roles").select("user_id").eq("role", "influencer"),
        supabase.from("reviews").select("id,rating,review_type,reviewed_id,created_at"),
        supabase.from("offer_views").select("id,offer_id,created_at"),
      ]);
      const infIds = (roles.data ?? []).map((r: any) => r.user_id);
      let influencers: any[] = [];
      if (infIds.length) {
        const { data } = await supabase.rpc("get_public_profiles_detailed", { _user_ids: infIds });
        influencers = data ?? [];
      }
      setD({
        venues: venues.data ?? [], offers: offers.data ?? [], redemptions: redemptions.data ?? [],
        deliverables: deliverables.data ?? [], bookings: bookings.data ?? [],
        influencers, reviews: reviews.data ?? [], views: views.data ?? [],
      });
      setLoading(false);
    };
    load();
  }, []);

  const m = useMemo(() => {
    const from = new Date(fromISO).getTime();
    const to = new Date(toISO).getTime();
    const inRange = (t?: string | null) => {
      if (!t) return false;
      const x = new Date(t).getTime();
      return x >= from && x <= to;
    };

    const offers = d.offers as any[];
    const reds = d.redemptions as any[];
    const dels = d.deliverables as any[];
    const bookings = d.bookings as any[];
    const venues = d.venues as any[];

    const offersInRange = offers.filter(o => inRange(o.created_at));
    const redsInRange = reds.filter(r => inRange(r.created_at));
    const delsInRange = dels.filter(x => inRange(x.submitted_at ?? x.created_at));

    const venueById: Record<string, any> = {};
    venues.forEach(v => { venueById[v.id] = v; });
    const offerById: Record<string, any> = {};
    offers.forEach(o => { offerById[o.id] = o; });
    const bookingById: Record<string, any> = {};
    bookings.forEach(b => { bookingById[b.id] = b; });

    // 1. Marketplace health
    const activeVenueIds = new Set(offersInRange.map(o => o.venue_id));
    const activeInfIds = new Set([
      ...redsInRange.map(r => r.influencer_id),
      ...delsInRange.map(x => x.influencer_id),
    ]);
    const claimedOfferIds = new Set(reds.map(r => r.offer_id));
    const now = Date.now();
    const liveOffers = offers.filter(o => o.is_active && (!o.ends_at || new Date(o.ends_at).getTime() > now));
    const openOffers = liveOffers.filter(o => !claimedOfferIds.has(o.id));

    // time to fill: offer created -> first approved-or-later redemption
    const filledStatuses = new Set(["approved", "redeemed", "completed"]);
    const fillTimes: number[] = [];
    const perOfferFill: { title: string; venue: string; ms: number }[] = [];
    offers.forEach(o => {
      const first = reds
        .filter(r => r.offer_id === o.id && filledStatuses.has(r.status))
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))[0];
      if (first && inRange(first.created_at)) {
        const ms = +new Date(first.created_at) - +new Date(o.created_at);
        if (ms >= 0) {
          fillTimes.push(ms);
          perOfferFill.push({ title: o.title, venue: venueById[o.venue_id]?.name ?? "—", ms });
        }
      }
    });
    const avgFill = fillTimes.length ? fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length : 0;

    const followerTotal = (d.influencers as any[])
      .filter(p => activeInfIds.has(p.user_id))
      .reduce((s, p) => s + Math.max(p.followers_count ?? 0, p.tiktok_followers ?? 0), 0);

    // 2. Restaurant-side
    const offersPerVenue = Object.entries(
      offersInRange.reduce((acc: Record<string, number>, o) => {
        acc[o.venue_id] = (acc[o.venue_id] ?? 0) + 1; return acc;
      }, {})
    ).map(([vid, count]) => ({ name: venueById[vid]?.name ?? t("admin.auditLog.unknown"), count: count as number }))
      .sort((a, b) => b.count - a.count).slice(0, 8);

    const weekly: Record<string, number> = {};
    offersInRange.forEach(o => {
      const k = format(new Date(o.created_at), "MMM d");
      weekly[k] = (weekly[k] ?? 0) + 1;
    });
    const offersOverTime = Object.entries(weekly).map(([date, count]) => ({ date, count }));

    const venuesWithOffers = new Set(offers.map(o => o.venue_id));
    const venueOfferCount: Record<string, number> = {};
    offers.forEach(o => { venueOfferCount[o.venue_id] = (venueOfferCount[o.venue_id] ?? 0) + 1; });
    const repeatVenues = Object.values(venueOfferCount).filter(c => c > 1).length;
    // Adnan, "More Fixes" #20: a venue that never posted isn't "churned" —
    // keep the two cases separate so the wording doesn't imply past activity
    // that never happened.
    const churnCutoff = now - 30 * 86400000;
    const lastOfferAt = (venueId: string) =>
      offers.filter(o => o.venue_id === venueId).map(o => +new Date(o.created_at)).sort((a, b) => b - a)[0];
    const churnedVenues = venues.filter(v => { const last = lastOfferAt(v.id); return !!last && last < churnCutoff; });
    const neverPostedVenues = venues.filter(v => !lastOfferAt(v.id));

    const byCity: Record<string, { venues: number; offers: number }> = {};
    venues.forEach(v => {
      const c = v.city || "Unknown";
      byCity[c] = byCity[c] ?? { venues: 0, offers: 0 };
      byCity[c].venues += 1;
    });
    offersInRange.forEach(o => {
      const c = venueById[o.venue_id]?.city || "Unknown";
      byCity[c] = byCity[c] ?? { venues: 0, offers: 0 };
      byCity[c].offers += 1;
    });
    const cityRows = Object.entries(byCity).map(([city, v]) => ({ city, ...v })).sort((a, b) => b.offers - a.offers);

    const byCategory: Record<string, number> = {};
    venues.forEach(v => { const c = v.category || t("admin.analyticsDeep.uncategorised"); byCategory[c] = (byCategory[c] ?? 0) + 1; });
    const categoryRows = Object.entries(byCategory).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    // 3. Influencer-side
    const approvedReds = reds.filter(r => filledStatuses.has(r.status) && inRange(r.created_at));
    const delByBooking = new Set(dels.map(x => x.booking_id));
    const redemptionHasDelivery = (r: any) => {
      const b = bookings.find(bk => bk.redemption_id === r.id);
      return r.status === "redeemed" || r.status === "completed" || (b && delByBooking.has(b.id));
    };
    const flaked = approvedReds.filter(r => !redemptionHasDelivery(r));
    const infRatings = (d.reviews as any[]).filter(r => r.review_type === "venue_to_influencer");
    const avgInfRating = infRatings.length ? infRatings.reduce((s, r) => s + r.rating, 0) / infRatings.length : 0;
    const redsPerInf: Record<string, number> = {};
    reds.forEach(r => { redsPerInf[r.influencer_id] = (redsPerInf[r.influencer_id] ?? 0) + 1; });
    const repeatInf = Object.values(redsPerInf).filter(c => c > 1).length;

    // 4. ROI / value
    const redeemedReds = reds.filter(r => (r.status === "redeemed" || r.status === "completed") && inRange(r.redeemed_at ?? r.created_at));
    const valueByVenue: Record<string, number> = {};
    let totalValue = 0;
    redeemedReds.forEach(r => {
      const o = offerById[r.offer_id];
      if (!o) return;
      const val = Number(o.discount_value ?? 0);
      totalValue += val;
      valueByVenue[o.venue_id] = (valueByVenue[o.venue_id] ?? 0) + val;
    });
    const valueRows = Object.entries(valueByVenue)
      .map(([vid, value]) => ({ venue: venueById[vid]?.name ?? "Unknown", value: value as number }))
      .sort((a, b) => b.value - a.value).slice(0, 10);

    const contentTypeCounts: Record<string, number> = {};
    delsInRange.forEach(x => {
      const t = x.content_type || "other";
      contentTypeCounts[t] = (contentTypeCounts[t] ?? 0) + 1;
    });
    const totalViews = delsInRange.reduce((s, x) => s + (x.views ?? 0), 0);
    const totalLikes = delsInRange.reduce((s, x) => s + (x.likes ?? 0), 0);
    const totalComments = delsInRange.reduce((s, x) => s + (x.comments ?? 0), 0);
    const costPerView = totalViews > 0 ? totalValue / totalViews : 0;

    // 5. Offer performance
    const viewsByOffer: Record<string, number> = {};
    (d.views as any[]).filter(v => inRange(v.created_at)).forEach(v => {
      viewsByOffer[v.offer_id] = (viewsByOffer[v.offer_id] ?? 0) + 1;
    });
    const appsByOffer: Record<string, number> = {};
    redsInRange.forEach(r => { appsByOffer[r.offer_id] = (appsByOffer[r.offer_id] ?? 0) + 1; });
    const filledOfferIds = new Set(reds.filter(r => filledStatuses.has(r.status)).map(r => r.offer_id));
    const fillRate = pct(offersInRange.filter(o => filledOfferIds.has(o.id)).length, offersInRange.length);
    const offerRows = offersInRange.map(o => ({
      id: o.id,
      title: o.title,
      venue: venueById[o.venue_id]?.name ?? "—",
      listingViews: viewsByOffer[o.id] ?? 0,
      applications: appsByOffer[o.id] ?? 0,
      filled: filledOfferIds.has(o.id),
      fill: perOfferFill.find(p => p.title === o.title)?.ms,
    })).sort((a, b) => b.applications - a.applications).slice(0, 20);

    // 6. Influencer quality & fit
    const ratingByInf: Record<string, { sum: number; n: number }> = {};
    infRatings.forEach(r => {
      const k = r.reviewed_id;
      ratingByInf[k] = ratingByInf[k] ?? { sum: 0, n: 0 };
      ratingByInf[k].sum += r.rating; ratingByInf[k].n += 1;
    });
    const applicantRows = (d.influencers as any[])
      .filter(p => activeInfIds.has(p.user_id))
      .map(p => ({
        name: p.full_name || t("admin.dashboard.influencerFallback"),
        followers: Math.max(p.followers_count ?? 0, p.tiktok_followers ?? 0),
        engagement: p.engagement_rate ?? 0,
        city: [p.city, p.country].filter(Boolean).join(", ") || "—",
        niche: (p.niche ?? []).slice(0, 3).join(", ") || "—",
        rating: ratingByInf[p.user_id] ? ratingByInf[p.user_id].sum / ratingByInf[p.user_id].n : null,
      }))
      .sort((a, b) => b.followers - a.followers).slice(0, 25);

    // 7. Delivery tracking
    const pipeline = redsInRange.map(r => {
      const b = bookings.find(bk => bk.redemption_id === r.id);
      const del = b ? dels.find(x => x.booking_id === b.id) : undefined;
      const stage = del?.status === "approved" ? "verified"
        : del ? "posted"
        : (r.status === "redeemed" || r.status === "completed") ? "in progress"
        : "claimed";
      const o = offerById[r.offer_id];
      return {
        id: r.id,
        offer: o?.title ?? "—",
        venue: o ? (venueById[o.venue_id]?.name ?? "—") : "—",
        influencer: (d.influencers as any[]).find(p => p.user_id === r.influencer_id)?.full_name ?? t("admin.dashboard.influencerFallback"),
        stage,
        link: del?.post_url || del?.content_url || null,
        disputed: !!del?.disputed,
        disputeReason: del?.dispute_reason ?? null,
      };
    }).sort((a, b) => (a.disputed === b.disputed ? 0 : a.disputed ? -1 : 1)).slice(0, 40);

    return {
      activeVenues: activeVenueIds.size, activeInfluencers: activeInfIds.size, followerTotal,
      openOffers: openOffers.length, liveOffers: liveOffers.length, totalOffers: offers.length,
      claimedOffers: claimedOfferIds.size, avgFill, offersPerVenue, offersOverTime,
      venuesWithOffers: venuesWithOffers.size, totalVenues: venues.length, repeatVenues,
      churnedVenues: churnedVenues.length, neverPostedVenues: neverPostedVenues.length, cityRows, categoryRows,
      approvedCount: approvedReds.length, flaked: flaked.length, avgInfRating,
      totalInfluencers: (d.influencers as any[]).length, repeatInf,
      totalValue, valueRows, contentTypeCounts, totalViews, totalLikes, totalComments, costPerView,
      fillRate, offerRows, applicantRows, pipeline,
      offersInRange: offersInRange.length,
      listingViewsTotal: Object.values(viewsByOffer).reduce((s: number, n: any) => s + n, 0),
    };
  }, [d, fromISO, toISO]);

  return (
    <DashboardLayout type="admin">
      <AdminPermissionGate permission="manage_analytics">
      <div className="animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Link to="/admin/analytics" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3 h-3" /> {t("admin.analyticsDeep.backToOverview")}
            </Link>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">{t("admin.analyticsDeep.titlePrefix")} <span className="text-gold">{t("navLabel.Analytics", "Analytics")}</span></h1>
            <p className="text-muted-foreground text-sm">{t("admin.analyticsDeep.subtitle", { range: rangeLabel })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
              <SelectTrigger className="w-44 bg-secondary border-border"><SelectValue /></SelectTrigger>
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
                    <CalendarIcon className="w-4 h-4 mr-2" />{customRange?.from ? rangeLabel : t("admin.analytics.pickDates")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="range" selected={customRange} onSelect={setCustomRange} numberOfMonths={2} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-secondary/50 animate-pulse" />)}
          </div>
        ) : (
          <Tabs defaultValue="health">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="health">{t("admin.analyticsDeep.marketplace")}</TabsTrigger>
              <TabsTrigger value="venue">{t("navLabel.Venues", "Venues")}</TabsTrigger>
              <TabsTrigger value="influencer">{t("navLabel.Influencers", "Influencers")}</TabsTrigger>
              <TabsTrigger value="roi">{t("admin.analyticsDeep.roi")}</TabsTrigger>
              <TabsTrigger value="offers">{t("admin.analyticsDeep.offerPerformance")}</TabsTrigger>
              <TabsTrigger value="quality">{t("admin.analyticsDeep.qualityFit")}</TabsTrigger>
              <TabsTrigger value="delivery">{t("admin.analyticsDeep.delivery")}</TabsTrigger>
            </TabsList>

            {/* 1 */}
            <TabsContent value="health" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Metric label={t("admin.analyticsDeep.activeVenuesLabel")} value={m.activeVenues} hint={t("admin.analyticsDeep.ofTotalVenues", { n: m.totalVenues })} />
                <Metric label={t("admin.analytics.activeInfluencers")} value={m.activeInfluencers} hint={t("admin.analyticsDeep.combinedFollowers", { n: m.followerTotal.toLocaleString() })} />
                <Metric label={t("admin.analyticsDeep.openOffers")} value={m.openOffers} hint={t("admin.analyticsDeep.ofAllOffers", { pct: pct(m.openOffers, m.totalOffers) })} />
                <Metric label={t("admin.analyticsDeep.claimedOffers")} value={m.claimedOffers} hint={t("admin.analyticsDeep.ofAllOffers", { pct: pct(m.claimedOffers, m.totalOffers) })} />
                <Metric label={t("admin.analyticsDeep.avgTimeToFill")} value={m.avgFill ? days(m.avgFill) : "—"} hint={t("admin.analyticsDeep.fillHint")} />
                <Metric label={t("admin.analyticsDeep.liveOffersNow")} value={m.liveOffers} hint={t("admin.analyticsDeep.activeNotExpired")} />
              </div>
              <NoteBox>
                {t("admin.analyticsDeep.fillNote")}
              </NoteBox>
            </TabsContent>

            {/* 2 */}
            <TabsContent value="venue" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Metric label={t("admin.analyticsDeep.repeatUsageRate")} value={pct(m.repeatVenues, m.venuesWithOffers)} hint={t("admin.analyticsDeep.repeatUsageHint", { n: m.repeatVenues })} />
                <Metric label={t("admin.analyticsDeep.churnRisk")} value={m.churnedVenues} hint={t("admin.analyticsDeep.noNewOffer30d")} />
                <Metric label={t("admin.analyticsDeep.noOfferYet")} value={m.neverPostedVenues} hint={t("admin.analyticsDeep.signedUpNeverPosted")} />
                <Metric label={t("admin.analyticsDeep.offersPostedInRange")} value={m.offersInRange} />
                <Metric label={t("admin.analyticsDeep.valueRedeemed")} value={`$${m.totalValue.toLocaleString()}`} hint={t("admin.analyticsDeep.basedOnOfferValue")} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Section title={t("admin.analyticsDeep.offersPerVenue")}>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={m.offersPerVenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
                <Section title={t("admin.analyticsDeep.offersOverTime")}>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={m.offersOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
                <Section title={t("admin.analyticsDeep.geoBreakdown")}>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {m.cityRows.map(r => (
                      <div key={r.city} className="flex justify-between text-sm p-2 rounded bg-secondary/50">
                        <span className="text-foreground">{r.city}</span>
                        <span className="text-muted-foreground">{t("admin.analyticsDeep.venuesOffersCount", { venues: r.venues, offers: r.offers })}</span>
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title={t("admin.analyticsDeep.categoryBreakdown")}>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {m.categoryRows.map(r => (
                      <div key={r.name} className="flex justify-between text-sm p-2 rounded bg-secondary/50">
                        <span className="text-foreground capitalize">{r.name}</span>
                        <span className="text-gold">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
              <NoteBox>
                {t("admin.analyticsDeep.costPerOfferNote")}
              </NoteBox>
            </TabsContent>

            {/* 3 */}
            <TabsContent value="influencer" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Metric label={t("admin.analyticsDeep.flakeRate")} value={pct(m.flaked, m.approvedCount)} hint={t("admin.analyticsDeep.flakeHint", { flaked: m.flaked, approved: m.approvedCount })} />
                <Metric label={t("admin.analyticsDeep.avgReliability")} value={m.avgInfRating ? m.avgInfRating.toFixed(2) : "—"} hint={t("admin.analyticsDeep.venueToInfReviews")} />
                <Metric label={t("admin.analyticsDeep.repeatParticipation")} value={pct(m.repeatInf, m.totalInfluencers)} hint={t("admin.analyticsDeep.repeatParticipationHint", { n: m.repeatInf })} />
                <Metric label={t("admin.analytics.activeInfluencers")} value={m.activeInfluencers} />
              </div>
            </TabsContent>

            {/* 4 */}
            <TabsContent value="roi" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Metric label={t("admin.analyticsDeep.totalValueRedeemed")} value={`$${m.totalValue.toLocaleString()}`} />
                <Metric label={t("admin.analyticsDeep.totalViews")} value={m.totalViews.toLocaleString()} hint={t("admin.analyticsDeep.likesCommentsHint", { likes: m.totalLikes.toLocaleString(), comments: m.totalComments.toLocaleString() })} />
                <Metric label={t("admin.analyticsDeep.costPerView")} value={m.costPerView ? `$${m.costPerView.toFixed(4)}` : "—"} />
                <Metric label={t("admin.analyticsDeep.contentPiecesReceived")} value={Object.values(m.contentTypeCounts).reduce((s: number, n: any) => s + n, 0)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Section title={t("admin.analyticsDeep.contentByType")}>
                  <div className="space-y-2">
                    {Object.entries(m.contentTypeCounts).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("admin.analyticsDeep.noContentInRange")}</p>
                    ) : Object.entries(m.contentTypeCounts).map(([ct, c]) => (
                      <div key={ct} className="flex justify-between text-sm p-2 rounded bg-secondary/50">
                        <span className="capitalize text-foreground">{ct}</span><span className="text-gold">{c as number}</span>
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title={t("admin.analyticsDeep.valuePerVenue")}>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {m.valueRows.length === 0 ? <p className="text-sm text-muted-foreground">{t("admin.analyticsDeep.noVisitsInRange")}</p> :
                      m.valueRows.map(r => (
                        <div key={r.venue} className="flex justify-between text-sm p-2 rounded bg-secondary/50">
                          <span className="text-foreground">{r.venue}</span><span className="text-gold">${r.value.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </Section>
              </div>
            </TabsContent>

            {/* 5 */}
            <TabsContent value="offers" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Metric label={t("admin.analyticsDeep.fillRate")} value={m.fillRate} hint={t("admin.analyticsDeep.fillRateHint")} />
                <Metric label={t("admin.analyticsDeep.listingViews")} value={m.listingViewsTotal} hint={t("admin.analyticsDeep.trackedSince")} />
                <Metric label={t("admin.analyticsDeep.applicationsReceived")} value={Object.values(m.offerRows).reduce((s: number, r: any) => s + r.applications, 0)} />
                <Metric label={t("admin.analyticsDeep.avgTimeToFill")} value={m.avgFill ? days(m.avgFill) : "—"} />
              </div>
              <NoteBox>
                {t("admin.analyticsDeep.listingViewsNote")}
              </NoteBox>
              <Section title={t("admin.analyticsDeep.perOfferPerformance")}>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left p-2">{t("navLabel.Offers", "Offer")}</th><th className="text-left p-2">{t("admin.events.venue")}</th>
                        <th className="text-right p-2">{t("admin.analyticsDeep.views")}</th><th className="text-right p-2">{t("admin.analyticsDeep.applications")}</th>
                        <th className="text-right p-2">{t("admin.analyticsDeep.filled")}</th><th className="text-right p-2">{t("admin.analyticsDeep.timeToFill")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.offerRows.map(r => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="p-2 text-foreground">{r.title}</td>
                          <td className="p-2 text-muted-foreground">{r.venue}</td>
                          <td className="p-2 text-right">{r.listingViews}</td>
                          <td className="p-2 text-right">{r.applications}</td>
                          <td className="p-2 text-right">{r.filled ? t("admin.analyticsDeep.yes") : t("admin.analyticsDeep.no")}</td>
                          <td className="p-2 text-right">{r.fill ? days(r.fill) : "—"}</td>
                        </tr>
                      ))}
                      {m.offerRows.length === 0 && <tr><td colSpan={6} className="p-4 text-muted-foreground text-center">{t("admin.analyticsDeep.noOffersInRange")}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Section>
            </TabsContent>

            {/* 6 */}
            <TabsContent value="quality" className="space-y-6 mt-6">
              <Section title={t("admin.analyticsDeep.influencersWhoClaimed")}>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left p-2">{t("navLabel.Influencers", "Influencer")}</th><th className="text-left p-2">{t("admin.analyticsDeep.location")}</th>
                        <th className="text-left p-2">{t("admin.creatorOps.niche")}</th><th className="text-right p-2">{t("admin.creatorOps.followers")}</th>
                        <th className="text-right p-2">{t("admin.analyticsDeep.engagement")}</th><th className="text-right p-2">{t("admin.moderation.rating")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.applicantRows.map(r => (
                        <tr key={r.name + r.followers} className="border-b border-border/50">
                          <td className="p-2 text-foreground">{r.name}</td>
                          <td className="p-2 text-muted-foreground">{r.city}</td>
                          <td className="p-2 text-muted-foreground">{r.niche}</td>
                          <td className="p-2 text-right">{r.followers.toLocaleString()}</td>
                          <td className="p-2 text-right">{r.engagement ? `${Number(r.engagement).toFixed(1)}%` : "—"}</td>
                          <td className="p-2 text-right">{r.rating ? r.rating.toFixed(1) : "—"}</td>
                        </tr>
                      ))}
                      {m.applicantRows.length === 0 && <tr><td colSpan={6} className="p-4 text-muted-foreground text-center">{t("admin.analyticsDeep.noApplicantsInRange")}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Section>
            </TabsContent>

            {/* 7 */}
            <TabsContent value="delivery" className="space-y-6 mt-6">
              <Section title={t("admin.analyticsDeep.deliveryPipeline")}>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left p-2">{t("navLabel.Offers", "Offer")}</th><th className="text-left p-2">{t("admin.events.venue")}</th>
                        <th className="text-left p-2">{t("navLabel.Influencers", "Influencer")}</th><th className="text-left p-2">{t("admin.venues.stage")}</th>
                        <th className="text-left p-2">{t("admin.chatbot.content", "Content")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.pipeline.map(r => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="p-2 text-foreground">{r.offer}</td>
                          <td className="p-2 text-muted-foreground">{r.venue}</td>
                          <td className="p-2 text-muted-foreground">{r.influencer}</td>
                          <td className="p-2">
                            <Badge variant="secondary" className="capitalize text-xs">{r.stage}</Badge>
                            {r.disputed && <Badge variant="destructive" className="ml-2 text-xs">{t("admin.analyticsDeep.disputed")}</Badge>}
                            {r.disputed && r.disputeReason && <p className="text-xs text-muted-foreground mt-1">{r.disputeReason}</p>}
                          </td>
                          <td className="p-2">
                            {r.link ? (
                              <a href={r.link} target="_blank" rel="noreferrer" className="text-gold inline-flex items-center gap-1">
                                {t("admin.moderation.view")} <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                      {m.pipeline.length === 0 && <tr><td colSpan={5} className="p-4 text-muted-foreground text-center">{t("admin.analyticsDeep.noClaimsInRange")}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Section>
              <NoteBox>
                {t("admin.analyticsDeep.deliveryNote")}
              </NoteBox>
            </TabsContent>
          </Tabs>
        )}
      </div>
      </AdminPermissionGate>
    </DashboardLayout>
  );
};

export default AdminAnalyticsDeep;
