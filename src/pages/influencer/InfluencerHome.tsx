import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, ChevronRight, Search, Sparkles, Send, CalendarDays, CheckCircle, Star, AlertTriangle, ArrowRight, Award, Instagram } from "lucide-react";
import { VenueHero, HeroButton, BrandButton, VenueEmpty } from "@/components/venue/VenueUI";
import OfferTile from "@/components/influencer/OfferTile";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { prettyLabel } from "@/lib/format";

/** The one creator home: activity at a glance + discovery. Replaces the old
 * separate Dashboard and Home pages, which repeated the same content. */
const InfluencerHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: profile } = useQuery({
    queryKey: ["influencer-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["influencer-stats", user?.id],
    queryFn: async () => {
      const [invitations, bookingsUpcoming, bookingsCompleted] = await Promise.all([
        supabase.from("invitations").select("id", { count: "exact", head: true }).eq("influencer_id", user!.id).eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("influencer_id", user!.id).eq("status", "upcoming"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("influencer_id", user!.id).eq("status", "completed"),
      ]);
      return {
        pendingInvitations: invitations.count ?? 0,
        upcomingBookings: bookingsUpcoming.count ?? 0,
        completedVisits: bookingsCompleted.count ?? 0,
      };
    },
    enabled: !!user,
  });

  // Adnan, "Influencer Portal" item 57: prompt to rate a venue after a completed visit.
  const { data: unreviewedCount } = useQuery({
    queryKey: ["unreviewed-bookings-count", user?.id],
    queryFn: async () => {
      const { data: bks } = await supabase.from("bookings").select("id").eq("influencer_id", user!.id).eq("status", "completed");
      const bookingIds = (bks ?? []).map((b: any) => b.id);
      if (!bookingIds.length) return 0;
      const { data: existing } = await supabase.from("reviews").select("booking_id").eq("reviewer_id", user!.id).in("booking_id", bookingIds);
      const reviewed = new Set((existing ?? []).map((r: any) => r.booking_id));
      return bookingIds.filter((id: string) => !reviewed.has(id)).length;
    },
    enabled: !!user,
  });

  const { data: rewardPoints } = useQuery({
    queryKey: ["reward-points", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reward_points").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: warnings } = useQuery({
    queryKey: ["influencer-warnings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("influencer_warnings" as any).select("*").eq("influencer_id", user!.id).order("created_at", { ascending: false }).limit(5);
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-active"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: venues } = useQuery({
    queryKey: ["all-venues-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("venues")
        .select("id, name, category, city, logo_url, cover_image_url, created_at")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .limit(30)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: offers } = useQuery({
    queryKey: ["all-offers-home"],
    queryFn: async () => {
      // Never surface offers whose run has already ended — Explore hides them too.
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("offers")
        .select("*, venues(name, city, category, logo_url, cover_image_url), categories(id, name)")
        .eq("is_active", true)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .limit(60)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const offersByCategory = (cat: any) => {
    const norm = (cat.name || "").trim().toLowerCase();
    return (offers ?? []).filter((o: any) => {
      if (o.category_id && o.category_id === cat.id) return true;
      const c = (o.categories?.name || o.venues?.category || "").trim().toLowerCase();
      return c === norm;
    });
  };

  const profileStrength = (() => {
    if (!profile) return 0;
    let score = 0;
    if (profile.full_name) score += 15;
    if (profile.bio) score += 15;
    if (profile.avatar_url) score += 15;
    if (profile.instagram_handle) score += 15;
    if (profile.tiktok_handle) score += 10;
    if (profile.niche && profile.niche.length > 0) score += 15;
    if (profile.phone) score += 15;
    return score;
  })();

  // Adnan, "Creator Page fixes" #7: full name everywhere, with the handle underneath.
  const firstName = (profile?.full_name || "there").split(" ")[0];
  const handle = (profile?.social_links as any)?.username as string | undefined;

  // Adnan, "Creator Page fixes" #2: a venue with no live offer shouldn't show as Featured.
  const venueIdsWithLiveOffers = new Set((offers ?? []).map((o: any) => o.venue_id));
  const featuredVenues = (venues ?? []).filter((v) => venueIdsWithLiveOffers.has(v.id));
  const categoryRows = (categories ?? []).map((cat: any) => ({ cat, items: offersByCategory(cat) })).filter((r) => r.items.length > 0);

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-10">
        <VenueHero
          eyebrow={handle ? `@${handle}` : "Your FamePass"}
          title={<>{t("influencerHome.greeting")}, {firstName} <span aria-hidden>👋</span></>}
          subtitle={t("influencerHome.subtitle")}
          actions={<>
            <HeroButton to="/influencer/explore"><MapPin /> {t("influencerHome.exploreMap")}</HeroButton>
            <HeroButton variant="ghost" to="/influencer/bookings">{t("influencerHome.myBookings")}</HeroButton>
          </>}
          aside={
            <div className="space-y-5">
              <form onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); navigate(`/influencer/explore${q ? `?venue=${encodeURIComponent(String(q))}` : ""}`); }} className="relative max-w-2xl">
                <input name="q" placeholder="Search venues, offers or cities" className="w-full h-16 rounded-2xl pl-6 pr-20 text-base border-0 outline-none placeholder:opacity-60"
                  style={{ background: "hsl(var(--venue-brand-foreground) / .12)", color: "hsl(var(--venue-brand-foreground))" }} />
                <button type="submit" aria-label="Search" className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }}>
                  <Search className="w-5 h-5" />
                </button>
              </form>
              <div className="grid grid-cols-3 gap-3 max-w-3xl">
                {[
                  { icon: Send, label: "Invitations", value: stats?.pendingInvitations ?? 0, to: "/influencer/invitations" },
                  { icon: CalendarDays, label: "Upcoming visits", value: stats?.upcomingBookings ?? 0, to: "/influencer/bookings" },
                  { icon: CheckCircle, label: "Completed", value: stats?.completedVisits ?? 0, to: "/influencer/bookings" },
                ].map(({ icon: Icon, label, value, to }) => (
                  <button key={label} type="button" onClick={() => navigate(to)} className="text-left rounded-2xl px-4 py-3.5 flex items-center gap-3 transition hover:brightness-110"
                    style={{ background: "hsl(var(--venue-brand-foreground) / .07)", border: "1px solid hsl(var(--venue-brand-foreground) / .12)" }}>
                    <Icon className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                    <span className="min-w-0">
                      <span className="block text-2xl font-extrabold leading-none">{value}</span>
                      <span className="block text-[11px] mt-1 opacity-70 truncate">{label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {!!unreviewedCount && unreviewedCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-card border border-border p-5 shadow-[var(--venue-shadow)]">
            <div className="flex items-center gap-4">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / .2)" }}><Star className="w-5 h-5" style={{ color: "hsl(var(--venue-brand))" }} /></span>
              <div>
                <p className="font-extrabold text-foreground">Rate your visit{unreviewedCount > 1 ? "s" : ""}</p>
                <p className="text-sm text-muted-foreground">You have {unreviewedCount} completed visit{unreviewedCount > 1 ? "s" : ""} waiting for a review.</p>
              </div>
            </div>
            <BrandButton to="/influencer/reviews">Rate now</BrandButton>
          </div>
        )}

        {warnings && warnings.length > 0 && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-extrabold text-red-700">Warnings from the FamePass team</h3>
            </div>
            <div className="space-y-2">
              {warnings.map((w: any) => (
                <div key={w.id} className="p-4 rounded-2xl bg-white border border-red-100">
                  <p className="text-sm text-neutral-800">{w.warning_message}</p>
                  <p className="text-xs text-neutral-500 mt-1">{new Date(w.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-[2rem] bg-card border border-border p-6 md:p-7 shadow-[var(--venue-shadow)] flex items-center gap-6">
            <span className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--venue-brand))" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${profileStrength * 0.974} 97.4`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-foreground">{profileStrength}%</span>
            </span>
            <div>
              <p className="text-lg font-extrabold text-foreground">Profile strength</p>
              <p className="text-sm text-muted-foreground mt-1">{profileStrength < 100 ? "Complete profiles get picked by venues far more often." : "Your profile is complete — nice."}</p>
              {profileStrength < 100 && <button type="button" onClick={() => navigate("/influencer/profile")} className="mt-3 inline-flex items-center gap-1 text-sm font-bold" style={{ color: "hsl(var(--venue-brand))" }}>Complete profile <ArrowRight className="w-4 h-4" /></button>}
            </div>
          </div>

          <button type="button" onClick={() => navigate("/influencer/rewards")} className="text-left rounded-[2rem] p-6 md:p-7 flex items-center gap-5 transition hover:brightness-105"
            style={{ background: "linear-gradient(135deg, hsl(var(--gold-light)), hsl(var(--primary)))", color: "hsl(var(--venue-brand))" }}>
            <span className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--venue-brand))" }}><Award className="w-8 h-8" style={{ color: "hsl(var(--primary))" }} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">Your tier</p>
              <p className="text-2xl font-extrabold">{prettyLabel(rewardPoints?.tier ?? "bronze")}</p>
              <p className="text-sm opacity-80">{rewardPoints?.points ?? 0} points · view rewards</p>
            </div>
          </button>

          {profile && !profile.instagram_verified ? (
            <div className="rounded-[2rem] p-6 md:p-7 text-white flex flex-col justify-between gap-4" style={{ background: "linear-gradient(135deg,#f09433,#dc2743 55%,#bc1888)" }}>
              <div>
                <Instagram className="w-7 h-7 mb-3" />
                <p className="text-lg font-extrabold">Connect your Instagram</p>
                <p className="text-sm text-white/85 mt-1">Venues need your real followers before you can apply.</p>
              </div>
              <button type="button" onClick={() => navigate("/influencer/settings")} className="self-start h-11 px-5 rounded-full bg-white text-neutral-900 text-sm font-bold">Connect now</button>
            </div>
          ) : (
            <button type="button" onClick={() => navigate("/influencer/invitations")} className="text-left rounded-[2rem] bg-card border border-border p-6 md:p-7 shadow-[var(--venue-shadow)] hover:border-primary transition">
              <Send className="w-7 h-7 mb-3" style={{ color: "hsl(var(--venue-brand))" }} />
              <p className="text-lg font-extrabold text-foreground">Invitations</p>
              <p className="text-sm text-muted-foreground mt-1">Venues can invite you directly — check your inbox.</p>
            </button>
          )}
        </div>

        {/* Categories */}
        <section>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-5">{t("influencerHome.browseByCategory")}</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories?.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/influencer/explore?category=${cat.name}`)}
                className="group relative flex-shrink-0 w-[180px] h-[220px] rounded-3xl overflow-hidden text-left"
                style={{ background: "linear-gradient(135deg, hsl(var(--venue-brand)), hsl(0 60% 26%))" }}
              >
                {cat.image_url
                  ? <img src={cat.image_url} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition duration-500" />
                  : <span className="absolute inset-0 flex items-center justify-center text-5xl opacity-90">{cat.icon || "✨"}</span>}
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <span className="absolute left-4 right-4 bottom-4 text-white font-extrabold text-lg leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {categoryRows.map(({ cat, items }) => (
          <section key={cat.id}>
            <div className="flex items-end justify-between mb-5">
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">{cat.name}</h2>
              <button type="button" onClick={() => navigate(`/influencer/explore?category=${cat.name}`)} className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: "hsl(var(--venue-brand))" }}>
                {t("influencerHome.viewAll")} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
              {items.map((offer: any) => <OfferTile key={offer.id} offer={offer} className="flex-shrink-0 w-[270px]" />)}
            </div>
          </section>
        ))}

        {/* Offers that didn't match any category still deserve a place. */}
        {categoryRows.length === 0 && (offers ?? []).length > 0 && (
          <section>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-5">New offers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {(offers ?? []).slice(0, 6).map((offer: any) => <OfferTile key={offer.id} offer={offer} />)}
            </div>
          </section>
        )}

        {featuredVenues.length > 0 && (
          <section>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-5">{t("influencerHome.featuredVenues")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {featuredVenues.slice(0, 6).map((venue) => (
                <button key={venue.id} type="button" onClick={() => navigate(`/influencer/explore?venue=${venue.name}`)}
                  className="group text-left rounded-3xl bg-card border border-border p-2.5 shadow-[var(--venue-shadow)] hover:border-primary transition">
                  <div className="relative rounded-[1.4rem] overflow-hidden aspect-[16/10] bg-muted">
                    {venue.cover_image_url
                      ? <img src={venue.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.04] transition duration-500" />
                      : <div className="w-full h-full" style={{ background: "linear-gradient(135deg, hsl(var(--venue-brand)), hsl(0 60% 26%))" }} />}
                  </div>
                  <div className="flex items-center gap-3 px-2 pt-4 pb-2">
                    {venue.logo_url
                      ? <img src={venue.logo_url} alt="" className="w-11 h-11 rounded-full object-cover border border-border bg-white" />
                      : <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / .2)" }}><Building2 className="w-5 h-5" style={{ color: "hsl(var(--venue-brand))" }} /></span>}
                    <div className="min-w-0">
                      <p className="font-extrabold text-foreground truncate">{venue.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {venue.city || t("influencerHome.na")} · <span className="capitalize">{venue.category}</span></p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {(offers ?? []).length === 0 && (
          <VenueEmpty compact icon={Sparkles} title="Offers are on their way" body="Venues are setting up their first offers. Browse by category above, and check back soon — new ones go live every week."
            actions={<BrandButton to="/influencer/explore"><Search /> {t("influencerHome.viewAllVenuesOffers")}</BrandButton>} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default InfluencerHome;
