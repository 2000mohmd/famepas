import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Tag, Clock, Globe } from "lucide-react";

interface Props {
  venueId: string | null;
  onClose: () => void;
}

const VenueOffersModal = ({ venueId, onClose }: Props) => {
  const { data: venue } = useQuery({
    queryKey: ["public-venue", venueId],
    queryFn: async () => {
      const { data } = await supabase.from("venues").select("*").eq("id", venueId!).single();
      return data;
    },
    enabled: !!venueId,
  });

  const { data: offers } = useQuery({
    queryKey: ["public-venue-offers", venueId],
    queryFn: async () => {
      const { data } = await supabase
        .from("offers")
        .select("*")
        .eq("venue_id", venueId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!venueId,
  });

  return (
    <Dialog open={!!venueId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
        {venue && (
          <>
            <DialogHeader>
              {venue.cover_image_url && (
                <div className="relative h-48 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-lg">
                  <img src={venue.cover_image_url} alt={venue.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                </div>
              )}
              <div className="flex items-center gap-4">
                {venue.logo_url ? (
                  <img src={venue.logo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-border" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-accent" />
                  </div>
                )}
                <div>
                  <DialogTitle className="font-display text-xl">{venue.name}</DialogTitle>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    {venue.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {venue.city}</span>}
                    {venue.website && <a href={venue.website} target="_blank" rel="noopener" className="flex items-center gap-1 text-accent hover:underline"><Globe className="w-3 h-3" /> Website</a>}
                  </div>
                </div>
              </div>
              {venue.description && <p className="text-sm text-muted-foreground mt-3">{venue.description}</p>}
            </DialogHeader>

            <div className="mt-6">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent" /> Available Offers ({offers?.length || 0})
              </h3>
              {offers && offers.length > 0 ? (
                <div className="space-y-4">
                  {offers.map((offer) => (
                    <div key={offer.id} className="rounded-xl border border-border bg-background p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold text-foreground">{offer.title}</h4>
                        {offer.discount_value && (
                          <span className="text-accent font-bold text-lg">${offer.discount_value}</span>
                        )}
                      </div>
                      {offer.description && <p className="text-sm text-muted-foreground">{offer.description}</p>}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{offer.offer_type}</Badge>
                        {offer.min_followers && (
                          <Badge variant="secondary" className="text-xs">{offer.min_followers.toLocaleString()}+ followers</Badge>
                        )}
                        {offer.ends_at && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Ends {new Date(offer.ends_at).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      {offer.requirements && (
                        <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">{offer.requirements}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">No active offers from this venue</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VenueOffersModal;
