import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import VenueOffersModal from "@/components/public/VenueOffersModal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Search } from "lucide-react";

const VenuesPage = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-3">Discover</p>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground">
              All <span className="text-gold">Venues</span>
            </h1>
            <p className="text-muted-foreground mt-4 max-w-lg mx-auto">Browse all approved venues and explore their exclusive offers</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search venues..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-border rounded-xl h-11" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCategoryFilter(null)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!categoryFilter ? "bg-accent text-accent-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
                All
              </button>
              {categories?.map((cat) => (
                <button key={cat.id} onClick={() => setCategoryFilter(cat.name)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${categoryFilter === cat.name ? "bg-accent text-accent-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No venues found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((venue) => (
                <div key={venue.id} onClick={() => setSelectedVenueId(venue.id)} className="group rounded-2xl bg-card border border-border hover:border-accent/40 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1">
                  {venue.cover_image_url ? (
                    <div className="relative h-48 overflow-hidden">
                      <img src={venue.cover_image_url} alt={venue.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                      {(offerCounts?.[venue.id] ?? 0) > 0 && (
                        <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-2.5 py-1 rounded-full text-xs font-bold">{offerCounts?.[venue.id]} offers</div>
                      )}
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-muted-foreground/40" />
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
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {venue.city || "N/A"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize border-border">{venue.category}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
      <VenueOffersModal venueId={selectedVenueId} onClose={() => setSelectedVenueId(null)} />
    </div>
  );
};

export default VenuesPage;
