import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Instagram, Users } from "lucide-react";

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
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-3">Creators</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">
            Top <span className="gradient-text">Influencers</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">The highest-rated creators on FamePass this week</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {influencers.map((inf: any) => (
            <div key={inf.user_id} className="group premium-card rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  {inf.avatar_url ? (
                    <img src={inf.avatar_url} alt={inf.full_name} className="w-20 h-20 rounded-full object-cover ring-2 ring-primary/40" />
                  ) : (
                    <div className="w-20 h-20 rounded-full gradient-purple flex items-center justify-center text-2xl font-display font-bold text-white">
                      {(inf.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  {inf.is_verified && (
                    <BadgeCheck className="absolute -bottom-1 -right-1 w-6 h-6 text-gold fill-background" />
                  )}
                </div>
                <h3 className="mt-3 font-semibold text-foreground text-sm truncate w-full">{inf.full_name || "Creator"}</h3>
                {inf.instagram_handle && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate w-full justify-center">
                    <Instagram className="w-3 h-3 flex-shrink-0" /> @{inf.instagram_handle}
                  </p>
                )}
                <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-xs">
                  <Users className="w-3 h-3 text-gold" />
                  <span className="font-semibold text-foreground">{(inf.followers_count || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopInfluencersSection;
