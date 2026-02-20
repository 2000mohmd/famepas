import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Building2, Users, Tag, TrendingUp, CheckCircle, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  type: "venue" | "influencer" | "offer" | "redemption";
  label: string;
  time: string;
  status?: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    venues: 0,
    influencers: 0,
    offers: 0,
    redemptions: 0,
    pendingVenues: 0,
    activeOffers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [venues, influencers, offers, redemptions, pendingVenues, activeOffers, recentVenues, recentRedemptions] = await Promise.all([
        supabase.from("venues").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "influencer"),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("offer_redemptions").select("id", { count: "exact", head: true }),
        supabase.from("venues").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("venues").select("id, name, created_at, approval_status").order("created_at", { ascending: false }).limit(3),
        supabase.from("offer_redemptions").select("id, created_at, status").order("created_at", { ascending: false }).limit(3),
      ]);

      setStats({
        venues: venues.count ?? 0,
        influencers: influencers.count ?? 0,
        offers: offers.count ?? 0,
        redemptions: redemptions.count ?? 0,
        pendingVenues: pendingVenues.count ?? 0,
        activeOffers: activeOffers.count ?? 0,
      });

      const activity: ActivityItem[] = [];
      (recentVenues.data ?? []).forEach((v: any) => {
        activity.push({ id: v.id, type: "venue", label: `New venue: ${v.name}`, time: v.created_at, status: v.approval_status });
      });
      (recentRedemptions.data ?? []).forEach((r: any) => {
        activity.push({ id: r.id, type: "redemption", label: "Offer redeemed", time: r.created_at, status: r.status });
      });
      activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activity.slice(0, 6));
      setLoading(false);
    };
    fetchData();
  }, []);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const activityIcon = (type: string) => {
    if (type === "venue") return <Building2 className="w-4 h-4 text-gold" />;
    if (type === "influencer") return <Users className="w-4 h-4 text-primary" />;
    if (type === "offer") return <Tag className="w-4 h-4 text-accent" />;
    return <TrendingUp className="w-4 h-4 text-success" />;
  };

  const statusBadge = (status?: string) => {
    if (!status) return null;
    if (status === "approved" || status === "completed") return <Badge className="bg-success/20 text-success border-success/30 text-xs">{status}</Badge>;
    if (status === "pending") return <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">pending</Badge>;
    if (status === "rejected" || status === "failed") return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">{status}</Badge>;
    return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Admin <span className="text-gold">Dashboard</span>
        </h1>
        <p className="text-muted-foreground mb-8">Platform overview & KPIs</p>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard title="Total Venues" value={stats.venues} icon={<Building2 className="w-6 h-6" />} trend={`${stats.pendingVenues} pending approval`} trendUp={stats.pendingVenues === 0} />
          <StatCard title="Influencers" value={stats.influencers} icon={<Users className="w-6 h-6" />} trend="Registered users" trendUp />
          <StatCard title="Active Offers" value={stats.activeOffers} icon={<Tag className="w-6 h-6" />} trend={`${stats.offers} total offers`} trendUp />
          <StatCard title="Total Redemptions" value={stats.redemptions} icon={<TrendingUp className="w-6 h-6" />} trend={stats.offers > 0 ? `${Math.round((stats.redemptions / stats.offers) * 100)}% rate` : "—"} trendUp />
        </div>

        {/* Alert banners */}
        {stats.pendingVenues > 0 && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-lg border border-gold/30 bg-gold/10">
            <Clock className="w-5 h-5 text-gold shrink-0" />
            <p className="text-sm text-foreground">
              <strong>{stats.pendingVenues} venue{stats.pendingVenues > 1 ? "s" : ""}</strong> pending approval.{" "}
              <a href="/admin/venues" className="underline text-gold hover:opacity-80">Review now →</a>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Recent Activity</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 rounded-lg bg-secondary/50 animate-pulse" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={item.id + item.type} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0">
                      {activityIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(item.time)}</p>
                    </div>
                    {statusBadge(item.status)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {[
                { label: "Manage Venues & Approvals", href: "/admin/venues", icon: Building2, desc: "Add, edit, approve partners" },
                { label: "Review Offers", href: "/admin/offers", icon: Tag, desc: "Audit all active campaigns" },
                { label: "Influencer Management", href: "/admin/influencers", icon: Users, desc: "Verify & manage users" },
                { label: "Platform Analytics", href: "/admin/analytics", icon: TrendingUp, desc: "Metrics & reports" },
                { label: "Billing & Subscriptions", href: "/admin/billing", icon: CheckCircle, desc: "Tiers & commission config" },
                { label: "Content Moderation", href: "/admin/moderation", icon: XCircle, desc: "Review flagged content" },
              ].map(({ label, href, icon: Icon, desc }) => (
                <a key={href} href={href} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0 group-hover:bg-gold/20 transition-colors">
                    <Icon className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
