import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
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
    return { fromISO: from.toISOString(), toISO: new Date().toISOString(), rangeLabel: `last ${n} days` };
  }, [rangeKey, customRange]);

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
    ).map(([vid, count]) => ({ name: venueById[vid]?.name ?? "Unknown", count: count as number }))
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
    const churnCutoff = now - 30 * 86400000;
    const churnedVenues = venues.filter(v => {
      const last = offers.filter(o => o.venue_id === v.id)
        .map(o => +new Date(o.created_at)).sort((a, b) => b - a)[0];
      return !last || last < churnCutoff;
    });

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
    venues.forEach(v => { const c = v.category || "Uncategorised"; byCategory[c] = (byCategory[c] ?? 0) + 1; });
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
        name: p.full_name || "Influencer",
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
        influencer: (d.influencers as any[]).find(p => p.user_id === r.influencer_id)?.full_name ?? "Influencer",
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
      churnedVenues: churnedVenues.length, cityRows, categoryRows,
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
      <div className="animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Link to="/admin/analytics" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3 h-3" /> Back to overview
            </Link>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Deep <span className="text-gold">Analytics</span></h1>
            <p className="text-muted-foreground text-sm">Marketplace, venue, influencer and delivery insight for the {rangeLabel}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
              <SelectTrigger className="w-44 bg-secondary border-border"><SelectValue /></SelectTrigger>
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
                    <CalendarIcon className="w-4 h-4 mr-2" />{customRange?.from ? rangeLabel : "Pick dates"}
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
              <TabsTrigger value="health">Marketplace</TabsTrigger>
              <TabsTrigger value="venue">Venues</TabsTrigger>
              <TabsTrigger value="influencer">Influencers</TabsTrigger>
              <TabsTrigger value="roi">ROI</TabsTrigger>
              <TabsTrigger value="offers">Offer performance</TabsTrigger>
              <TabsTrigger value="quality">Quality &amp; fit</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
            </TabsList>

            {/* 1 */}
            <TabsContent value="health" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Metric label="Active venues (posted an offer)" value={m.activeVenues} hint={`of ${m.totalVenues} total venues`} />
                <Metric label="Active influencers" value={m.activeInfluencers} hint={`${m.followerTotal.toLocaleString()} combined followers`} />
                <Metric label="Open offers" value={m.openOffers} hint={`${pct(m.openOffers, m.totalOffers)} of all offers`} />
                <Metric label="Claimed offers" value={m.claimedOffers} hint={`${pct(m.claimedOffers, m.totalOffers)} of all offers`} />
                <Metric label="Average time to fill" value={m.avgFill ? days(m.avgFill) : "—"} hint="Offer posted → first approved applicant" />
                <Metric label="Live offers right now" value={m.liveOffers} hint="Active and not expired" />
              </div>
              <NoteBox>
                Time-to-fill uses the creation time of the first approved application, since applications do not store a
                separate approval timestamp. Values are accurate to the application date.
              </NoteBox>
            </TabsContent>

            {/* 2 */}
            <TabsContent value="venue" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Metric label="Repeat usage rate" value={pct(m.repeatVenues, m.venuesWithOffers)} hint={`${m.repeatVenues} venues posted more than one offer`} />
                <Metric label="Venues at churn risk" value={m.churnedVenues} hint="No offer posted in the last 30 days" />
                <Metric label="Offers posted in range" value={m.offersInRange} />
                <Metric label="Value of redeemed offers" value={`$${m.totalValue.toLocaleString()}`} hint="Based on the offer value field" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Section title="Offers posted per venue">
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
                <Section title="Offers posted over time">
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
                <Section title="Geographic breakdown">
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {m.cityRows.map(r => (
                      <div key={r.city} className="flex justify-between text-sm p-2 rounded bg-secondary/50">
                        <span className="text-foreground">{r.city}</span>
                        <span className="text-muted-foreground">{r.venues} venues · {r.offers} offers</span>
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title="Category breakdown">
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
                Cost per offer uses the offer value stored on each offer. Offers created before that field was filled in show
                as $0 — set a value on new offers so this stays accurate.
              </NoteBox>
            </TabsContent>

            {/* 3 */}
            <TabsContent value="influencer" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Metric label="No-show / flake rate" value={pct(m.flaked, m.approvedCount)} hint={`${m.flaked} of ${m.approvedCount} approved applications never delivered`} />
                <Metric label="Average reliability rating" value={m.avgInfRating ? m.avgInfRating.toFixed(2) : "—"} hint="Venue-to-influencer reviews" />
                <Metric label="Repeat participation" value={pct(m.repeatInf, m.totalInfluencers)} hint={`${m.repeatInf} influencers with more than one claim`} />
                <Metric label="Active influencers" value={m.activeInfluencers} />
              </div>
            </TabsContent>

            {/* 4 */}
            <TabsContent value="roi" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Metric label="Total value redeemed" value={`$${m.totalValue.toLocaleString()}`} />
                <Metric label="Total views" value={m.totalViews.toLocaleString()} hint={`${m.totalLikes.toLocaleString()} likes · ${m.totalComments.toLocaleString()} comments`} />
                <Metric label="Cost per view" value={m.costPerView ? `$${m.costPerView.toFixed(4)}` : "—"} />
                <Metric label="Content pieces received" value={Object.values(m.contentTypeCounts).reduce((s: number, n: any) => s + n, 0)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Section title="Content received by type">
                  <div className="space-y-2">
                    {Object.entries(m.contentTypeCounts).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No content in this range.</p>
                    ) : Object.entries(m.contentTypeCounts).map(([t, c]) => (
                      <div key={t} className="flex justify-between text-sm p-2 rounded bg-secondary/50">
                        <span className="capitalize text-foreground">{t}</span><span className="text-gold">{c as number}</span>
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title="Value redeemed per venue">
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {m.valueRows.length === 0 ? <p className="text-sm text-muted-foreground">No redemptions in this range.</p> :
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
                <Metric label="Fill rate" value={m.fillRate} hint="Offers with at least one approved applicant" />
                <Metric label="Listing views" value={m.listingViewsTotal} hint="Tracked since 14 Aug 2026" />
                <Metric label="Applications received" value={Object.values(m.offerRows).reduce((s: number, r: any) => s + r.applications, 0)} />
                <Metric label="Average time to fill" value={m.avgFill ? days(m.avgFill) : "—"} />
              </div>
              <NoteBox>
                Offer listing view tracking started on 14 Aug 2026. Offers published before that date have no historical view
                counts, so early numbers under-report real interest.
              </NoteBox>
              <Section title="Per-offer performance">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left p-2">Offer</th><th className="text-left p-2">Venue</th>
                        <th className="text-right p-2">Views</th><th className="text-right p-2">Applications</th>
                        <th className="text-right p-2">Filled</th><th className="text-right p-2">Time to fill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.offerRows.map(r => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="p-2 text-foreground">{r.title}</td>
                          <td className="p-2 text-muted-foreground">{r.venue}</td>
                          <td className="p-2 text-right">{r.listingViews}</td>
                          <td className="p-2 text-right">{r.applications}</td>
                          <td className="p-2 text-right">{r.filled ? "Yes" : "No"}</td>
                          <td className="p-2 text-right">{r.fill ? days(r.fill) : "—"}</td>
                        </tr>
                      ))}
                      {m.offerRows.length === 0 && <tr><td colSpan={6} className="p-4 text-muted-foreground text-center">No offers in this range.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Section>
            </TabsContent>

            {/* 6 */}
            <TabsContent value="quality" className="space-y-6 mt-6">
              <Section title="Influencers who claimed offers in this range">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left p-2">Influencer</th><th className="text-left p-2">Location</th>
                        <th className="text-left p-2">Niche</th><th className="text-right p-2">Followers</th>
                        <th className="text-right p-2">Engagement</th><th className="text-right p-2">Rating</th>
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
                      {m.applicantRows.length === 0 && <tr><td colSpan={6} className="p-4 text-muted-foreground text-center">No applicants in this range.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Section>
            </TabsContent>

            {/* 7 */}
            <TabsContent value="delivery" className="space-y-6 mt-6">
              <Section title="Delivery pipeline">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left p-2">Offer</th><th className="text-left p-2">Venue</th>
                        <th className="text-left p-2">Influencer</th><th className="text-left p-2">Stage</th>
                        <th className="text-left p-2">Content</th>
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
                            {r.disputed && <Badge variant="destructive" className="ml-2 text-xs">Disputed</Badge>}
                            {r.disputed && r.disputeReason && <p className="text-xs text-muted-foreground mt-1">{r.disputeReason}</p>}
                          </td>
                          <td className="p-2">
                            {r.link ? (
                              <a href={r.link} target="_blank" rel="noreferrer" className="text-gold inline-flex items-center gap-1">
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                      {m.pipeline.length === 0 && <tr><td colSpan={5} className="p-4 text-muted-foreground text-center">No claims in this range.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Section>
              <NoteBox>
                Venues can flag a delivery from their Content page. Flagged items appear here and in the Moderation queue for
                admin review.
              </NoteBox>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalyticsDeep;
