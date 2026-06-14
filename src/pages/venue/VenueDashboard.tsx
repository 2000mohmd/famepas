import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Tag, Users, TrendingUp, CalendarDays, Send, Eye, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const VenueDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ offers: 0, activeOffers: 0, redemptions: 0, events: 0, invitations: 0, pendingInvitations: 0, bookings: 0, todayBookings: 0 });
  const [venueName, setVenueName] = useState("");
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const { data: venue } = await supabase.from("venues").select("id, name").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!venue) return;
      setVenueName(venue.name);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [offers, activeOffers, events, invitations, pendingInv, bookings, todayBooks, recentRedemptions] = await Promise.all([
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("venue_id", venue.id).eq("is_active", true),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
        supabase.from("invitations").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
        supabase.from("invitations").select("id", { count: "exact", head: true }).eq("venue_id", venue.id).eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("venue_id", venue.id).gte("scheduled_date", today.toISOString()),
        supabase.from("offer_redemptions").select("id, status, created_at, offer_id").in("offer_id",
          (await supabase.from("offers").select("id").eq("venue_id", venue.id)).data?.map(o => o.id) ?? []
        ).order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        offers: offers.count ?? 0,
        activeOffers: activeOffers.count ?? 0,
        redemptions: (recentRedemptions.data ?? []).length,
        events: events.count ?? 0,
        invitations: invitations.count ?? 0,
        pendingInvitations: pendingInv.count ?? 0,
        bookings: bookings.count ?? 0,
        todayBookings: todayBooks.count ?? 0,
      });

      setRecentActivity((recentRedemptions.data ?? []).map(r => ({
        id: r.id,
        type: "redemption",
        status: r.status,
        date: r.created_at,
      })));
    };
    fetchAll();
  }, [user]);

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Welcome, <span className="text-gold">{venueName || "Venue"}</span>
        </h1>
        <p className="text-muted-foreground mb-8">Manage your campaigns and track performance</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Active Campaigns" value={stats.activeOffers} icon={<Tag className="w-5 h-5" />} />
          <StatCard title="Pending Invitations" value={stats.pendingInvitations} icon={<Send className="w-5 h-5" />} trend="Awaiting response" />
          <StatCard title="Today's Bookings" value={stats.todayBookings} icon={<CalendarDays className="w-5 h-5" />} />
          <StatCard title="Total Bookings" value={stats.bookings} icon={<Users className="w-5 h-5" />} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="gradient-card rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Offers</p>
            <p className="text-3xl font-bold text-gold">{stats.offers}</p>
          </div>
          <div className="gradient-card rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Events Created</p>
            <p className="text-3xl font-bold text-gold">{stats.events}</p>
          </div>
          <div className="gradient-card rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Invitations Sent</p>
            <p className="text-3xl font-bold text-gold">{stats.invitations}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Create Campaign", href: "/venue/offers", icon: Tag },
                { label: "Discover Influencers", href: "/venue/discover", icon: Users },
                { label: "View Bookings", href: "/venue/bookings", icon: CalendarDays },
                { label: "Messages", href: "/venue/messages", icon: Send },
                { label: "Analytics", href: "/venue/analytics", icon: BarChart3 },
                { label: "Add Event", href: "/venue/events", icon: CalendarDays },
              ].map(({ label, href, icon: Icon }) => (
                <div key={label} onClick={() => navigate(href)} className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-gold/30 transition-all cursor-pointer group">
                  <Icon className="w-6 h-6 text-gold mb-2" />
                  <p className="text-foreground font-medium text-sm group-hover:text-gold transition-colors">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Eye className="w-4 h-4 text-gold" />
                      <span className="text-sm text-foreground">Redemption request</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={a.status === "approved" ? "bg-success/20 text-success border-success/30" : a.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-warning/20 text-warning border-warning/30"} >{a.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(a.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueDashboard;
