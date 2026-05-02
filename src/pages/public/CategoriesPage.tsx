import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import VenueOffersModal from "@/components/public/VenueOffersModal";
import { Building2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CategoriesPage = () => {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: venues } = useQuery({
    queryKey: ["public-venues"],
    queryFn: async () => {
      const { data } = await supabase.from("venues").select("*").eq("is_active", true).eq("approval_status", "approved").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: offerCounts } = useQuery({
    queryKey: ["public-offer-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("venue_id").eq("is_active", true);
      const counts: Record<string, number> = {};
      data?.forEach((o) => { counts[o.venue_id] = (counts[o.venue_id] || 0) + 1; });
      return counts;
    },
  });

  const filteredVenues = selectedCat ? venues?.filter((v) => v.category === selectedCat) ?? [] : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-3">Explore</p>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground">
              Browse by <span className="text-gold">Category</span>
            </h1>
            <p className="text-muted-foreground mt-4 max-w-lg mx-auto">Select a category to discover venues and their exclusive offers</p>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 mb-14">
            {categories?.map((cat: any) => {
              const venueCount = venues?.filter((v) => v.category === cat.name).length ?? 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(selectedCat === cat.name ? null : cat.name)}
                  className={`group relative overflow-hidden h-48 rounded-2xl border transition-all duration-300 hover:scale-[1.03] ${
                    selectedCat === cat.name
                      ? "border-accent/60 shadow-xl shadow-accent/20"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  {cat.image_url ? (
                    <>
                      <img src={cat.image_url} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary to-card" />
                  )}
                  <div className="relative h-full flex flex-col items-center justify-end p-4 gap-1 text-center">
                    <span className="text-base font-bold text-foreground capitalize">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">{venueCount} venue{venueCount !== 1 ? "s" : ""}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Venues for selected category */}
          {selectedCat && (
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                {selectedCat} <span className="text-gold">Venues</span>
              </h2>
              {filteredVenues.length === 0 ? (
                <div className="text-center py-16">
                  <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No venues in this category yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredVenues.map((venue) => (
                    <div key={venue.id} onClick={() => setSelectedVenueId(venue.id)} className="group rounded-2xl bg-card border border-border hover:border-accent/40 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-xl hover:-translate-y-1">
                      {venue.cover_image_url ? (
                        <div className="relative h-44 overflow-hidden">
                          <img src={venue.cover_image_url} alt={venue.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                          {(offerCounts?.[venue.id] ?? 0) > 0 && (
                            <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-2.5 py-1 rounded-full text-xs font-bold">{offerCounts?.[venue.id]} offers</div>
                          )}
                        </div>
                      ) : (
                        <div className="h-44 bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center">
                          <Building2 className="w-12 h-12 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="p-5 space-y-2">
                        <h3 className="font-semibold text-foreground truncate">{venue.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {venue.city || "N/A"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
      <VenueOffersModal venueId={selectedVenueId} onClose={() => setSelectedVenueId(null)} />
    </div>
  );
};

export default CategoriesPage;
