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
import { useTranslation } from "react-i18next";

const tierConfig: Record<string, { icon: any; color: string; next: string; pointsNeeded: number }> = {
  bronze: { icon: Award, color: "text-orange-400", next: "silver", pointsNeeded: 500 },
  silver: { icon: Award, color: "text-gray-400", next: "gold", pointsNeeded: 1500 },
  gold: { icon: Crown, color: "text-yellow-500", next: "platinum", pointsNeeded: 5000 },
  platinum: { icon: Crown, color: "text-cyan-400", next: "elite", pointsNeeded: 15000 },
  elite: { icon: Trophy, color: "text-purple-500", next: "", pointsNeeded: 0 },
};

/** Kept in sync with tierConfig so the benefits table never contradicts the progress bar. */
const TIER_BENEFITS = [
  { tier: "bronze", points: "0 – 499", perks: ["basicProfile", "standardInvites", "mult1"] },
  { tier: "silver", points: "500 – 1,499", perks: ["silverBadge", "earlyAccess", "mult15"] },
  { tier: "gold", points: "1,500 – 4,999", perks: ["priorityInvites", "goldBadge", "mult2"] },
  { tier: "platinum", points: "5,000 – 14,999", perks: ["featured", "platinumBadge", "mult3"] },
  { tier: "elite", points: "15,000+", perks: ["vipEvents", "eliteBadge", "mult5", "dedicatedSupport"] },
];

const InfluencerRewards = () => {
  const { t } = useTranslation();
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
    const text = t("creator.rewards.shareText");
    if (navigator.share) {
      try { await navigator.share({ title: text, url: referralLink }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(referralLink);
      toast({ title: t("creator.rewards.linkCopied") });
    }
  };

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[2rem] p-7 md:p-10 flex flex-wrap items-end justify-between gap-6 creator-hero">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] mb-3 creator-hero-eyebrow">{t("creator.rewards.eyebrow")}</p>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.02] creator-hero-title">{t("creator.rewards.title")}</h1>
            <p className="mt-3 text-base md:text-lg opacity-75 max-w-2xl">{t("creator.rewards.subtitle")}</p>
          </div>
        </div>

        {/* Current Tier */}
        <Card className="border-0" style={{ background: "linear-gradient(135deg, hsl(var(--gold-light)), hsl(var(--primary)))", color: "hsl(var(--venue-brand))" }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <TierIcon className={`w-10 h-10 ${config.color}`} />
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold">{t("creator.rewards.tierName", { tier: t(`creator.rewards.tiers.${tier}`, { defaultValue: prettyLabel(tier) }) })}</h2>
                <p className="text-sm text-muted-foreground">{t("creator.rewards.pointsEarned", { n: points })}</p>
              </div>
            </div>
            {config.next && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{t("creator.rewards.progressTo", { tier: t(`creator.rewards.tiers.${config.next}`) })}</span>
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
                <p className="text-lg font-extrabold">{t("creator.rewards.referTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("creator.rewards.referBody")}</p>
              </div>
            </div>
            <button type="button" onClick={shareReferral} className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-bold"
              style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
              <Share2 className="w-4 h-4" /> {t("creator.rewards.shareLink")}
            </button>
          </CardContent>
        </Card>

        {/* Tier Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIER_BENEFITS.map((b) => {
            const current = tier === b.tier;
            return (
              <div key={b.tier} className="relative rounded-[1.75rem] p-6 border shadow-[var(--venue-shadow)]"
                style={current
                  ? { background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))", borderColor: "hsl(var(--venue-brand))" }
                  : { background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
                {current && <span className="absolute end-5 top-5 rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }}>{t("creator.rewards.youreHere")}</span>}
                <p className={`text-xl font-extrabold ${current ? "" : "text-foreground"}`}>{t(`creator.rewards.tiers.${b.tier}`)}</p>
                <p className={`text-xs mt-1 mb-4 ${current ? "opacity-70" : "text-muted-foreground"}`}>{t("creator.rewards.pointsRange", { range: b.points })}</p>
                <ul className="space-y-2">
                  {b.perks.map((perk) => (
                    <li key={perk} className={`flex items-center gap-2 text-sm ${current ? "" : "text-foreground/80"}`}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--primary))" }} /> {t(`creator.rewards.perks.${perk}`)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-gold" /> {t("creator.rewards.leaderboard")}</CardTitle></CardHeader>
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
                      <p className="font-bold text-foreground">{entry.full_name || t("creator.rewards.anonymous")}</p>
                      <p className="text-xs text-muted-foreground">
                        {[entry.badge ? t(`creator.badges.${entry.badge}`, { defaultValue: prettyLabel(entry.badge) }) : null, (entry.influencer_score ?? 0) > 0 ? t("creator.rewards.score", { n: entry.influencer_score }) : null]
                          .filter(Boolean)
                          .join(" • ") || t("creator.rewards.newCreator")}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-foreground">{entry.points} <span className="font-medium text-muted-foreground">{t("creator.rewards.pts")}</span></span>
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
