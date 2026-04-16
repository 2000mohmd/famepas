import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import heroVenue from "@/assets/hero-venue.jpg";
import heroInfluencer from "@/assets/hero-influencer.jpg";

const slides = [
  {
    title: "Discover Exclusive Venue Experiences",
    subtitle: "Connect with top venues and unlock premium offers curated for influencers",
    cta: "Explore Venues",
    ctaLink: "/venues",
    icon: <Sparkles className="w-5 h-5" />,
    image: heroVenue,
  },
  {
    title: "Turn Your Influence Into Rewards",
    subtitle: "Browse categories, find the perfect venue, and redeem exclusive deals",
    cta: "Browse Offers",
    ctaLink: "/offers",
    icon: <Star className="w-5 h-5" />,
    image: heroInfluencer,
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
      {/* Background image */}
      {slides.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <img src={s.image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        </div>
      ))}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl space-y-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-accent/30 bg-accent/10 backdrop-blur-sm">
            <span className="text-accent">{slide.icon}</span>
            <span className="text-sm font-semibold text-accent tracking-wide">FamePass Platform</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold text-foreground leading-[1.1] tracking-tight">
            {slide.title}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">{slide.subtitle}</p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-base px-8 h-13 rounded-xl shadow-lg shadow-accent/20" asChild>
              <Link to={slide.ctaLink}>
                <MapPin className="w-5 h-5" />
                {slide.cta}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-border hover:bg-card/80 text-base px-8 h-13 rounded-xl" asChild>
              <Link to="/categories">Browse Categories</Link>
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
