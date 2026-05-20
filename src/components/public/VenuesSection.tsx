import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, Tag, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Input } from "@/components/ui/input";

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

  const filtered = venues?.filter((v) => {
    const matchCat = !categoryFilter || v.category === categoryFilter;
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.city?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }) ?? [];

  return (
    <section id="venues" className="py-20 bg-card/30 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-14">
          <div>
            <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-3">Discover</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground">
              Featured <span className="text-gold">Venues</span>
            </h2>
            <p className="text-muted-foreground mt-3">
              {categoryFilter ? `Showing ${categoryFilter} venues` : "Explore all approved venues"}
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-border rounded-xl h-11"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No venues found</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((venue) => (
              <div
                key={venue.id}
                onClick={() => onVenueClick(venue.id)}
                className="group premium-card rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-1"
              >
                {venue.cover_image_url ? (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={venue.cover_image_url}
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                    {(offerCounts?.[venue.id] ?? 0) > 0 && (
                      <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-2.5 py-1 rounded-full text-xs font-bold">
                        {offerCounts?.[venue.id]} offers
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center relative">
                    <Building2 className="w-12 h-12 text-muted-foreground/40" />
                    {(offerCounts?.[venue.id] ?? 0) > 0 && (
                      <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-2.5 py-1 rounded-full text-xs font-bold">
                        {offerCounts?.[venue.id]} offers
                      </div>
                    )}
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    {venue.logo_url ? (
                      <img src={venue.logo_url} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-accent" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-base">{venue.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {venue.city || "N/A"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize border-border">{venue.category}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default VenuesSection;
