import { useState } from "react";
import Navbar from "@/components/public/Navbar";
import HeroSlider from "@/components/public/HeroSlider";
import CategoriesSection from "@/components/public/CategoriesSection";
import OffersSection from "@/components/public/OffersSection";
import TopInfluencersSection from "@/components/public/TopInfluencersSection";
import PlatformSection from "@/components/public/PlatformSection";
import ProgramsSection from "@/components/public/ProgramsSection";
import TeamSection from "@/components/public/TeamSection";
import CtaSection from "@/components/public/CtaSection";
import VenueOffersModal from "@/components/public/VenueOffersModal";
import Footer from "@/components/public/Footer";
import ChatbotWidget from "@/components/public/ChatbotWidget";
import { useReveal } from "@/hooks/useReveal";

const Divider = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="hairline" />
  </div>
);

const Index = () => {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  useReveal();

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />
      <HeroSlider />
      <Divider />
      <div className="reveal"><PlatformSection /></div>
      <Divider />
      <div className="reveal"><ProgramsSection /></div>
      <Divider />
      <div className="reveal">
        <CategoriesSection
          selected={categoryFilter}
          onSelect={setCategoryFilter}
          onVenueClick={setSelectedVenueId}
        />
      </div>
      <Divider />
      <div className="reveal"><TeamSection /></div>
      <Divider />
      <div className="reveal"><TopInfluencersSection /></div>
      <Divider />
      <div className="reveal">
        <OffersSection categoryFilter={categoryFilter} onVenueClick={setSelectedVenueId} />
      </div>
      <div className="reveal"><CtaSection /></div>
      <Footer />
      <VenueOffersModal venueId={selectedVenueId} onClose={() => setSelectedVenueId(null)} />
      <ChatbotWidget />
    </div>
  );
};

export default Index;
