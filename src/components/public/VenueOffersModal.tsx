import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Tag, Clock, Globe, LogIn, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { useState } from "react";

interface Props {
  venueId: string | null;
  onClose: () => void;
}

const VenueOffersModal = ({ venueId, onClose }: Props) => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [appliedOffers, setAppliedOffers] = useState<Record<string, string>>({});

  const { data: venue } = useQuery({
    queryKey: ["public-venue", venueId],
    queryFn: async () => {
      const { data } = await supabase.from("venues").select("id, owner_id, brand_id, name, description, category, address, city, country, latitude, longitude, website, logo_url, cover_image_url, is_active, approval_status, venue_type, created_at").eq("id", venueId!).single();
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

  const { data: profile } = useQuery({
    queryKey: ["my-profile-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && role === "influencer",
  });

  const { data: myApplications } = useQuery({
    queryKey: ["public-my-applications", user?.id, venueId],
    queryFn: async () => {
      const { data } = await supabase.from("offer_redemptions").select("offer_id, status").eq("influencer_id", user!.id);
      return data ?? [];
    },
    enabled: !!user && role === "influencer" && !!venueId,
  });

  const isProfileComplete = profile &&
    profile.avatar_url &&
    profile.full_name &&
    profile.bio &&
    (profile.instagram_handle || profile.tiktok_handle) &&
    ((profile.followers_count ?? 0) > 0 || (profile.tiktok_followers ?? 0) > 0);

  const handleApply = async (offerId: string) => {
    if (!user) return;
    if (!isProfileComplete) {
      toast({ title: "Complete your profile first", description: "You need a profile photo, bio, and social account to apply.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.from("offer_redemptions").insert({ offer_id: offerId, influencer_id: user.id }).select("qr_code").single();
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already applied", description: "You've already applied to this offer." });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      setAppliedOffers(prev => ({ ...prev, [offerId]: "pending" }));
      if (data?.qr_code) await QRCode.toDataURL(data.qr_code).catch(() => null);
      toast({ title: "Applied!", description: "Your application was submitted. Explore more offers from this venue." });
      onClose();
      navigate("/offers");
    }
  };

  const getApplication = (offerId: string) => appliedOffers[offerId] || myApplications?.find((a) => a.offer_id === offerId)?.status;

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

            {/* Auth / Profile prompts */}
            {!user && (
              <div className="mt-4 p-4 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Want to apply to offers?</p>
                  <p className="text-xs text-muted-foreground">Create an account to start applying</p>
                </div>
                <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 shrink-0">
                  <Link to="/login"><LogIn className="w-4 h-4" /> Sign In</Link>
                </Button>
              </div>
            )}

            {user && role === "influencer" && !isProfileComplete && (
              <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Complete your profile to apply</p>
                    <p className="text-xs text-muted-foreground">Add your photo, bio, and social accounts first</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link to="/influencer/profile?redirect=/offers">Complete Profile</Link>
                </Button>
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent" /> Available Offers ({offers?.length || 0})
              </h3>
              {offers && offers.length > 0 ? (
                <div className="space-y-4">
                  {offers.map((offer) => (
                    <div key={offer.id} className="rounded-xl border border-border bg-background p-4 space-y-3 hover:border-accent/30 transition-colors">
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
                        <p className="text-xs text-muted-foreground border-t border-border pt-2">{offer.requirements}</p>
                      )}
                      {user && role === "influencer" && (
                        <Button
                          size="sm"
                          className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg mt-1"
                          onClick={() => handleApply(offer.id)}
                          disabled={!isProfileComplete || !!getApplication(offer.id)}
                        >
                          {getApplication(offer.id) ? "Applied" : "Claim Offer"}
                        </Button>
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
