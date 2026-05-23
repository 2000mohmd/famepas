import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, Clock, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

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

  const filtered = (offers?.filter((o: any) => {
    if (o.venues && (o.venues.is_active === false || o.venues.approval_status !== "approved")) return false;
    return !categoryFilter || o.venues?.category === categoryFilter;
  }) ?? []).slice(0, 6);

  return (
    <section id="offers" className="py-24 relative">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <h2 className="font-display font-normal leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
            Newest <span className="italic gradient-text">Offers</span>
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
            Exclusive collaborations from top venues. Browse, apply, and start creating.
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No offers available yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((offer: any) => (
                <div
                  key={offer.id}
                  onClick={() => offer.venues?.id && onVenueClick(offer.venues.id)}
                  className="group premium-card rounded-3xl transition-all duration-500 cursor-pointer overflow-hidden hover:-translate-y-1"
                >
                  <div className="relative h-56 overflow-hidden">
                    {(offer.cover_image_url || offer.image_url) ? (
                      <img
                        src={offer.cover_image_url || offer.image_url}
                        alt={offer.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-secondary to-secondary/40 flex items-center justify-center">
                        <Tag className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
                    {offer.discount_value && (
                      <div className="absolute top-4 right-4 gradient-gold text-accent-foreground px-3 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-primary/30">
                        ${offer.discount_value}
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-4">
                    <h3 className="font-display font-semibold text-foreground text-xl leading-snug">{offer.title}</h3>
                    {offer.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{offer.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                        {offer.venues?.logo_url && (
                          <img src={offer.venues.logo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">{offer.venues?.name}</span>
                      </div>
                      {offer.ends_at && (
                        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 flex-shrink-0">
                          <Clock className="w-3 h-3" /> {new Date(offer.ends_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button
                      className="w-full gradient-gold text-accent-foreground hover:opacity-90 rounded-full font-semibold"
                      onClick={(e) => { e.stopPropagation(); offer.venues?.id && onVenueClick(offer.venues.id); }}
                    >
                      Claim Offer <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button asChild variant="outline" className="rounded-full px-8 h-12 border-border glass hover:border-gold/40">
                <Link to="/offers">View all offers <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default OffersSection;
