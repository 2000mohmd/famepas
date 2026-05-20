import { Button } from "@/components/ui/button";
import { Sparkles, Play, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroVenue from "@/assets/hero-venue.jpg";

const HeroSlider = () => {
  const { data: featured } = useQuery({
    queryKey: ["hero-featured-offer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("offers")
        .select("id, title, cover_image_url, image_url, discount_value, venues(id, name, city, logo_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const featuredImg = (featured as any)?.cover_image_url || (featured as any)?.image_url || heroVenue;

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-24 pb-12">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-purple-glow/25 blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* LEFT — copy */}
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-xs font-semibold text-foreground/90 tracking-wider uppercase">The Premium Creator Marketplace</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight">
            Discover, Book<br />
            and Earn with <span className="gradient-text">Top Venues</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
            The largest curated marketplace connecting elite influencers with premium venues for exclusive offers and unforgettable experiences.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button size="lg" className="gradient-purple text-white hover:opacity-90 rounded-full px-8 h-12 gap-2 shadow-lg shadow-primary/30" asChild>
              <Link to="/explore">Discover <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 h-12 border-border bg-card/40 backdrop-blur-sm hover:bg-card" asChild>
              <Link to="/login">Get Started</Link>
            </Button>
            <button className="inline-flex items-center gap-2 px-2 text-sm text-foreground/80 hover:text-foreground transition-colors">
              <span className="w-9 h-9 rounded-full gradient-purple flex items-center justify-center shadow-lg shadow-primary/30">
                <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
              </span>
              Watch a video
            </button>
          </div>

          {/* Stats card */}
          <div className="inline-flex divide-x divide-border/60 rounded-2xl glass px-2 py-4 mt-2">
            {[
              { v: "50+", l: "Venues" },
              { v: "200+", l: "Offers" },
              { v: "1K+", l: "Influencers" },
            ].map((s) => (
              <div key={s.l} className="px-6">
                <p className="text-2xl font-display font-bold gradient-text">{s.v}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-9 h-9 rounded-full border-2 border-background bg-gradient-to-br from-primary to-purple-glow" />
              ))}
            </div>
            <div>
              <p className="font-bold text-foreground">40K+ <span className="text-muted-foreground font-normal text-sm">Active Members</span></p>
            </div>
          </div>
        </div>

        {/* RIGHT — featured floating card */}
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 gradient-purple blur-3xl opacity-30 rounded-[3rem]" />
          <div className="relative aspect-[4/5] max-w-md mx-auto rounded-[2rem] overflow-hidden premium-card p-3 glow-purple">
            <div className="relative h-full w-full rounded-[1.5rem] overflow-hidden">
              <img src={featuredImg} alt="Featured" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

              {/* Top badge */}
              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                <span className="text-xs font-semibold">Featured</span>
              </div>

              {/* Bottom info card */}
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl glass p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Latest Offer</p>
                  <p className="font-display font-bold text-foreground truncate max-w-[180px]">
                    {(featured as any)?.title || "Premium Experience"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="font-display font-bold text-gold">
                    ${(featured as any)?.discount_value || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSlider;
