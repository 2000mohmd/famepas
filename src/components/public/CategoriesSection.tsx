import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Leaf,
  Sparkles,
  Shirt,
  Smartphone,
  UtensilsCrossed,
  PawPrint,
  Baby,
  Cpu,
  Home,
  Tag,
  LayoutGrid,
  Building2,
  MapPin,
  ArrowRight,
  Search,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

interface Props {
  selected: string | null;
  onSelect: (cat: string | null) => void;
  onVenueClick: (venueId: string) => void;
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  health: Leaf,
  wellness: Leaf,
  beauty: Sparkles,
  cosmetics: Sparkles,
  apparel: Shirt,
  fashion: Shirt,
  apps: Smartphone,
  digital: Smartphone,
  food: UtensilsCrossed,
  beverage: UtensilsCrossed,
  dining: UtensilsCrossed,
  pets: PawPrint,
  children: Baby,
  family: Baby,
  technology: Cpu,
  gadgets: Cpu,
  home: Home,
  lifestyle: Home,
};

const getIcon = (name: string) => {
  const key = Object.keys(iconMap).find((k) => name.toLowerCase().includes(k));
  return key ? iconMap[key] : Tag;
};

const CategoriesSection = ({ selected, onSelect, onVenueClick }: Props) => {
  const [tab, setTab] = useState<"categories" | "campaigns">("categories");
  const [search, setSearch] = useState("");

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

  const filtered = (venues?.filter((v) => {
    const matchCat = !selected || v.category === selected;
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.city?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }) ?? []).slice(0, 8);

  return (
    <section id="categories" className="py-24 relative">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="font-display font-normal leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
            Browse by <span className="italic gradient-text">Category</span>
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
            Explore venues and offers across every vertical — from beauty to wellness, dining to lifestyle.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 p-1.5 rounded-full glass border border-border">
            {(["categories", "campaigns"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold capitalize transition-all ${
                  tab === t
                    ? "bg-gold text-accent-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Category pills with icons */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8">
          <button
            onClick={() => onSelect(null)}
            className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full border text-sm font-semibold transition-all ${
              !selected
                ? "bg-foreground text-background border-foreground shadow-xl"
                : "glass border-border hover:border-gold/50 text-foreground/80 hover:-translate-y-0.5"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            All
          </button>
          {categories?.map((cat: any) => {
            const Icon = getIcon(cat.name);
            const active = selected === cat.name;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.name)}
                className={`inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full border text-sm font-semibold capitalize transition-all ${
                  active
                    ? "bg-foreground text-background border-foreground shadow-xl"
                    : "glass border-border hover:border-gold/50 text-foreground/80 hover:-translate-y-0.5"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "" : "text-gold"}`} />
                {cat.name}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center mb-14">
          <div className="relative w-full max-w-md">
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

export default CategoriesSection;
