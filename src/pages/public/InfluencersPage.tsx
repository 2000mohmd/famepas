import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { Input } from "@/components/ui/input";
import { Search, BadgeCheck, Instagram, Users, Star } from "lucide-react";

const InfluencersPage = () => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"followers" | "rating" | "name">("followers");

  const { data: influencers } = useQuery({
    queryKey: ["public-influencers"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_discoverable_influencers");
      return data ?? [];
    },
  });

  const filtered = (influencers ?? [])
    .filter((i: any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (i.full_name || "").toLowerCase().includes(s) || (i.instagram_handle || "").toLowerCase().includes(s);
    })
    .sort((a: any, b: any) => {
      if (sortBy === "followers") return (b.followers_count || 0) - (a.followers_count || 0);
      if (sortBy === "rating") return (b.average_rating || 0) - (a.average_rating || 0);
      return (a.full_name || "").localeCompare(b.full_name || "");
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-12 relative overflow-hidden">
        <div className="absolute top-10 -left-32 w-96 h-96 rounded-full bg-gold/10 blur-[120px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gold text-xs font-semibold tracking-[0.3em] uppercase mb-3">Creators</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-4">
            Meet our <span className="gradient-text">Influencers</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Discover the verified creators driving traffic and bookings for premium venues.
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or handle…"
                className="pl-11 h-12 bg-card border-border rounded-xl"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-12 px-4 rounded-xl bg-card border border-border text-sm text-foreground"
            >
              <option value="followers">Sort: Most Followers</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="name">Sort: Name (A–Z)</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No influencers found.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {filtered.map((inf: any) => (
                <div key={inf.user_id} className="premium-card rounded-2xl p-5 group hover:-translate-y-1">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative">
                      {inf.avatar_url ? (
                        <img src={inf.avatar_url} alt={inf.full_name} className="w-24 h-24 rounded-full object-cover ring-2 ring-gold/40" />
                      ) : (
                        <div className="w-24 h-24 rounded-full gradient-gold flex items-center justify-center text-3xl font-display font-bold text-accent-foreground">
                          {(inf.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      {inf.is_verified && <BadgeCheck className="absolute -bottom-1 -right-1 w-6 h-6 text-gold fill-background" />}
                    </div>
                    <h3 className="mt-4 font-semibold text-foreground truncate w-full">{inf.full_name || "Creator"}</h3>
                    {inf.instagram_handle && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate w-full justify-center">
                        <Instagram className="w-3 h-3 flex-shrink-0" /> @{inf.instagram_handle}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 text-xs">
                        <Users className="w-3 h-3 text-gold" />
                        <span className="font-semibold text-foreground">{(inf.followers_count || 0).toLocaleString()}</span>
                      </div>
                      {inf.average_rating ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs">
                          <Star className="w-3 h-3 text-gold fill-gold" />
                          <span className="font-semibold text-foreground">{Number(inf.average_rating).toFixed(1)}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default InfluencersPage;
