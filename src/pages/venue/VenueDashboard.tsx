import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Tag, Users, TrendingUp, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VenueDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ offers: 0, redemptions: 0, events: 0 });
  const [venueName, setVenueName] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: venue } = await supabase.from("venues").select("id, name").eq("owner_id", user.id).maybeSingle();
      if (!venue) return;
      setVenueName(venue.name);
      const [offers, redemptions, events] = await Promise.all([
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
        supabase.from("offer_redemptions").select("id", { count: "exact", head: true }).in("offer_id",
          (await supabase.from("offers").select("id").eq("venue_id", venue.id)).data?.map(o => o.id) ?? []
        ),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
      ]);
      setStats({ offers: offers.count ?? 0, redemptions: redemptions.count ?? 0, events: events.count ?? 0 });
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Welcome, <span className="text-gold">{venueName || "Venue"}</span>
        </h1>
        <p className="text-muted-foreground mb-8">Manage your offers and track performance</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Active Offers" value={stats.offers} icon={<Tag className="w-6 h-6" />} />
          <StatCard title="Redemptions" value={stats.redemptions} icon={<Users className="w-6 h-6" />} trend="This month" trendUp />
          <StatCard title="Events" value={stats.events} icon={<CalendarDays className="w-6 h-6" />} />
        </div>

        <div className="gradient-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Create New Offer", href: "/venue/offers", icon: Tag },
              { label: "View Redemptions", href: "/venue/redemptions", icon: Users },
              { label: "Add Event", href: "/venue/events", icon: CalendarDays },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-gold/30 transition-all cursor-pointer group">
                <Icon className="w-8 h-8 text-gold mb-3" />
                <p className="text-foreground font-medium group-hover:text-gold transition-colors">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueDashboard;
