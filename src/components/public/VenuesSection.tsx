import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, Search, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

interface Props {
  categoryFilter: string | null;
  onVenueClick: (venueId: string) => void;
}

const VenuesSection = ({ categoryFilter, onVenueClick }: Props) => {
  const [search, setSearch] = useState("");

  const { data: venues } = useQuery({
    queryKey: ["public-venues"],
    queryFn: async () => {
      const { data } = await supabase
        .from("venues")
        .select("id, owner_id, brand_id, name, description, category, address, city, country, latitude, longitude, website, logo_url, cover_image_url, is_active, approval_status, venue_type, created_at")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });
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

  const filtered = (venues?.filter((v) => {
    const matchCat = !categoryFilter || v.category === categoryFilter;
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.city?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }) ?? []).slice(0, 8);

  return (
    <section id="venues" className="py-32 relative">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 mb-14">
          <div className="max-w-2xl">
            <h2 className="font-display font-normal leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
              Featured <span className="italic gradient-text">Venues</span>
            </h2>
            <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
              {categoryFilter ? `Curated ${categoryFilter} venues.` : "A handpicked selection of premium venues open to creator collaborations."}
            </p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 glass border-border rounded-full h-12"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No venues found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((venue) => (
                <div
                  key={venue.id}
                  onClick={() => onVenueClick(venue.id)}
                  className="group premium-card rounded-3xl transition-all duration-500 cursor-pointer overflow-hidden hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {venue.cover_image_url ? (
                      <img
                        src={venue.cover_image_url}
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-secondary to-secondary/40 flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

                    {(offerCounts?.[venue.id] ?? 0) > 0 && (
                      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full glass border border-gold/30 text-xs font-semibold text-gold">
                        {offerCounts?.[venue.id]} offers
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold text-foreground text-xl leading-tight truncate">{venue.name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" /> {venue.city || "N/A"}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize border-gold/30 text-gold bg-background/40 backdrop-blur-sm text-[10px] flex-shrink-0">
                          {venue.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button asChild variant="outline" className="rounded-full px-8 h-12 border-border glass hover:border-gold/40">
                <Link to="/venues">View all venues <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default VenuesSection;
