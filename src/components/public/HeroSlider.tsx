import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Sparkles, Star, Zap } from "lucide-react";

const slides = [
  {
    title: "Discover Exclusive Venue Experiences",
    subtitle: "Connect with top venues and unlock premium offers curated for influencers",
    cta: "Explore Venues",
    ctaHref: "#venues",
    icon: <Sparkles className="w-5 h-5" />,
    gradient: "from-primary/60 via-primary/30 to-transparent",
    accent: "bg-primary/20 border-primary/30",
  },
  {
    title: "Turn Your Influence Into Rewards",
    subtitle: "Browse categories, find the perfect venue, and redeem exclusive deals",
    cta: "Browse Offers",
    ctaHref: "#offers",
    icon: <Star className="w-5 h-5" />,
    gradient: "from-accent/30 via-accent/10 to-transparent",
    accent: "bg-accent/15 border-accent/25",
  },
  {
    title: "Map-Based Venue Discovery",
    subtitle: "Find venues near you with our interactive map and apply to offers instantly",
    cta: "Open Map",
    ctaHref: "#map",
    icon: <Zap className="w-5 h-5" />,
    gradient: "from-purple-glow/40 via-purple-glow/15 to-transparent",
    accent: "bg-purple-glow/15 border-purple-glow/25",
  },
];

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Layered backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} transition-all duration-1000`} />

      {/* Animated orbs */}
      <div className="absolute top-10 right-[10%] w-80 h-80 rounded-full bg-accent/5 blur-[100px] animate-pulse" />
      <div className="absolute bottom-10 left-[5%] w-96 h-96 rounded-full bg-primary/8 blur-[120px]" />
      <div className="absolute top-1/2 right-[30%] w-64 h-64 rounded-full bg-purple-glow/5 blur-[80px]" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl space-y-8" key={current}>
          <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border ${slide.accent} backdrop-blur-sm`}>
            <span className="text-accent">{slide.icon}</span>
            <span className="text-sm font-semibold text-accent tracking-wide">FamePass Platform</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold text-foreground leading-[1.1] tracking-tight">
            {slide.title}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">{slide.subtitle}</p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-base px-8 h-13 rounded-xl shadow-lg shadow-accent/20" asChild>
              <a href={slide.ctaHref}>
                <MapPin className="w-5 h-5" />
                {slide.cta}
              </a>
            </Button>
            <Button size="lg" variant="outline" className="border-border hover:bg-card/80 text-base px-8 h-13 rounded-xl" asChild>
              <a href="#categories">Browse Categories</a>
            </Button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-8 pt-6">
            {[
              { label: "Active Venues", value: "50+" },
              { label: "Offers Available", value: "200+" },
              { label: "Happy Influencers", value: "1K+" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-foreground font-display">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button onClick={() => setCurrent((p) => (p - 1 + slides.length) % slides.length)} className="p-2.5 rounded-full bg-card/60 border border-border hover:bg-card transition-colors backdrop-blur-sm">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-500 ${i === current ? "w-10 bg-accent" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
              />
            ))}
          </div>
          <button onClick={() => setCurrent((p) => (p + 1) % slides.length)} className="p-2.5 rounded-full bg-card/60 border border-border hover:bg-card transition-colors backdrop-blur-sm">
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSlider;
