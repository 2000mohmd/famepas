import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PulseFitHero } from "@/components/ui/pulse-fit-hero";
import CategoriesSection from "@/components/public/CategoriesSection";
import OffersSection from "@/components/public/OffersSection";
import TopInfluencersSection from "@/components/public/TopInfluencersSection";
import PlatformSection from "@/components/public/PlatformSection";
import ProgramsSection from "@/components/public/ProgramsSection";
import TeamSection from "@/components/public/TeamSection";
import StatsSection from "@/components/public/StatsSection";
import TestimonialsSection from "@/components/public/TestimonialsSection";
import CtaSection from "@/components/public/CtaSection";
import VenueOffersModal from "@/components/public/VenueOffersModal";
import Footer from "@/components/public/Footer";
import ChatbotWidget from "@/components/public/ChatbotWidget";
import { useReveal } from "@/hooks/useReveal";
import { useMagnetic } from "@/hooks/useMagnetic";

const Divider = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="hairline" />
  </div>
);

const Index = () => {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  useReveal();
  useMagnetic();

  const { data: heroOffers } = useQuery({
    queryKey: ["hero-program-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("offers")
        .select("id, title, cover_image_url, image_url, venues(name, category, is_active, approval_status)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []).filter(
        (o: any) =>
          o.venues?.is_active !== false &&
          o.venues?.approval_status === "approved" &&
          (o.cover_image_url || o.image_url)
      );
    },
  });

  const programs = (heroOffers ?? []).slice(0, 6).map((o: any) => ({
    image: o.cover_image_url || o.image_url,
    category: (o.venues?.category || "Featured").toString().toUpperCase(),
    title: o.title,
    onClick: () => navigate("/offers"),
  }));

  const fallbackPrograms = [
    { image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=500&fit=crop", category: "RESTAURANT", title: "Fine dining collab" },
    { image: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=400&h=500&fit=crop", category: "NIGHTLIFE", title: "VIP table night" },
    { image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&h=500&fit=crop", category: "WELLNESS", title: "Spa & beauty day" },
    { image: "https://images.unsplash.com/photo-1455587734955-081b22074882?w=400&h=500&fit=crop", category: "EVENTS", title: "Exclusive launch party" },
    { image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=500&fit=crop", category: "HOTEL", title: "Boutique stay feature" },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <PulseFitHero
        logo="FamePass"
        navigation={[
          { label: "Venues", onClick: () => navigate("/venues") },
          { label: "Offers", hasDropdown: true, onClick: () => navigate("/offers") },
          { label: "Creators", onClick: () => navigate("/influencers") },
          { label: "About", onClick: () => navigate("/about") },
          { label: "Contact", onClick: () => navigate("/contact") },
        ]}
        ctaButton={{ label: "Get Started", onClick: () => navigate("/signup") }}
        title="The premium creator marketplace for exclusive venue partnerships."
        subtitle="FamePass connects standout venues with vetted creators — streamlined briefs, transparent payouts, and campaigns that actually convert."
        primaryAction={{ label: "Discover venues", onClick: () => navigate("/venues") }}
        secondaryAction={{ label: "Browse offers", onClick: () => navigate("/offers") }}
        disclaimer="*Free to join — no credit card required"
        socialProof={{
          avatars: [
            "https://i.pravatar.cc/150?img=12",
            "https://i.pravatar.cc/150?img=32",
            "https://i.pravatar.cc/150?img=47",
            "https://i.pravatar.cc/150?img=68",
          ],
          text: "Join 10,000+ creators and premium venues",
        }}
        programs={programs.length ? programs : fallbackPrograms}
      />
      <Divider />
      <div className="reveal"><StatsSection /></div>
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
      <div className="reveal"><TestimonialsSection /></div>
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
