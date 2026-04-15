import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tag, Clock } from "lucide-react";

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
        .select("*, venues(id, name, city, category, logo_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = offers?.filter((o: any) => !categoryFilter || o.venues?.category === categoryFilter) ?? [];

  return (
    <section id="offers" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
            Latest <span className="text-gold">Offers</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Exclusive deals from top venues — browse and apply
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No offers available</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((offer: any) => (
              <div
                key={offer.id}
                onClick={() => offer.venues?.id && onVenueClick(offer.venues.id)}
                className="group rounded-2xl bg-card border border-border hover:border-accent/40 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-lg hover:shadow-accent/5"
              >
                {offer.image_url ? (
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={offer.image_url}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {offer.discount_value && (
                      <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-bold">
                        ${offer.discount_value}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-40 bg-secondary flex items-center justify-center relative">
                    <Tag className="w-8 h-8 text-muted-foreground" />
                    {offer.discount_value && (
                      <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-bold">
                        ${offer.discount_value}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <h3 className="font-semibold text-foreground text-lg">{offer.title}</h3>
                  {offer.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {offer.venues?.logo_url && (
                      <img src={offer.venues.logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    )}
                    <span>{offer.venues?.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs capitalize border-border">{offer.offer_type}</Badge>
                    {offer.ends_at && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(offer.ends_at).toLocaleDateString()}
                      </Badge>
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

export default OffersSection;
