import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { TrendingUp, Users, Tag, Eye } from "lucide-react";

const AdminAnalytics = () => {
  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Platform <span className="text-gold">Analytics</span></h1>
        <p className="text-muted-foreground mb-8">Track your platform performance</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Views" value="12.4K" icon={<Eye className="w-6 h-6" />} trend="15% this month" trendUp />
          <StatCard title="New Users" value="348" icon={<Users className="w-6 h-6" />} trend="23% this month" trendUp />
          <StatCard title="Redemption Rate" value="67%" icon={<Tag className="w-6 h-6" />} trend="5% increase" trendUp />
          <StatCard title="Revenue" value="$4.2K" icon={<TrendingUp className="w-6 h-6" />} trend="18% growth" trendUp />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Top Venues</h2>
            <div className="space-y-3">
              {["Glamour Spa", "Le Bistro", "Elegance Salon", "Sky Lounge", "Velvet Club"].map((name, i) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <span className="text-gold font-bold text-sm w-6">#{i + 1}</span>
                    <span className="text-foreground text-sm">{name}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">{Math.floor(Math.random() * 200 + 50)} redemptions</span>
                </div>
              ))}
            </div>
          </div>

          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Popular Categories</h2>
            <div className="space-y-4">
              {[
                { name: "Beauty & Spa", pct: 35 },
                { name: "Dining", pct: 28 },
                { name: "Nightlife", pct: 20 },
                { name: "Fashion", pct: 12 },
                { name: "Fitness", pct: 5 },
              ].map(({ name, pct }) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{name}</span>
                    <span className="text-gold">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full gradient-gold" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
