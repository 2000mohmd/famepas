import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, MapPin, Users, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const InfluencerExplore = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedOffer, setSelectedOffer] = useState<any>(null);

  const { data: offers } = useQuery({
    queryKey: ["explore-offers", search, categoryFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("offers")
        .select("*, venues(name, city, category, logo_url, description)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") query = query.eq("offer_type", typeFilter);

      const { data } = await query;
      let filtered = data ?? [];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (o: any) => o.title.toLowerCase().includes(s) || o.venues?.name?.toLowerCase().includes(s) || o.venues?.city?.toLowerCase().includes(s)
        );
      }
      if (categoryFilter !== "all") {
        filtered = filtered.filter((o: any) => o.venues?.category === categoryFilter);
      }
      return filtered;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true);
      return data ?? [];
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase.from("offer_redemptions").insert({
        offer_id: offerId,
        influencer_id: user!.id,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Application submitted!", description: "The venue will review your application." });
      queryClient.invalidateQueries({ queryKey: ["explore-offers"] });
      setSelectedOffer(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Explore Opportunities</h1>
          <p className="text-muted-foreground">Find campaigns and collaborations from top venues</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search offers or venues..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="free">Barter</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="event">Event</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers?.map((offer: any) => (
            <Card key={offer.id} className="hover:border-gold/30 transition-colors overflow-hidden">
              {offer.image_url && (
                <img src={offer.image_url} alt={offer.title} className="w-full h-40 object-cover" />
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{offer.title}</CardTitle>
                  <Badge variant="outline" className="capitalize">{offer.offer_type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{offer.venues?.name}</span>
                </div>
                {offer.venues?.city && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{offer.venues.city}</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                {offer.min_followers > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>Min {offer.min_followers} followers</span>
                  </div>
                )}
                {offer.requirements && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">{offer.requirements}</p>
                )}
                <div className="flex items-center justify-between pt-2">
                  {offer.max_redemptions && (
                    <span className="text-xs text-muted-foreground">{offer.max_redemptions - offer.current_redemptions} slots left</span>
                  )}
                  <Dialog open={selectedOffer?.id === offer.id} onOpenChange={(o) => !o && setSelectedOffer(null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setSelectedOffer(offer)}>Apply</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Apply to: {offer.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{offer.description}</p>
                        {offer.requirements && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Requirements</h4>
                            <p className="text-sm text-muted-foreground">{offer.requirements}</p>
                          </div>
                        )}
                        <p className="text-sm"><strong>Venue:</strong> {offer.venues?.name}, {offer.venues?.city}</p>
                        {offer.discount_value && <p className="text-sm"><strong>Value:</strong> $ {offer.discount_value}</p>}
                        <Button className="w-full" onClick={() => applyMutation.mutate(offer.id)} disabled={applyMutation.isPending}>
                          {applyMutation.isPending ? "Submitting..." : "Confirm Application"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
          {offers?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No offers found matching your criteria.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerExplore;
