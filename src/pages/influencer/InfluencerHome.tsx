import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, ChevronRight, Star, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

const InfluencerHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
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
        .select("*")
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
      const { data } = await supabase
        .from("offers")
        .select("*, venues(name, city, category, logo_url, cover_image_url, image_url), categories(id, name)")
        .eq("is_active", true)
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

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-8">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/30 to-accent/20 border border-border p-8">
          <h1 className="text-3xl font-display font-bold text-foreground">
            Welcome back, <span className="text-gold">{firstName}</span> 👋
          </h1>
          <p className="text-muted-foreground mt-2">Discover venues and exclusive offers curated for you</p>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => navigate("/influencer/explore")} className="gap-2">
              <MapPin className="w-4 h-4" /> Explore Map
            </Button>
            <Button variant="outline" onClick={() => navigate("/influencer/bookings")}>
              My Bookings
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold text-foreground">Browse by Category</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/influencer/explore?category=${cat.name}`)}
                className="flex-shrink-0 flex flex-col items-center gap-2 px-6 py-4 rounded-xl bg-card border border-border hover:border-gold/40 transition-all min-w-[100px]"
              >
                <span className="text-2xl">{cat.icon || "🏢"}</span>
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Per-category carousels */}
        {categories?.map((cat) => {
          const catVenues = venuesByCategory(cat.name);
          const catOffers = offersByCategory(cat.name);
          if (catVenues.length === 0 && catOffers.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                  <span>{cat.icon || "🏢"}</span> {cat.name}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gold"
                  onClick={() => navigate(`/influencer/explore?category=${cat.name}`)}
                >
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Venues carousel */}
              {catVenues.length > 0 && (
                <ScrollCarousel>
                  {catVenues.map((venue) => (
                    <VenueCard
                      key={venue.id}
                      venue={venue}
                      offerCount={offers?.filter((o: any) => o.venue_id === venue.id).length ?? 0}
                      onClick={() => navigate(`/influencer/explore?venue=${venue.name}`)}
                    />
                  ))}
                </ScrollCarousel>
              )}

              {/* Offers carousel */}
              {catOffers.length > 0 && (
                <ScrollCarousel>
                  {catOffers.map((offer: any) => (
                    <OfferCard key={offer.id} offer={offer} onClick={() => navigate("/influencer/explore")} />
                  ))}
                </ScrollCarousel>
              )}
            </div>
          );
        })}

        {/* Featured Venues */}
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground mb-4">Featured Venues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues?.slice(0, 6).map((venue) => (
              <Card
                key={venue.id}
                className="cursor-pointer hover:border-gold/30 transition-all overflow-hidden"
                onClick={() => navigate(`/influencer/explore?venue=${venue.name}`)}
              >
                {venue.cover_image_url && (
                  <img src={venue.cover_image_url} alt={venue.name} className="w-full h-36 object-cover" />
                )}
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    {venue.logo_url ? (
                      <img src={venue.logo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gold" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{venue.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {venue.city || "N/A"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{venue.category}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-center mt-6">
            <Button variant="outline" onClick={() => navigate("/influencer/explore")}>
              View all venues & offers
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Reusable horizontal scroll wrapper
const ScrollCarousel = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {children}
    </div>
  );
};

const VenueCard = ({ venue, offerCount, onClick }: { venue: any; offerCount: number; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="flex-shrink-0 w-[260px] rounded-xl bg-card border border-border hover:border-gold/30 transition-all cursor-pointer overflow-hidden"
  >
    {venue.cover_image_url ? (
      <img src={venue.cover_image_url} alt={venue.name} className="w-full h-28 object-cover" />
    ) : (
      <div className="w-full h-28 bg-secondary flex items-center justify-center">
        <Building2 className="w-8 h-8 text-muted-foreground" />
      </div>
    )}
    <div className="p-3 space-y-1">
      <div className="flex items-center gap-2">
        {venue.logo_url && <img src={venue.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />}
        <h4 className="font-medium text-foreground text-sm truncate">{venue.name}</h4>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3 h-3" /> {venue.city || "N/A"}
      </p>
      {offerCount > 0 && (
        <p className="text-xs text-gold flex items-center gap-1">
          <Tag className="w-3 h-3" /> {offerCount} offer{offerCount > 1 ? "s" : ""}
        </p>
      )}
    </div>
  </div>
);

const OfferCard = ({ offer, onClick }: { offer: any; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="flex-shrink-0 w-[240px] rounded-xl bg-card border border-border hover:border-gold/30 transition-all cursor-pointer overflow-hidden"
  >
    {offer.image_url ? (
      <img src={offer.image_url} alt={offer.title} className="w-full h-24 object-cover" />
    ) : (
      <div className="w-full h-24 bg-secondary flex items-center justify-center">
        <Tag className="w-6 h-6 text-muted-foreground" />
      </div>
    )}
    <div className="p-3 space-y-1">
      <h4 className="font-medium text-foreground text-sm truncate">{offer.title}</h4>
      <p className="text-xs text-muted-foreground truncate">{offer.venues?.name}</p>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs capitalize">{offer.offer_type}</Badge>
        {offer.discount_value && <span className="text-xs text-gold font-medium">${offer.discount_value}</span>}
      </div>
    </div>
  </div>
);

export default InfluencerHome;
