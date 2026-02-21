import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StatCard from "@/components/StatCard";
import { Tag, Users, TrendingUp, CalendarDays, Eye, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const VenueAnalytics = () => {
  const { user } = useAuth();
  const [venueId, setVenueId] = useState<string | null>(null);
  const [stats, setStats] = useState({ offers: 0, redemptions: 0, events: 0, invitations: 0, bookings: 0, completedBookings: 0 });
  const [offerStats, setOfferStats] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
      if (!venue) return;
      setVenueId(venue.id);

      const [offRes, evtRes, invRes, bookRes, compBookRes] = await Promise.all([
        supabase.from("offers").select("id, title, current_redemptions, max_redemptions, is_active, offer_type").eq("venue_id", venue.id),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
        supabase.from("invitations").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("venue_id", venue.id).eq("status", "completed"),
      ]);

      const offers = offRes.data ?? [];
      const totalRedemptions = offers.reduce((s, o) => s + (o.current_redemptions || 0), 0);

      setStats({
        offers: offers.length,
        redemptions: totalRedemptions,
        events: evtRes.count ?? 0,
        invitations: invRes.count ?? 0,
        bookings: bookRes.count ?? 0,
        completedBookings: compBookRes.count ?? 0,
      });
      setOfferStats(offers);
    };
    fetchData();
  }, [user]);

  const redemptionRate = stats.offers > 0
    ? Math.round((stats.redemptions / Math.max(stats.offers, 1)) * 100)
    : 0;

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Venue <span className="text-gold">Analytics</span>
        </h1>
        <p className="text-muted-foreground mb-8">Track your campaign performance</p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard title="Active Offers" value={offerStats.filter(o => o.is_active).length} icon={<Tag className="w-5 h-5" />} />
          <StatCard title="Total Redemptions" value={stats.redemptions} icon={<Users className="w-5 h-5" />} />
          <StatCard title="Events" value={stats.events} icon={<CalendarDays className="w-5 h-5" />} />
          <StatCard title="Invitations Sent" value={stats.invitations} icon={<Eye className="w-5 h-5" />} />
          <StatCard title="Total Bookings" value={stats.bookings} icon={<BarChart3 className="w-5 h-5" />} />
          <StatCard title="Completed" value={stats.completedBookings} icon={<TrendingUp className="w-5 h-5" />} />
        </div>

        <div className="gradient-card rounded-xl border border-border p-6 mb-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Performance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-secondary/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Avg. Redemptions/Offer</p>
              <p className="text-3xl font-bold text-gold">{stats.offers > 0 ? (stats.redemptions / stats.offers).toFixed(1) : "0"}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Booking Completion Rate</p>
              <p className="text-3xl font-bold text-gold">{stats.bookings > 0 ? Math.round((stats.completedBookings / stats.bookings) * 100) : 0}%</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Campaigns</p>
              <p className="text-3xl font-bold text-gold">{stats.offers}</p>
            </div>
          </div>
        </div>

        <div className="gradient-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Campaign Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Campaign</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Redemptions</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Limit</th>
                </tr>
              </thead>
              <tbody>
                {offerStats.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No campaigns yet</td></tr>
                ) : offerStats.map(o => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-3 font-medium text-foreground">{o.title}</td>
                    <td className="p-3"><Badge variant="secondary" className="capitalize">{o.offer_type}</Badge></td>
                    <td className="p-3">
                      <Badge className={o.is_active ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                        {o.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-3 text-foreground font-medium">{o.current_redemptions}</td>
                    <td className="p-3 text-muted-foreground">{o.max_redemptions ?? "∞"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueAnalytics;
