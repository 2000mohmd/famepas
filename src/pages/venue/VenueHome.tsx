import DashboardLayout from "@/components/DashboardLayout";
import CreatorPhoto from "@/components/CreatorPhoto";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Megaphone, CalendarDays, Film, ShieldCheck, Plus, ArrowRight, Check } from "lucide-react";
import { format } from "date-fns";

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M+`
  : n >= 1_000 ? `${Math.round(n / 1_000)}K`
  : String(n);

/** Adnan, Venue Portal items 3 & 4 + recap E1, laid out after Collabfront's
 * venue home: welcome header, a setup stepper driven by real data, social
 * proof, then live activity. */
const VenueHome = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<any>(null);
  const [liveCampaigns, setLiveCampaigns] = useState<any[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<any[]>([]);
  const [recentContent, setRecentContent] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);
  const [setup, setSetup] = useState({ profile: false, instagram: false, offer: false, applications: false });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: v } = await supabase.from("venues").select("id, name, approval_status, logo_url, description, instagram_handle").eq("owner_id", user.id)
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      setVenue(v);
      if (!v || v.approval_status !== "approved") { setLoading(false); return; }

      const [campaigns, bookings, deliverables, anyCampaign, offerRows] = await Promise.all([
        supabase.from("campaigns").select("id, title, status, cover_image_url").eq("venue_id", v.id).eq("status", "active").limit(5),
        supabase.from("bookings").select("id, influencer_id, scheduled_date, offers(title)").eq("venue_id", v.id)
          .eq("status", "upcoming").order("scheduled_date", { ascending: true }).limit(5),
        supabase.from("deliverables").select("id, platform, submitted_at, post_url, bookings!inner(venue_id, influencer_id)")
          .eq("bookings.venue_id", v.id).order("submitted_at", { ascending: false, nullsFirst: false }).limit(5),
        supabase.from("campaigns").select("id", { head: true, count: "exact" }).eq("venue_id", v.id),
        supabase.from("offers").select("id").eq("venue_id", v.id),
      ]);
      setLiveCampaigns(campaigns.data ?? []);

      const offerIds = (offerRows.data ?? []).map((o: any) => o.id);
      const apps = offerIds.length
        ? await supabase.from("offer_redemptions").select("id", { head: true, count: "exact" }).in("offer_id", offerIds)
        : { count: 0 };
      setSetup({
        profile: !!(v as any).logo_url && !!(v as any).description,
        instagram: !!(v as any).instagram_handle,
        offer: (anyCampaign.count ?? 0) > 0 || offerIds.length > 0,
        applications: (apps.count ?? 0) > 0,
      });

      const bks = bookings.data ?? [];
      const infIds = [...new Set(bks.map((b: any) => b.influencer_id))];
      const delIds = [...new Set((deliverables.data ?? []).map((d: any) => (d as any).bookings?.influencer_id))].filter(Boolean);
      const allIds = [...new Set([...infIds, ...delIds])];
      const profiles: Record<string, any> = {};
      if (allIds.length) {
        const { data: profs } = await supabase.rpc("get_public_profiles_basic", { _user_ids: allIds });
        (profs ?? []).forEach((p: any) => { profiles[p.user_id] = p; });
      }
      setUpcomingVisits(bks.map((b: any) => ({ ...b, profile: profiles[b.influencer_id] })));
      setRecentContent((deliverables.data ?? []).map((d: any) => ({ ...d, profile: profiles[(d as any).bookings?.influencer_id] })));
      const { data: top } = await (supabase as any).rpc("get_top_creators", { _limit: 6 });
      setTopCreators(top ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout type="venue">
        <div className="text-center text-muted-foreground py-24">{t("common.loading")}</div>
      </DashboardLayout>
    );
  }

  if (!venue || venue.approval_status === "pending") {
    return (
      <DashboardLayout type="venue">
        <Card className="max-w-lg mx-auto mt-16">
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground">{t("venueHome.underReviewTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("venueHome.underReviewSub")}</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (venue.approval_status === "rejected") {
    return (
      <DashboardLayout type="venue">
        <Card className="max-w-lg mx-auto mt-16">
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <h1 className="text-xl font-bold text-foreground">{t("venueHome.rejectedTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("venueHome.rejectedSub")}</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const steps = [
    { done: setup.profile, title: t("venueHome.stepProfile"), sub: t("venueHome.stepProfileSub"), to: "/venue/settings" },
    { done: setup.instagram, title: t("venueHome.stepInstagram"), sub: t("venueHome.stepInstagramSub"), to: "/venue/settings?tab=integrations" },
    { done: setup.offer, title: t("venueHome.stepOffer"), sub: t("venueHome.stepOfferSub"), to: "/venue/campaigns/new" },
    { done: setup.applications, title: t("venueHome.stepApplications"), sub: t("venueHome.stepApplicationsSub"), to: "/venue/bookings" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const nextIndex = steps.findIndex((s) => !s.done);
  const setupComplete = nextIndex === -1;

  const stats = [
    { icon: Megaphone, label: t("venueHome.liveOffers"), value: liveCampaigns.length, to: "/venue/campaigns" },
    { icon: CalendarDays, label: t("venueHome.upcomingVisits"), value: upcomingVisits.length, to: "/venue/bookings" },
    { icon: Film, label: t("venueHome.contentReceived"), value: recentContent.length, to: "/venue/content" },
  ];

  return (
    <DashboardLayout type="venue">
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
              {t("venueHome.welcome")}, {venue.name} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {setupComplete ? t("venueHome.subtitleReady") : t("venueHome.subtitleSetup")}
            </p>
          </div>
          <Button asChild size="lg" className="rounded-xl font-semibold">
            <Link to="/venue/campaigns/new"><Plus /> {t("venueHome.createOffer")}</Link>
          </Button>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
          {!setupComplete ? (
            <section className="rounded-3xl p-6 md:p-9" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold">{t("venueHome.setupTitle")}</h2>
                  <p className="mt-2 opacity-70">{t("venueHome.setupSub")}</p>
                </div>
                <span className="text-sm font-bold whitespace-nowrap" style={{ color: "hsl(var(--gold-light))" }}>
                  {t("venueHome.stepsDone", { done: doneCount, total: steps.length })}
                </span>
              </div>
              <div className="h-1.5 rounded-full mt-6 mb-6 overflow-hidden" style={{ background: "hsl(var(--venue-brand-foreground) / .15)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(doneCount / steps.length) * 100}%`, background: "hsl(var(--primary))" }} />
              </div>
              <ol className="space-y-2">
                {steps.map((s, i) => {
                  const active = i === nextIndex;
                  return (
                    <li key={s.title}>
                      <Link
                        to={s.to}
                        className={`flex items-center gap-5 rounded-2xl px-5 py-4 transition ${active ? "" : "opacity-60 hover:opacity-90"}`}
                        style={active ? { background: "hsl(var(--venue-brand-foreground) / .08)" } : undefined}
                      >
                        <span
                          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-base font-bold border-2"
                          style={s.done
                            ? { background: "hsl(var(--primary))", borderColor: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }
                            : { borderColor: active ? "hsl(var(--primary))" : "hsl(var(--venue-brand-foreground) / .35)", color: active ? "hsl(var(--primary))" : "inherit" }}
                        >
                          {s.done ? <Check className="w-5 h-5" /> : i + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-lg font-bold ${s.done ? "line-through" : ""}`}>{s.title}</span>
                          <span className="block text-sm opacity-70">{s.sub}</span>
                        </span>
                        {active && <ArrowRight className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--primary))" }} />}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map(({ icon: Icon, label, value, to }) => (
                <Link key={label} to={to} className="rounded-3xl bg-card border border-border p-6 hover:border-primary transition flex flex-col justify-between min-h-[160px]">
                  <Icon className="w-6 h-6" style={{ color: "hsl(var(--venue-brand))" }} />
                  <div>
                    <p className="text-4xl font-extrabold text-foreground">{value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{label}</p>
                  </div>
                </Link>
              ))}
            </section>
          )}

          <section className="rounded-3xl p-7 md:p-9 flex flex-col justify-between" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">{t("venueHome.proofTitle")}</h2>
              <p className="mt-4 opacity-75 leading-relaxed">{t("venueHome.proofSub")}</p>
            </div>
            {topCreators.length > 0 && (
              <div className="flex mt-8">
                {topCreators.slice(0, 6).map((c, i) => {
                  const f = Math.max(c.followers_count ?? 0, c.tiktok_followers ?? 0);
                  return (
                    <Link key={c.user_id} to={`/venue/creator/${c.user_id}`} className="relative flex flex-col items-center" style={{ marginLeft: i ? -10 : 0, zIndex: 10 - i }}>
                      <CreatorPhoto src={c.avatar_url} name={c.full_name} className="w-16 h-16 rounded-full object-cover border-2" style={{ borderColor: "hsl(var(--venue-brand))" }} />
                      {f > 0 && (
                        <span className="-mt-2 rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }}>
                          {compact(f)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
            <Link to="/venue/discover" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "hsl(var(--gold-light))" }}>
              {t("venueHome.discoverCreators")} <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ActivityCard icon={Megaphone} title={t("venueHome.liveOffers")} to="/venue/campaigns" viewAll={t("venueHome.viewAll")}>
            {liveCampaigns.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">{t("venueHome.noLiveOffers")}</p>
                <Button size="sm" asChild><Link to="/venue/campaigns/new">{t("venueHome.createFirstOffer")}</Link></Button>
              </div>
            ) : liveCampaigns.map((c) => (
              <Link key={c.id} to="/venue/campaigns" className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60">
                {c.cover_image_url ? <img src={c.cover_image_url} alt="" className="w-11 h-11 rounded-xl object-cover" /> : <div className="w-11 h-11 rounded-xl bg-muted" />}
                <span className="text-sm font-semibold truncate">{c.title}</span>
              </Link>
            ))}
          </ActivityCard>

          <ActivityCard icon={CalendarDays} title={t("venueHome.upcomingVisits")} to="/venue/bookings" viewAll={t("venueHome.viewAll")}>
            {upcomingVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("venueHome.noUpcomingVisits")}</p>
            ) : upcomingVisits.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60">
                <Avatar profile={b.profile} />
                <span className="text-sm font-semibold truncate flex-1">{b.profile?.full_name ?? t("venueHome.creatorFallback")}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {b.scheduled_date ? format(new Date(b.scheduled_date), "MMM d") : t("venueHome.tbd")}
                </span>
              </div>
            ))}
          </ActivityCard>

          <ActivityCard icon={Film} title={t("venueHome.contentReceived")} to="/venue/content" viewAll={t("venueHome.viewAll")}>
            {recentContent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("venueHome.noContentYet")}</p>
            ) : recentContent.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60">
                <Avatar profile={d.profile} />
                <span className="text-sm font-semibold truncate flex-1">{d.profile?.full_name ?? t("venueHome.creatorFallback")}</span>
                <span className="text-xs text-muted-foreground capitalize">{d.platform}</span>
              </div>
            ))}
          </ActivityCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Avatar = ({ profile }: { profile: any }) =>
  profile?.avatar_url
    ? <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
    : <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{(profile?.full_name || "FP").slice(0, 2).toUpperCase()}</span>;

const ActivityCard = ({ icon: Icon, title, to, viewAll, children }: { icon: any; title: string; to: string; viewAll: string; children: React.ReactNode }) => (
  <section className="rounded-3xl bg-card border border-border p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-foreground flex items-center gap-2"><Icon className="w-4 h-4" /> {title}</h2>
      <Link to={to} className="text-xs font-semibold text-muted-foreground hover:text-foreground">{viewAll}</Link>
    </div>
    <div className="space-y-1">{children}</div>
  </section>
);

export default VenueHome;
