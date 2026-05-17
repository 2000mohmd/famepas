import { useState } from "react";
import Navbar from "@/components/public/Navbar";
import HeroSlider from "@/components/public/HeroSlider";
import CategoriesSection from "@/components/public/CategoriesSection";
import VenuesSection from "@/components/public/VenuesSection";
import OffersSection from "@/components/public/OffersSection";
import MapSection from "@/components/public/MapSection";
import VenueOffersModal from "@/components/public/VenueOffersModal";
import Footer from "@/components/public/Footer";
import ChatbotWidget from "@/components/public/ChatbotWidget";

const Index = () => {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSlider />
      <CategoriesSection selected={categoryFilter} onSelect={setCategoryFilter} />
      <VenuesSection categoryFilter={categoryFilter} onVenueClick={setSelectedVenueId} />
      <OffersSection categoryFilter={categoryFilter} onVenueClick={setSelectedVenueId} />
      <MapSection onVenueClick={setSelectedVenueId} />
      <Footer />
      <VenueOffersModal venueId={selectedVenueId} onClose={() => setSelectedVenueId(null)} />
      <ChatbotWidget />
    </div>
  );
};

export default Index;
