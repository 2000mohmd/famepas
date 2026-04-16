import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMap, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";

const mapContainerStyle = { width: "100%", height: "500px", borderRadius: "0.75rem" };
const defaultCenter = { lat: 25.2048, lng: 55.2708 };

const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a9a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a4a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e0e1a" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1e1e3a" }] },
];

interface Props {
  onVenueClick: (venueId: string) => void;
}

const MapSection = ({ onVenueClick }: Props) => {
  const { isLoaded, apiKey } = useGoogleMaps();
  const [selectedVenue, setSelectedVenue] = useState<any>(null);

  const { data: venues } = useQuery({
    queryKey: ["map-venues"],
    queryFn: async () => {
      const { data } = await supabase
        .from("venues")
        .select("*")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      return data ?? [];
    },
  });

  const { data: offerCounts } = useQuery({
    queryKey: ["map-offer-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("venue_id").eq("is_active", true);
      const counts: Record<string, number> = {};
      data?.forEach((o) => { counts[o.venue_id] = (counts[o.venue_id] || 0) + 1; });
      return counts;
    },
  });

  const center = venues && venues.length > 0
    ? { lat: venues[0].latitude!, lng: venues[0].longitude! }
    : defaultCenter;

  return (
    <section id="map" className="py-20 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
            Find Venues on the <span className="text-gold">Map</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Discover venues near you and explore their exclusive offers
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border shadow-xl shadow-primary/5">
          {!isLoaded ? (
            <div className="h-[500px] bg-secondary/50 flex items-center justify-center">
              <div className="text-center space-y-3">
                <MapPin className="w-10 h-10 text-muted-foreground mx-auto animate-pulse" />
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={12}
              options={{ styles: mapStyles, disableDefaultUI: false, zoomControl: true, mapTypeControl: false, streetViewControl: false }}
            >
              {venues?.map((venue) => (
                <MarkerF
                  key={venue.id}
                  position={{ lat: venue.latitude!, lng: venue.longitude! }}
                  onClick={() => setSelectedVenue(venue)}
                  title={venue.name}
                />
              ))}
              {selectedVenue && (
                <InfoWindowF
                  position={{ lat: selectedVenue.latitude, lng: selectedVenue.longitude }}
                  onCloseClick={() => setSelectedVenue(null)}
                >
                  <div className="p-3 max-w-[260px]" style={{ color: "#1a1a2e" }}>
                    <h3 className="font-semibold text-sm mb-1">{selectedVenue.name}</h3>
                    <p className="text-xs mb-1" style={{ color: "#666" }}>{selectedVenue.address || selectedVenue.city}</p>
                    <p className="text-xs mb-2" style={{ color: "#888" }}>{selectedVenue.category}</p>
                    {(offerCounts?.[selectedVenue.id] ?? 0) > 0 && (
                      <p className="text-xs font-medium mb-2" style={{ color: "#333" }}>
                        {offerCounts?.[selectedVenue.id]} active offer(s)
                      </p>
                    )}
                    <button
                      onClick={() => { onVenueClick(selectedVenue.id); setSelectedVenue(null); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 w-full"
                    >
                      View Offers
                    </button>
                  </div>
                </InfoWindowF>
              )}
            </GoogleMap>
          )}
        </div>

        {(!venues || venues.length === 0) && isLoaded && (
          <p className="text-center text-muted-foreground mt-6 text-sm">
            No venues with map coordinates available yet.
          </p>
        )}
      </div>
    </section>
  );
};

export default MapSection;
