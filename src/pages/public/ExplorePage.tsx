import { useState } from "react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import MapSection from "@/components/public/MapSection";
import VenueOffersModal from "@/components/public/VenueOffersModal";

const ExplorePage = () => {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-3">Explore</p>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground">
              Discover on the <span className="text-gold">Map</span>
            </h1>
            <p className="text-muted-foreground mt-4 max-w-lg mx-auto">Find venues near you with our interactive map</p>
          </div>
        </div>
        <MapSection onVenueClick={setSelectedVenueId} />
      </div>
      <Footer />
      <VenueOffersModal venueId={selectedVenueId} onClose={() => setSelectedVenueId(null)} />
    </div>
  );
};

export default ExplorePage;
