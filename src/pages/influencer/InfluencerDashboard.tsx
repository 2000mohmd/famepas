import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Send, CalendarDays, CheckCircle, DollarSign, TrendingUp, Star, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const InfluencerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["influencer-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["influencer-stats", user?.id],
    queryFn: async () => {
      const [invitations, bookingsUpcoming, bookingsCompleted, earnings] = await Promise.all([
        supabase.from("invitations").select("id", { count: "exact" }).eq("influencer_id", user!.id).eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact" }).eq("influencer_id", user!.id).eq("status", "upcoming"),
        supabase.from("bookings").select("id", { count: "exact" }).eq("influencer_id", user!.id).eq("status", "completed"),
        supabase.rpc("get_wallet_balance", { _user_id: user!.id }),
      ]);
      return {
        pendingInvitations: invitations.count ?? 0,
        upcomingBookings: bookingsUpcoming.count ?? 0,
        completedVisits: bookingsCompleted.count ?? 0,
        walletBalance: earnings.data ?? 0,
      };
    },
    enabled: !!user,
  });

  const { data: recentOffers } = useQuery({
    queryKey: ["recent-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("offers")
        .select("*, venues(name, city, logo_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: rewardPoints } = useQuery({
    queryKey: ["reward-points", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reward_points").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: warnings } = useQuery({
    queryKey: ["influencer-warnings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("influencer_warnings" as any).select("*").eq("influencer_id", user!.id).order("created_at", { ascending: false }).limit(5);
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const profileStrength = (() => {
    if (!profile) return 0;
    let score = 0;
    if (profile.full_name) score += 15;
    if (profile.bio) score += 15;
    if (profile.avatar_url) score += 15;
    if (profile.instagram_handle) score += 15;
    if (profile.tiktok_handle) score += 10;
    if (profile.niche && profile.niche.length > 0) score += 15;
    if (profile.phone) score += 15;
    return score;
  })();

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Welcome back, <span className="text-gold">{profile?.full_name || "Influencer"}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Here's your activity summary</p>
        </div>

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h3 className="font-semibold text-destructive">Warnings</h3>
              </div>
              <div className="space-y-2">
                {warnings.map((w: any) => (
                  <div key={w.id} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-foreground">{w.warning_message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Strength */}
        <Card className="border-gold/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Profile Strength</span>
              <span className="text-sm text-gold font-bold">{profileStrength}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div className="bg-gold h-2.5 rounded-full transition-all" style={{ width: `${profileStrength}%` }} />
            </div>
            {profileStrength < 100 && (
              <Button variant="link" className="text-gold p-0 mt-2 h-auto" onClick={() => navigate("/influencer/profile")}>
                Complete your profile →
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:border-gold/30 transition-colors" onClick={() => navigate("/influencer/invitations")}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><Send className="w-5 h-5 text-gold" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingInvitations ?? 0}</p>
                <p className="text-sm text-muted-foreground">Pending Invitations</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-gold/30 transition-colors" onClick={() => navigate("/influencer/bookings")}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><CalendarDays className="w-5 h-5 text-gold" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.upcomingBookings ?? 0}</p>
                <p className="text-sm text-muted-foreground">Upcoming Bookings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><CheckCircle className="w-5 h-5 text-gold" /></div>
              <div>
                <p className="text-2xl font-bold">{stats?.completedVisits ?? 0}</p>
                <p className="text-sm text-muted-foreground">Completed Visits</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-gold/30 transition-colors" onClick={() => navigate("/influencer/earnings")}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><DollarSign className="w-5 h-5 text-gold" /></div>
              <div>
                <p className="text-2xl font-bold">$ {Number(stats?.walletBalance ?? 0).toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rewards Tier */}
        {rewardPoints && (
          <Card className="border-gold/20">
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 text-gold" />
                <div>
                  <p className="font-semibold capitalize">{rewardPoints.tier} Tier</p>
                  <p className="text-sm text-muted-foreground">{rewardPoints.points} points earned</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/influencer/rewards")}>View Rewards</Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Offers */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold">New Offers Near You</h2>
            <Button variant="link" className="text-gold" onClick={() => navigate("/influencer/explore")}>View All →</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentOffers?.map((offer: any) => (
              <Card key={offer.id} className="hover:border-gold/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{offer.title}</CardTitle>
                    <Badge variant="outline" className="capitalize">{offer.offer_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{offer.venues?.name} • {offer.venues?.city}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{offer.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {offer.min_followers > 0 && <span>{offer.min_followers}+ followers</span>}
                    {offer.max_redemptions && <span>• {offer.max_redemptions - offer.current_redemptions} slots left</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerDashboard;
