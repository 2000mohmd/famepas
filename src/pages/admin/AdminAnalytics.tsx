import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { TrendingUp, Users, Tag, Eye, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CategoryStat { name: string; count: number; }

const AdminAnalytics = () => {
  const [stats, setStats] = useState({ venues: 0, influencers: 0, redemptions: 0, offers: 0 });
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [topVenues, setTopVenues] = useState<{ name: string; redemptions: number }[]>([]);
  const [cityFilter, setCityFilter] = useState("all");
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilters = async () => {
      const { data } = await supabase.from("venues").select("city").not("city", "is", null);
      const unique = Array.from(new Set((data ?? []).map((v: any) => v.city).filter(Boolean))).sort();
      setCities(unique as string[]);
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      // Base venue query
      let venueQuery = supabase.from("venues").select("id", { count: "exact", head: true });
      if (cityFilter !== "all") venueQuery = venueQuery.eq("city", cityFilter);

      const [venues, influencers, redemptions, offers, venueList, categoriesRaw] = await Promise.all([
        venueQuery,
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "influencer"),
        supabase.from("offer_redemptions").select("id", { count: "exact", head: true }),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("venues").select("name, id, category").eq("is_active", true).limit(20),
        supabase.from("venues").select("category"),
      ]);

      setStats({
        venues: venues.count ?? 0,
        influencers: influencers.count ?? 0,
        redemptions: redemptions.count ?? 0,
        offers: offers.count ?? 0,
      });

      // Build category distribution from venues
      const catMap: Record<string, number> = {};
      (categoriesRaw.data ?? []).forEach((v: any) => {
        catMap[v.category] = (catMap[v.category] ?? 0) + 1;
      });
      const catArr = Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
      setCategoryStats(catArr);

      // Top venues by offer count (proxy metric since we don't have per-venue redemption counts easily)
      const venuesToShow = (venueList.data ?? []).slice(0, 5).map((v: any) => ({
        name: v.name,
        redemptions: Math.floor(Math.random() * 0), // placeholder - real data needs aggregation
      }));

      // Fetch actual redemption counts per venue via offers
      const venueIds = (venueList.data ?? []).map((v: any) => v.id);
      if (venueIds.length > 0) {
        const { data: offerData } = await supabase.from("offers").select("venue_id, current_redemptions").in("venue_id", venueIds);
        const venueMap: Record<string, number> = {};
        (offerData ?? []).forEach((o: any) => {
          venueMap[o.venue_id] = (venueMap[o.venue_id] ?? 0) + (o.current_redemptions ?? 0);
        });
        const ranked = (venueList.data ?? [])
          .map((v: any) => ({ name: v.name, redemptions: venueMap[v.id] ?? 0 }))
          .sort((a, b) => b.redemptions - a.redemptions)
          .slice(0, 5);
        setTopVenues(ranked);
      }
      setLoading(false);
    };
    fetchStats();
  }, [cityFilter]);

  const redemptionRate = stats.offers > 0 ? Math.round((stats.redemptions / stats.offers) * 100) : 0;
  const maxCat = Math.max(...categoryStats.map(c => c.count), 1);

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Platform <span className="text-gold">Analytics</span></h1>
            <p className="text-muted-foreground">Track platform performance and generate insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-44 bg-secondary border-border">
                <SelectValue placeholder="All cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Active Venues" value={stats.venues} icon={<Eye className="w-6 h-6" />} trend={cityFilter !== "all" ? `In ${cityFilter}` : "Platform-wide"} trendUp />
          <StatCard title="Total Influencers" value={stats.influencers} icon={<Users className="w-6 h-6" />} trend="Registered users" trendUp />
          <StatCard title="Redemption Rate" value={`${redemptionRate}%`} icon={<Tag className="w-6 h-6" />} trend={`${stats.redemptions} total redemptions`} trendUp={redemptionRate > 50} />
          <StatCard title="Total Offers" value={stats.offers} icon={<TrendingUp className="w-6 h-6" />} trend="Across all venues" trendUp />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Venues */}
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Top Venues by Redemptions</h2>
            {loading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded-lg bg-secondary/50 animate-pulse" />)}</div>
            ) : topVenues.length === 0 ? (
              <p className="text-muted-foreground text-sm">No venue data yet.</p>
            ) : (
              <div className="space-y-3">
                {topVenues.map((v, i) => (
                  <div key={v.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <span className="text-gold font-bold text-sm w-6">#{i + 1}</span>
                      <span className="text-foreground text-sm">{v.name}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">{v.redemptions} redemptions</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Venue Categories</h2>
            {loading ? (
              <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-8 rounded bg-secondary/50 animate-pulse" />)}</div>
            ) : categoryStats.length === 0 ? (
              <p className="text-muted-foreground text-sm">No category data yet.</p>
            ) : (
              <div className="space-y-4">
                {categoryStats.map(({ name, count }) => {
                  const pct = Math.round((count / maxCat) * 100);
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground capitalize">{name}</span>
                        <span className="text-gold">{count} venues</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full gradient-gold transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
