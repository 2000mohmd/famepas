import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Crown, Award, Gift, Share2 } from "lucide-react";
import { prettyLabel } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const tierConfig: Record<string, { icon: any; color: string; next: string; pointsNeeded: number }> = {
  bronze: { icon: Award, color: "text-orange-400", next: "Silver", pointsNeeded: 500 },
  silver: { icon: Award, color: "text-gray-400", next: "Gold", pointsNeeded: 1500 },
  gold: { icon: Crown, color: "text-yellow-500", next: "Platinum", pointsNeeded: 5000 },
  platinum: { icon: Crown, color: "text-cyan-400", next: "Elite", pointsNeeded: 15000 },
  elite: { icon: Trophy, color: "text-purple-500", next: "", pointsNeeded: 0 },
};

/** Kept in sync with tierConfig so the benefits table never contradicts the progress bar. */
const TIER_BENEFITS = [
  { tier: "Bronze", points: "0 – 499", perks: ["Basic profile", "Standard invitations", "1x point multiplier"] },
  { tier: "Silver", points: "500 – 1,499", perks: ["Silver badge", "Earlier access to new offers", "1.5x point multiplier"] },
  { tier: "Gold", points: "1,500 – 4,999", perks: ["Priority invitations", "Gold badge", "2x point multiplier"] },
  { tier: "Platinum", points: "5,000 – 14,999", perks: ["Featured in venue search", "Platinum badge", "3x point multiplier"] },
  { tier: "Elite", points: "15,000+", perks: ["VIP events access", "Elite badge", "5x point multiplier", "Dedicated support"] },
];

const InfluencerRewards = () => {
  const { user } = useAuth();
  const { toast } = useToast();

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

  const referralLink = user ? `${window.location.origin}/signup/influencer?ref=${user.id}` : "";
  const shareReferral = async () => {
    const text = "Join me on FamePass and start collaborating with venues!";
    if (navigator.share) {
      try { await navigator.share({ title: text, url: referralLink }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(referralLink);
      toast({ title: "Referral link copied" });
    }
  };

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[2rem] p-7 md:p-10 flex flex-wrap items-end justify-between gap-6 creator-hero">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] mb-3 creator-hero-eyebrow">FamePass rewards</p>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.02] creator-hero-title">Rewards & status</h1>
            <p className="mt-3 text-base md:text-lg opacity-75 max-w-2xl">Every visit and every great post earns points. Climb the tiers to unlock priority invites and featured placement.</p>
          </div>
        </div>

        {/* Current Tier */}
        <Card className="border-0" style={{ background: "linear-gradient(135deg, hsl(var(--gold-light)), hsl(var(--primary)))", color: "hsl(var(--venue-brand))" }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <TierIcon className={`w-10 h-10 ${config.color}`} />
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold">{prettyLabel(tier)} tier</h2>
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

        {/* Refer a creator */}
        <Card className="border-gold/20">
          <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / .2)" }}><Gift className="w-6 h-6" style={{ color: "hsl(var(--venue-brand))" }} /></span>
              <div>
                <p className="text-lg font-extrabold">Refer a creator, earn 100 points</p>
                <p className="text-sm text-muted-foreground">Once your friend's account is approved, you get the points.</p>
              </div>
            </div>
            <button type="button" onClick={shareReferral} className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-bold"
              style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
              <Share2 className="w-4 h-4" /> Share invite link
            </button>
          </CardContent>
        </Card>

        {/* Tier Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIER_BENEFITS.map((t) => {
            const current = tier === t.tier.toLowerCase();
            return (
              <div key={t.tier} className="relative rounded-[1.75rem] p-6 border shadow-[var(--venue-shadow)]"
                style={current
                  ? { background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))", borderColor: "hsl(var(--venue-brand))" }
                  : { background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
                {current && <span className="absolute right-5 top-5 rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }}>You're here</span>}
                <p className={`text-xl font-extrabold ${current ? "" : "text-foreground"}`}>{t.tier}</p>
                <p className={`text-xs mt-1 mb-4 ${current ? "opacity-70" : "text-muted-foreground"}`}>{t.points} points</p>
                <ul className="space-y-2">
                  {t.perks.map((perk) => (
                    <li key={perk} className={`flex items-center gap-2 text-sm ${current ? "" : "text-foreground/80"}`}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--primary))" }} /> {perk}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-gold" /> Top Influencers</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard?.map((entry: any, idx: number) => (
                <div key={entry.user_id} className={`flex items-center justify-between py-3 px-4 rounded-2xl ${entry.user_id === user?.id ? "bg-primary/15" : idx % 2 ? "" : "bg-muted/50"}`}>
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0"
                      style={idx === 0 ? { background: "linear-gradient(135deg,#F4D58D,#C9A14A)", color: "#3A2A05" }
                        : idx === 1 ? { background: "linear-gradient(135deg,#E8E8EC,#B9BAC2)", color: "#2B2C33" }
                        : idx === 2 ? { background: "linear-gradient(135deg,#E9B98F,#B87B4E)", color: "#3A1E0A" }
                        : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>{idx + 1}</span>
                    <div>
                      <p className="font-bold text-foreground">{entry.full_name || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">
                        {[entry.badge ? prettyLabel(entry.badge) : null, (entry.influencer_score ?? 0) > 0 ? `Score: ${entry.influencer_score}` : null]
                          .filter(Boolean)
                          .join(" • ") || "New creator"}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-foreground">{entry.points} <span className="font-medium text-muted-foreground">pts</span></span>
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
