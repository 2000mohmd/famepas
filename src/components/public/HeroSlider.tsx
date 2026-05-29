import { Button } from "@/components/ui/button";
import { Search, Send, CheckCircle2, Eye, MessageCircle, Calendar, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroInfluencer from "@/assets/hero-influencer.jpg";

const chips = ["LA-Based", "Age Range: 25-35", "Beauty", "Wellness"];

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

  const featuredImg = heroInfluencer;

  return (
    <section className="relative overflow-hidden pt-36 pb-28 lg:pb-40">
      {/* Ambient glows — softer, single accent */}
      <div className="absolute top-10 -left-32 w-[520px] h-[520px] rounded-full bg-primary/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[640px] h-[640px] rounded-full bg-purple-glow/10 blur-[180px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
        {/* LEFT — editorial headline */}
        <div className="space-y-10">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase">— FamePass Marketplace</p>
          <h1 className="font-display font-normal leading-[0.98] tracking-[-0.03em] text-5xl sm:text-6xl lg:text-7xl xl:text-[6rem]">
            The Premium Creator <span className="italic gradient-text font-normal">Marketplace</span> for Exclusive Venue Partnerships
          </h1>

          <p className="text-lg text-muted-foreground/90 max-w-md leading-[1.75]">
            Ditch the gamble with creators and start building with FamePass, the system that takes the chaos out of the campaign.
          </p>

          <div className="pt-2">
            <Button
              size="lg"
              className="gradient-gold text-accent-foreground hover:opacity-95 rounded-full px-10 h-14 text-base font-semibold btn-lift group"
              asChild
            >
              <Link to="/venues">
                Discover Venues
                <span className="inline-block transition-transform group-hover:translate-x-1 ml-1">→</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* RIGHT — composite mockup */}
        <div className="relative">
          {/* Filter chips row */}
          <div className="flex flex-wrap gap-2 justify-end mb-4">
            {chips.map((c) => (
              <span key={c} className="px-3.5 py-1.5 rounded-full glass text-xs font-medium text-foreground/80 border border-gold/20">
                {c}
              </span>
            ))}
          </div>

          {/* AI search bar */}
          <div className="glass rounded-full px-4 py-3 flex items-center gap-2 mb-4 max-w-md ml-auto">
            <Search className="w-4 h-4 text-gold flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">a day in a life influencer with a casual tone and bright...</span>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {/* Big image card */}
            <div className="col-span-3 relative aspect-[3/4] rounded-3xl overflow-hidden premium-card p-2">
              <div className="relative h-full w-full rounded-2xl overflow-hidden">
                <img src={featuredImg} alt="Featured creator" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

                {/* Top creator pill */}
                <div className="absolute top-3 left-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass">
                  <div className="w-6 h-6 rounded-full gradient-purple" />
                  <span className="text-xs font-semibold">Madison Blake</span>
                </div>

                {/* Mention badge */}
                <div className="absolute top-1/2 left-3 -translate-y-4 inline-flex items-center gap-2 px-3 py-2 rounded-2xl glass">
                  <div className="w-7 h-7 rounded-full gradient-gold" />
                  <div>
                    <p className="text-[10px] font-semibold text-gold">@madisonblake</p>
                    <p className="text-[9px] text-muted-foreground">mentioned you in their post</p>
                  </div>
                </div>

                {/* Invite button */}
                <div className="absolute bottom-20 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-gold/30">
                  <Send className="w-3 h-3 text-gold" />
                  <span className="text-[10px] font-semibold">Invite to Campaign</span>
                </div>

                {/* Bottom stats */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] text-foreground/90">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> 15.8k</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" /> 3.5k</span>
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[10px] text-foreground/80">
                  <Calendar className="w-3 h-3" /> May 11, 2026
                </div>
              </div>
            </div>

            {/* Right column stack */}
            <div className="col-span-2 space-y-3">
              {/* Send brief */}
              <div className="premium-card rounded-2xl p-3">
                <div className="flex -space-x-2 mb-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-card bg-gradient-to-br from-primary to-purple-glow" />
                  ))}
                </div>
                <button className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 text-[11px] font-semibold">
                  <Send className="w-3 h-3 text-gold" /> Send Brief
                </button>
              </div>

              {/* Order conditions */}
              <div className="premium-card rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold">Order Conditions</p>
                  <span className="text-[9px] text-success inline-flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Fulfilled
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] text-foreground/80">
                    <CheckCircle2 className="w-2.5 h-2.5 text-success flex-shrink-0" />
                    <span>Select maximum of 2 products</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-foreground/80">
                    <CheckCircle2 className="w-2.5 h-2.5 text-success flex-shrink-0" />
                    <span>Total cart value up to $100</span>
                  </div>
                </div>
              </div>

              {/* Payout */}
              <div className="premium-card rounded-2xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full gradient-gold" />
                    <span className="text-[10px] font-semibold">@amberlee</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground">Standard (10%)</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-[9px] text-success font-medium">
                  Generate Promo Code
                </div>
              </div>

              {/* Social stats */}
              <div className="premium-card rounded-2xl p-3">
                <p className="text-[10px] font-semibold mb-2">Social Stats</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[9px] text-muted-foreground">Engagements</p>
                    <p className="text-sm font-display font-bold gradient-text inline-flex items-center gap-1">
                      123K <TrendingUp className="w-3 h-3 text-gold" />
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Reach</p>
                    <p className="text-sm font-display font-bold gradient-text inline-flex items-center gap-1">
                      456K <TrendingUp className="w-3 h-3 text-gold" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="relative mt-20 lg:mt-28 py-10 bg-card/40 border-y border-border backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground mb-6">Trusted by premium venues & top creators</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
            {["FamePass", "Elite Venues", "Top Creators", "Premium Brands", "VIP Access", "Exclusive"].map((b) => (
              <span key={b} className="font-display text-lg text-muted-foreground/80 tracking-wide">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSlider;
