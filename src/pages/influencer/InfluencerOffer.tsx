import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  Tag,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const InfluencerOffer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: offer, isLoading } = useQuery({
    queryKey: ["offer-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select(
          "*, venues(id, name, city, country, address, category, logo_url, cover_image_url, image_url, description, latitude, longitude), categories(name, icon, image_url, color)"
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: myApplication } = useQuery({
    queryKey: ["my-application", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("offer_redemptions")
        .select("*")
        .eq("offer_id", id!)
        .eq("influencer_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: isSaved } = useQuery({
    queryKey: ["saved-offer", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_offers")
        .select("id")
        .eq("offer_id", id!)
        .eq("influencer_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user,
  });

  const apply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("offer_redemptions").insert({
        offer_id: id!,
        influencer_id: user!.id,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Application submitted!", description: "The venue will review your application." });
      qc.invalidateQueries({ queryKey: ["my-application", id] });
      qc.invalidateQueries({ queryKey: ["offer-detail", id] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await supabase.from("saved_offers").delete().eq("offer_id", id!).eq("influencer_id", user!.id);
      } else {
        await supabase.from("saved_offers").insert({ offer_id: id!, influencer_id: user!.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-offer", id] }),
  });

  if (isLoading) {
    return (
      <DashboardLayout type="influencer">
        <div className="p-8 text-center text-muted-foreground">Loading offer...</div>
      </DashboardLayout>
    );
  }

  if (!offer) {
    return (
      <DashboardLayout type="influencer">
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Offer not found.</p>
          <Button onClick={() => navigate("/influencer/explore")}>Back to Explore</Button>
        </div>
      </DashboardLayout>
    );
  }

  const v: any = offer.venues;
  const cat: any = (offer as any).categories;
  const cover = (offer as any).image_url || v?.cover_image_url || v?.image_url || cat?.image_url;
  const slotsLeft =
    offer.max_redemptions != null ? offer.max_redemptions - (offer.current_redemptions || 0) : null;

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {/* Cover */}
        <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
          {cover ? (
            <img src={cover} alt={offer.title} className="w-full h-64 md:h-80 object-cover" />
          ) : (
            <div className="w-full h-64 md:h-80 bg-secondary flex items-center justify-center">
              <Tag className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-4 right-4"
            onClick={() => toggleSave.mutate()}
          >
            <Heart className={`w-5 h-5 ${isSaved ? "fill-gold text-gold" : ""}`} />
          </Button>
        </div>

        {/* Title + venue header */}
        <div className="flex items-start gap-4">
          {v?.logo_url ? (
            <img
              src={v.logo_url}
              alt={v.name}
              className="w-16 h-16 rounded-full object-cover border border-border flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-gold" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="outline" className="capitalize">{offer.offer_type}</Badge>
              {cat?.name && <Badge variant="secondary">{cat.name}</Badge>}
              {offer.discount_value ? (
                <Badge className="bg-gold text-background">${offer.discount_value} value</Badge>
              ) : null}
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{offer.title}</h1>
            <button
              onClick={() => navigate(`/influencer/explore?venue=${encodeURIComponent(v?.name || "")}`)}
              className="text-muted-foreground hover:text-gold text-sm flex items-center gap-1 mt-1"
            >
              <MapPin className="w-3 h-3" /> {v?.name} • {v?.city}{v?.country ? `, ${v.country}` : ""}
            </button>
          </div>
        </div>

        {/* Quick facts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FactCard icon={<Users className="w-4 h-4" />} label="Min followers" value={offer.min_followers ? `${offer.min_followers}+` : "Any"} />
          <FactCard
            icon={<Tag className="w-4 h-4" />}
            label="Slots"
            value={slotsLeft != null ? `${slotsLeft} left` : "Unlimited"}
          />
          {(offer as any).expires_at && (
            <FactCard
              icon={<Calendar className="w-4 h-4" />}
              label="Expires"
              value={new Date((offer as any).expires_at).toLocaleDateString()}
            />
          )}
          {(offer as any).deliverable_type && (
            <FactCard icon={<Clock className="w-4 h-4" />} label="Deliverable" value={String((offer as any).deliverable_type)} />
          )}
        </div>

        {/* Description */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">About this offer</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {offer.description || "No description provided."}
            </p>
            {(offer as any).requirements && (
              <>
                <h3 className="text-sm font-semibold mt-4">Requirements</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {(offer as any).requirements}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Venue */}
        {v && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h2 className="text-lg font-semibold text-foreground">About the venue</h2>
              <div className="flex items-center gap-3">
                {v.logo_url ? (
                  <img src={v.logo_url} alt={v.name} className="w-12 h-12 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gold" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{v.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {v.address || v.city}
                  </p>
                </div>
              </div>
              {v.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{v.description}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Apply CTA */}
        <div className="sticky bottom-4 z-10">
          <Card className="border-gold/30">
            <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                {myApplication ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-gold" />
                    <span className="capitalize text-foreground font-medium">
                      Application {myApplication.status}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ready to collaborate with {v?.name}?</p>
                )}
              </div>
              <Button
                size="lg"
                disabled={!!myApplication || apply.isPending || (slotsLeft != null && slotsLeft <= 0)}
                onClick={() => apply.mutate()}
              >
                {myApplication
                  ? "Already applied"
                  : slotsLeft != null && slotsLeft <= 0
                  ? "No slots left"
                  : apply.isPending
                  ? "Submitting..."
                  : "Apply for this offer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

const FactCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      {icon} {label}
    </div>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export default InfluencerOffer;
