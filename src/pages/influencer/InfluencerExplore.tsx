import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, MapPin, Users, Building2, Clock, CheckCircle, Map, List } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { GoogleMap, MarkerF, InfoWindowF } from "@react-google-maps/api";

const mapContainerStyle = { width: "100%", height: "500px", borderRadius: "0.75rem" };
const defaultCenter = { lat: 25.2048, lng: 55.2708 };

const InfluencerExplore = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("venue") || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title_asc" | "title_desc" | "slots_desc" | "followers_asc" | "followers_desc">("newest");
  const [countryFilter, setCountryFilter] = useState<"my" | "all">("my");
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedVenueMarker, setSelectedVenueMarker] = useState<any>(null);

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-country", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("country, city").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const myCountry = (myProfile as any)?.country as string | undefined;

  const { data: myApplications } = useQuery({
    queryKey: ["my-applications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("offer_redemptions")
        .select("offer_id, status")
        .eq("influencer_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: offers } = useQuery({
    queryKey: ["explore-offers", search, categoryFilter, typeFilter, countryFilter, myCountry, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("offers")
        .select("*, venues(name, city, country, category, logo_url, description, latitude, longitude, address)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") query = query.eq("offer_type", typeFilter);

      const { data } = await query;
      let filtered = data ?? [];
      if (countryFilter === "my" && myCountry) {
        filtered = filtered.filter((o: any) => (o.venues?.country || "").toLowerCase() === myCountry.toLowerCase());
      }
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (o: any) =>
            o.title.toLowerCase().includes(s) ||
            o.venues?.name?.toLowerCase().includes(s) ||
            o.venues?.city?.toLowerCase().includes(s) ||
            o.venues?.address?.toLowerCase().includes(s)
        );
      }
      if (categoryFilter !== "all") {
        filtered = filtered.filter((o: any) => o.venues?.category === categoryFilter);
      }
      const sorters: Record<string, (a: any, b: any) => number> = {
        newest: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        oldest: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        title_asc: (a, b) => (a.title || "").localeCompare(b.title || ""),
        title_desc: (a, b) => (b.title || "").localeCompare(a.title || ""),
        slots_desc: (a, b) => ((b.max_redemptions ?? 0) - (b.current_redemptions ?? 0)) - ((a.max_redemptions ?? 0) - (a.current_redemptions ?? 0)),
        followers_asc: (a, b) => (a.min_followers ?? 0) - (b.min_followers ?? 0),
        followers_desc: (a, b) => (b.min_followers ?? 0) - (a.min_followers ?? 0),
      };
      filtered = [...filtered].sort(sorters[sortBy]);
      return filtered;
    },
  });

  const { data: venues } = useQuery({
    queryKey: ["explore-venues", countryFilter, myCountry],
    queryFn: async () => {
      let query = supabase
        .from("venues")
        .select("*")
        .eq("is_active", true)
        .eq("approval_status", "approved");
      const { data } = await query;
      let list = data ?? [];
      if (countryFilter === "my" && myCountry) {
        list = list.filter((v: any) => (v.country || "").toLowerCase() === myCountry.toLowerCase());
      }
      return list;
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
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      setSelectedOffer(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const getApplicationStatus = (offerId: string) => myApplications?.find((a) => a.offer_id === offerId);

  const mapVenues = venues?.filter((v) => v.latitude && v.longitude) ?? [];
  const offersForVenue = (venueId: string) => offers?.filter((o: any) => o.venue_id === venueId) ?? [];

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Explore Opportunities</h1>
            <p className="text-muted-foreground">Find campaigns and collaborations from top venues</p>
          </div>
          <div className="flex gap-2 bg-card border border-border rounded-lg p-1">
            <Button size="sm" variant={viewMode === "list" ? "default" : "ghost"} onClick={() => setViewMode("list")} className="gap-1">
              <List className="w-4 h-4" /> List
            </Button>
            <Button size="sm" variant={viewMode === "map" ? "default" : "ghost"} onClick={() => setViewMode("map")} className="gap-1">
              <Map className="w-4 h-4" /> Map
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by venue name, offer, or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
          <Select value={countryFilter} onValueChange={(v: any) => setCountryFilter(v)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="my" disabled={!myCountry}>My country{myCountry ? ` (${myCountry})` : " — set in profile"}</SelectItem>
              <SelectItem value="all">All countries</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!myCountry && countryFilter === "my" && (
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm text-foreground">
            Set your country in <a href="/influencer/profile" className="underline text-gold">your profile</a> to see offers near you.
          </div>
        )}

        {viewMode === "map" && (
          <MapView
            venues={mapVenues}
            selectedVenue={selectedVenueMarker}
            onSelectVenue={setSelectedVenueMarker}
            offersForVenue={offersForVenue}
            onApply={(offerId: string) => applyMutation.mutate(offerId)}
            getApplicationStatus={getApplicationStatus}
          />
        )}

        {viewMode === "list" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers?.map((offer: any) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                application={getApplicationStatus(offer.id)}
                selectedOffer={selectedOffer}
                setSelectedOffer={setSelectedOffer}
                onApply={() => applyMutation.mutate(offer.id)}
                isPending={applyMutation.isPending}
              />
            ))}
            {offers?.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No offers found matching your criteria.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const MapView = ({ venues, selectedVenue, onSelectVenue, offersForVenue, onApply, getApplicationStatus }: any) => {
  const { isLoaded } = useGoogleMaps();

  if (!isLoaded) {
    return (
      <div className="rounded-xl bg-card border border-border p-12 text-center text-muted-foreground">
        Loading map...
      </div>
    );
  }

  const center = venues.length > 0
    ? { lat: venues[0].latitude, lng: venues[0].longitude }
    : defaultCenter;

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={12}>
        {venues.map((venue: any) => (
          <MarkerF key={venue.id} position={{ lat: venue.latitude, lng: venue.longitude }} onClick={() => onSelectVenue(venue)} title={venue.name} />
        ))}
        {selectedVenue && (
          <InfoWindowF position={{ lat: selectedVenue.latitude, lng: selectedVenue.longitude }} onCloseClick={() => onSelectVenue(null)}>
            <div className="p-2 max-w-[250px] text-foreground">
              <h3 className="font-semibold text-sm mb-1" style={{ color: "#1a1a2e" }}>{selectedVenue.name}</h3>
              <p className="text-xs mb-1" style={{ color: "#666" }}>{selectedVenue.address || selectedVenue.city}</p>
              <p className="text-xs mb-2" style={{ color: "#888" }}>{selectedVenue.category}</p>
              {offersForVenue(selectedVenue.id).length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium" style={{ color: "#333" }}>{offersForVenue(selectedVenue.id).length} offer(s):</p>
                  {offersForVenue(selectedVenue.id).slice(0, 3).map((o: any) => {
                    const app = getApplicationStatus(o.id);
                    return (
                      <div key={o.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs truncate" style={{ color: "#333" }}>{o.title}</span>
                        {app ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 capitalize">{app.status}</span>
                        ) : (
                          <button onClick={() => onApply(o.id)} className="text-xs px-2 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-700">Apply</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "#999" }}>No active offers</p>
              )}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
};

const OfferCard = ({ offer, application, selectedOffer, setSelectedOffer, onApply, isPending }: any) => {
  const hasApplied = !!application;

  return (
    <Card className="hover:border-gold/30 transition-colors overflow-hidden">
      {(offer.cover_image_url || offer.image_url) && <img src={offer.cover_image_url || offer.image_url} alt={offer.title} className="w-full h-40 object-cover" />}
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            {format(new Date(offer.starts_at), "MMM d, yyyy")}
            {offer.ends_at && ` — ${format(new Date(offer.ends_at), "MMM d, yyyy")}`}
          </span>
        </div>
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
          {hasApplied ? (
            <Button size="sm" disabled className="bg-success/20 text-success border border-success/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              {application.status === "pending" ? "Applied" : application.status === "approved" ? "Approved" : "Rejected"}
            </Button>
          ) : (
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
                  <p className="text-sm">
                    <strong>Duration:</strong> {format(new Date(offer.starts_at), "MMM d, yyyy")}
                    {offer.ends_at && ` — ${format(new Date(offer.ends_at), "MMM d, yyyy")}`}
                  </p>
                  {offer.discount_value && <p className="text-sm"><strong>Value:</strong> ${offer.discount_value}</p>}
                  <Button className="w-full" onClick={onApply} disabled={isPending}>
                    {isPending ? "Submitting..." : "Confirm Application"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InfluencerExplore;
