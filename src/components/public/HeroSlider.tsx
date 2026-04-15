import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Sparkles } from "lucide-react";

const slides = [
  {
    title: "Discover Exclusive Venue Experiences",
    subtitle: "Connect with top venues and unlock premium offers curated for influencers",
    cta: "Explore Venues",
    gradient: "from-primary/60 via-primary/30 to-transparent",
  },
  {
    title: "Turn Your Influence Into Rewards",
    subtitle: "Browse categories, find the perfect venue, and redeem exclusive deals",
    cta: "Browse Offers",
    gradient: "from-accent/30 via-accent/10 to-transparent",
  },
  {
    title: "Map-Based Venue Discovery",
    subtitle: "Find venues near you with our interactive map and apply to offers instantly",
    cta: "Open Map",
    gradient: "from-purple-glow/40 via-purple-glow/15 to-transparent",
  },
];

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} transition-all duration-1000`} />
      
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl space-y-6 animate-fade-in" key={current}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">FamePass Platform</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight">
            {slide.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg">{slide.subtitle}</p>
          <div className="flex gap-4 pt-2">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-base px-8">
              <MapPin className="w-5 h-5" />
              {slide.cta}
            </Button>
            <Button size="lg" variant="outline" className="border-border hover:bg-card text-base px-8" asChild>
              <a href="#categories">Browse Categories</a>
            </Button>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button onClick={() => setCurrent((p) => (p - 1 + slides.length) % slides.length)} className="p-2 rounded-full bg-card/50 border border-border hover:bg-card transition-colors">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-accent" : "w-2 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
          <button onClick={() => setCurrent((p) => (p + 1) % slides.length)} className="p-2 rounded-full bg-card/50 border border-border hover:bg-card transition-colors">
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSlider;
