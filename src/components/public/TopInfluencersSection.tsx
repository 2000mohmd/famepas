import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Instagram, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const TopInfluencersSection = () => {
  const { data: influencers } = useQuery({
    queryKey: ["top-influencers-home"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_discoverable_influencers");
      return (data ?? []).slice(0, 10);
    },
  });

  if (!influencers || influencers.length === 0) return null;

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <h2 className="font-display font-normal leading-[1.05] tracking-tight text-4xl sm:text-5xl lg:text-6xl">
            Top <span className="italic gradient-text">Creators</span>
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
            The highest-rated influencers on FamePass this week — ready to collaborate with your brand.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {influencers.map((inf: any) => (
            <div key={inf.user_id} className="group premium-card rounded-3xl p-5 transition-all duration-500 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  {inf.avatar_url ? (
                    <img src={inf.avatar_url} alt={inf.full_name} className="w-20 h-20 rounded-full object-cover ring-2 ring-gold/30" />
                  ) : (
                    <div className="w-20 h-20 rounded-full gradient-purple flex items-center justify-center text-2xl font-display font-bold text-foreground">
                      {(inf.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  {inf.is_verified && (
                    <BadgeCheck className="absolute -bottom-1 -right-1 w-6 h-6 text-gold fill-background" />
                  )}
                </div>
                <h3 className="mt-4 font-display font-semibold text-foreground text-base truncate w-full">{inf.full_name || "Creator"}</h3>
                {inf.instagram_handle && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate w-full justify-center">
                    <Instagram className="w-3 h-3 flex-shrink-0" /> @{inf.instagram_handle}
                  </p>
                )}
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/20 text-xs">
                  <Users className="w-3 h-3 text-gold" />
                  <span className="font-semibold text-foreground">{(inf.followers_count || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild variant="outline" className="rounded-full px-8 h-12 border-border glass hover:border-gold/40">
            <Link to="/influencers">View all creators <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TopInfluencersSection;
