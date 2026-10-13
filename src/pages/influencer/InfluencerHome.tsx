import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, ChevronRight, Search, Sparkles } from "lucide-react";
import { VenueHero, HeroButton, BrandButton, VenueEmpty } from "@/components/venue/VenueUI";
import OfferTile from "@/components/influencer/OfferTile";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const InfluencerHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, social_links")
        .eq("user_id", user!.id)
        .single();
      return data;
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
        .select("id, name, description, category, categories, city, country, address, latitude, longitude, logo_url, cover_image_url, website, is_active, approval_status, created_at")
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

  const venuesByCategory = (catName: string) => {
    const norm = catName.trim().toLowerCase();
    return venues?.filter((v) => (v.category || "").trim().toLowerCase() === norm) ?? [];
  };

  const offersByCategory = (cat: any) => {
    const norm = (cat.name || "").trim().toLowerCase();
    return (
      offers?.filter((o: any) => {
        if (o.category_id && o.category_id === cat.id) return true;
        const c = (o.categories?.name || o.venues?.category || "").trim().toLowerCase();
        return c === norm;
      }) ?? []
    );
  };

  // Adnan, "Creator Page fixes" #7: full name everywhere, with the handle underneath.
  const fullName = profile?.full_name || "there";
  const handle = (profile?.social_links as any)?.username as string | undefined;

  // Adnan, "Creator Page fixes" #2: a venue with no live offer shouldn't show as Featured.
  const venueIdsWithLiveOffers = new Set((offers ?? []).map((o: any) => o.venue_id));
  const featuredVenues = (venues ?? []).filter((v) => venueIdsWithLiveOffers.has(v.id));

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-10">
        <VenueHero
          eyebrow="Discover"
          title={<>{t("influencerHome.greeting")}, {fullName.split(" ")[0]} <span aria-hidden>👋</span></>}
          subtitle={<>{handle && <span className="font-semibold">@{handle} · </span>}{t("influencerHome.subtitle")}</>}
          actions={<>
            <HeroButton to="/influencer/explore"><MapPin /> {t("influencerHome.exploreMap")}</HeroButton>
            <HeroButton variant="ghost" to="/influencer/bookings">{t("influencerHome.myBookings")}</HeroButton>
          </>}
          aside={
            <form onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); navigate(`/influencer/explore${q ? `?venue=${encodeURIComponent(String(q))}` : ""}`); }} className="relative max-w-2xl">
              <input name="q" placeholder="Search venues, offers or cities" className="w-full h-16 rounded-2xl pl-6 pr-20 text-base border-0 outline-none placeholder:opacity-60"
                style={{ background: "hsl(var(--venue-brand-foreground) / .12)", color: "hsl(var(--venue-brand-foreground))" }} />
              <button type="submit" aria-label="Search" className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }}>
                <Search className="w-5 h-5" />
              </button>
            </form>
          }
        />

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

        {/* Per-category carousels */}
        {categories?.map((cat: any) => {
          const catOffers = offersByCategory(cat);
          if (catOffers.length === 0) return null;
          return (
            <section key={cat.id}>
              <div className="flex items-end justify-between mb-5">
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">{cat.name}</h2>
                <button type="button" onClick={() => navigate(`/influencer/explore?category=${cat.name}`)} className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: "hsl(var(--venue-brand))" }}>
                  {t("influencerHome.viewAll")} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
                {catOffers.map((offer: any) => <OfferTile key={offer.id} offer={offer} className="flex-shrink-0 w-[270px]" />)}
              </div>
            </section>
          );
        })}

        {/* Featured venues */}
        {featuredVenues.length > 0 ? (
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
        ) : (offers ?? []).length === 0 && (
          <VenueEmpty compact icon={Sparkles} title="Offers are on their way" body="Venues are setting up their first offers. Browse by category above, and check back soon — new ones go live every week."
            actions={<BrandButton to="/influencer/explore"><Search /> {t("influencerHome.viewAllVenuesOffers")}</BrandButton>} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default InfluencerHome;
