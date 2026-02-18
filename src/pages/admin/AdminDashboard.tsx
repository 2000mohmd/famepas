import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Building2, Users, Tag, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ venues: 0, influencers: 0, offers: 0, redemptions: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [venues, influencers, offers, redemptions] = await Promise.all([
        supabase.from("venues").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "influencer"),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("offer_redemptions").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        venues: venues.count ?? 0,
        influencers: influencers.count ?? 0,
        offers: offers.count ?? 0,
        redemptions: redemptions.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Admin <span className="text-gold">Dashboard</span>
        </h1>
        <p className="text-muted-foreground mb-8">Overview of your platform performance</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Venues" value={stats.venues} icon={<Building2 className="w-6 h-6" />} trend="12% this month" trendUp />
          <StatCard title="Influencers" value={stats.influencers} icon={<Users className="w-6 h-6" />} trend="8% this month" trendUp />
          <StatCard title="Active Offers" value={stats.offers} icon={<Tag className="w-6 h-6" />} trend="5 new" trendUp />
          <StatCard title="Redemptions" value={stats.redemptions} icon={<TrendingUp className="w-6 h-6" />} trend="23% this month" trendUp />
        </div>

        {/* Recent Activity */}
        <div className="gradient-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                <div className="w-2 h-2 rounded-full bg-gold" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">Activity placeholder #{i}</p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
