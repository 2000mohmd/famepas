import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, Tag } from "lucide-react";
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
        .select("*")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: offerCounts } = useQuery({
    queryKey: ["public-offer-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("offers")
        .select("venue_id")
        .eq("is_active", true);
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
    <section id="venues" className="py-20 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
              Featured <span className="text-gold">Venues</span>
            </h2>
            <p className="text-muted-foreground mt-2">
              {categoryFilter ? `Showing ${categoryFilter} venues` : "Explore all approved venues"}
            </p>
          </div>
          <Input
            placeholder="Search by name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72 bg-card border-border"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No venues found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((venue) => (
              <div
                key={venue.id}
                onClick={() => onVenueClick(venue.id)}
                className="group rounded-2xl bg-card border border-border hover:border-accent/40 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-lg hover:shadow-accent/5"
              >
                {venue.cover_image_url ? (
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={venue.cover_image_url}
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                  </div>
                ) : (
                  <div className="h-44 bg-secondary flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    {venue.logo_url ? (
                      <img src={venue.logo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-accent" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{venue.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {venue.city || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs capitalize border-border">{venue.category}</Badge>
                    {(offerCounts?.[venue.id] ?? 0) > 0 && (
                      <span className="text-xs text-accent font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {offerCounts?.[venue.id]} offers
                      </span>
                    )}
                  </div>
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
