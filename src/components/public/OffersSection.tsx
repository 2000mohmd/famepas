import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, Clock, Sparkles } from "lucide-react";

interface Props {
  categoryFilter: string | null;
  onVenueClick: (venueId: string) => void;
}

const OffersSection = ({ categoryFilter, onVenueClick }: Props) => {
  const { data: offers } = useQuery({
    queryKey: ["public-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("offers")
        .select("*, venues(id, name, city, category, logo_url, is_active, approval_status)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = offers?.filter((o: any) => {
    if (o.venues && (o.venues.is_active === false || o.venues.approval_status !== "approved")) return false;
    return !categoryFilter || o.venues?.category === categoryFilter;
  }) ?? [];

  return (
    <section id="offers" className="py-20 bg-background relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-3">Opportunities</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground">
            Latest <span className="text-gold">Offers</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto text-base">
            Exclusive deals from top venues — browse and apply
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No offers available yet</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Check back soon for new opportunities</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((offer: any) => (
              <div
                key={offer.id}
                onClick={() => offer.venues?.id && onVenueClick(offer.venues.id)}
                className="group rounded-2xl bg-card border border-border hover:border-accent/40 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1"
              >
                {(offer.cover_image_url || offer.image_url) ? (
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={offer.cover_image_url || offer.image_url}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    {offer.discount_value && (
                      <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-accent/20">
                        ${offer.discount_value}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center relative">
                    <Tag className="w-10 h-10 text-muted-foreground/30" />
                    {offer.discount_value && (
                      <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-3 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-accent/20">
                        ${offer.discount_value}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <h3 className="font-semibold text-foreground text-lg leading-snug">{offer.title}</h3>
                  {offer.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{offer.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {offer.venues?.logo_url && (
                      <img src={offer.venues.logo_url} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                    )}
                    <span className="font-medium">{offer.venues?.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="outline" className="text-xs capitalize border-border">{offer.offer_type}</Badge>
                    {offer.ends_at && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(offer.ends_at).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={(e) => { e.stopPropagation(); offer.venues?.id && onVenueClick(offer.venues.id); }}>
                    Claim Offer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default OffersSection;
