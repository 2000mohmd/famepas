import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Star, Trophy, Crown, Award } from "lucide-react";

const tierConfig: Record<string, { icon: any; color: string; next: string; pointsNeeded: number }> = {
  bronze: { icon: Award, color: "text-orange-400", next: "Silver", pointsNeeded: 500 },
  silver: { icon: Award, color: "text-gray-400", next: "Gold", pointsNeeded: 1500 },
  gold: { icon: Crown, color: "text-yellow-500", next: "Platinum", pointsNeeded: 5000 },
  platinum: { icon: Crown, color: "text-cyan-400", next: "Elite", pointsNeeded: 15000 },
  elite: { icon: Trophy, color: "text-purple-500", next: "", pointsNeeded: 0 },
};

const InfluencerRewards = () => {
  const { user } = useAuth();

  const { data: rewardPoints } = useQuery({
    queryKey: ["my-rewards", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reward_points").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_leaderboard", { limit_count: 10 });
      return data ?? [];
    },
  });

  const tier = rewardPoints?.tier || "bronze";
  const points = rewardPoints?.points || 0;
  const config = tierConfig[tier] || tierConfig.bronze;
  const TierIcon = config.icon;
  const progress = config.pointsNeeded > 0 ? Math.min((points / config.pointsNeeded) * 100, 100) : 100;

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Rewards & Status</h1>
          <p className="text-muted-foreground">Earn points and climb the ranks</p>
        </div>

        {/* Current Tier */}
        <Card className="border-gold/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <TierIcon className={`w-10 h-10 ${config.color}`} />
              <div>
                <h2 className="text-2xl font-bold capitalize">{tier} Tier</h2>
                <p className="text-sm text-muted-foreground">{points} points earned</p>
              </div>
            </div>
            {config.next && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress to {config.next}</span>
                  <span className="text-gold">{points} / {config.pointsNeeded}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div className="bg-gold h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { tier: "Bronze", points: "0-499", perks: ["Basic profile", "Standard invitations", "1x point multiplier"] },
            { tier: "Gold", points: "500-4999", perks: ["Priority invitations", "Gold badge", "2x point multiplier"] },
            { tier: "Elite", points: "15000+", perks: ["VIP events access", "Elite badge", "5x point multiplier", "Dedicated support"] },
          ].map((t) => (
            <Card key={t.tier} className={tier === t.tier.toLowerCase() ? "border-gold/30" : ""}>
              <CardHeader><CardTitle className="text-base">{t.tier}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">{t.points} points</p>
                <ul className="space-y-1">
                  {t.perks.map((p) => <li key={p} className="text-sm text-muted-foreground">• {p}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-gold" /> Top Influencers</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard?.map((entry: any, idx: number) => (
                <div key={entry.user_id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${entry.user_id === user?.id ? "bg-primary/10 border border-gold/20" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${idx < 3 ? "text-gold" : "text-muted-foreground"}`}>#{idx + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{entry.full_name || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{entry.badge} • Score: {entry.influencer_score}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{entry.points} pts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerRewards;
