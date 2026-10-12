import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Building2, Users, Tag, TrendingUp, CheckCircle, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [sales, setSales] = useState({ live: 0, signedThisWeek: 0, liveTarget: 500, weeklyTarget: 12 });

  useEffect(() => {
    const db = supabase as any;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    (async () => {
      const [{ count: live }, { data: signings }, { data: targets }] = await Promise.all([
        db.from("leads").select("id", { count: "exact", head: true }).eq("stage", "live"),
        db.from("lead_activities").select("outcome").eq("type", "stage_change").gte("happened_at", weekAgo),
        supabase.from("platform_settings").select("value").eq("key", "sales_targets").maybeSingle(),
      ]);
      const t = (targets?.value ?? {}) as any;
      setSales({
        live: live ?? 0,
        signedThisWeek: (signings ?? []).filter((s: any) => String(s.outcome ?? "").endsWith("signed_up")).length,
        liveTarget: t.annual_live_venues ?? 500,
        weeklyTarget: t.weekly_signings ?? 12,
      });
    })();
  }, []);

  const [stats, setStats] = useState({
    venues: 0,
    influencers: 0,
    offers: 0,
    redemptions: 0,
    completedRedemptions: 0,
    pendingVenues: 0,
    activeOffers: 0,
    newVenuesThisWeek: 0,
    newInfluencersThisWeek: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const weekAgoISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [roles, venues, newVenuesThisWeek, offers, redemptions, completedRedemptions, pendingVenues, activeOffers, recentVenues, recentRedemptions] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("venues").select("id", { count: "exact", head: true }),
        supabase.from("venues").select("id", { count: "exact", head: true }).gte("created_at", weekAgoISO),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("offer_redemptions").select("id", { count: "exact", head: true }),
        supabase.from("offer_redemptions").select("id", { count: "exact", head: true }).in("status", ["redeemed", "completed"]),
        supabase.from("venues").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("venues").select("id, name, created_at, approval_status").order("created_at", { ascending: false }).limit(3),
        supabase.from("offer_redemptions").select("id, created_at, status, influencer_id, offers(title, venues(name))").order("created_at", { ascending: false }).limit(3),
      ]);

      // Registered creators = has the influencer role and isn't a dual-role
      // venue/admin seed account — same definition the Influencers list page uses,
      // so this number matches it instead of drifting (Adnan's Sept 24 audit).
      const roleRows = roles.data ?? [];
      const roleInfluencerIds = roleRows.filter((r: any) => r.role === "influencer").map((r: any) => r.user_id);
      const staffIds = new Set(roleRows.filter((r: any) => r.role !== "influencer").map((r: any) => r.user_id));
      const creatorIds = [...new Set(roleInfluencerIds)].filter((id) => !staffIds.has(id));
      let newInfluencersThisWeek = 0;
      if (creatorIds.length) {
        const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true })
          .in("user_id", creatorIds).gte("created_at", weekAgoISO);
        newInfluencersThisWeek = count ?? 0;
      }

      setStats({
        venues: venues.count ?? 0,
        influencers: creatorIds.length,
        offers: offers.count ?? 0,
        redemptions: redemptions.count ?? 0,
        completedRedemptions: completedRedemptions.count ?? 0,
        pendingVenues: pendingVenues.count ?? 0,
        activeOffers: activeOffers.count ?? 0,
        newVenuesThisWeek: newVenuesThisWeek.count ?? 0,
        newInfluencersThisWeek,
      });

      const activity: ActivityItem[] = [];
      (recentVenues.data ?? []).forEach((v: any) => {
        activity.push({ id: v.id, type: "venue", label: t("admin.dashboard.newVenue", { name: v.name }), time: v.created_at, status: v.approval_status });
      });
      const influencerIds = [...new Set((recentRedemptions.data ?? []).map((r: any) => r.influencer_id).filter(Boolean))];
      const { data: redemptionProfiles } = influencerIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", influencerIds)
        : { data: [] as any[] };
      (recentRedemptions.data ?? []).forEach((r: any) => {
        const influencerName = redemptionProfiles?.find((p: any) => p.user_id === r.influencer_id)?.full_name || t("admin.dashboard.influencerFallback");
        const offerTitle = r.offers?.title || t("admin.dashboard.anOffer");
        const venueName = r.offers?.venues?.name ? t("admin.dashboard.atVenue", { name: r.offers.venues.name }) : "";
        activity.push({ id: r.id, type: "redemption", label: t("admin.dashboard.appliedTo", { influencer: influencerName, offer: offerTitle, venue: venueName }), time: r.created_at, status: r.status });
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
    if (mins < 60) return t("admin.dashboard.minsAgo", { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("admin.dashboard.hoursAgo", { count: hrs });
    return t("admin.dashboard.daysAgo", { count: Math.floor(hrs / 24) });
  };

  const activityIcon = (type: string) => {
    if (type === "venue") return <Building2 className="w-4 h-4 text-gold" />;
    if (type === "influencer") return <Users className="w-4 h-4 text-primary" />;
    if (type === "offer") return <Tag className="w-4 h-4 text-accent" />;
    return <TrendingUp className="w-4 h-4 text-success" />;
  };

  const statusBadge = (status?: string) => {
    if (!status) return null;
    const label = t(`admin.dashboard.status.${status}`, status);
    if (status === "approved" || status === "completed") return <Badge className="bg-success/20 text-success border-success/30 text-xs">{label}</Badge>;
    if (status === "pending") return <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">{label}</Badge>;
    if (status === "rejected" || status === "failed") return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">{label}</Badge>;
    return <Badge variant="secondary" className="text-xs">{label}</Badge>;
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          {t("admin.dashboard.titlePrefix")} <span className="text-gold">{t("navLabel.Dashboard", "Dashboard")}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{t("admin.dashboard.subtitle")}</p>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
          {/* Spec: sales numbers lead, because a signup count hides whether
              venues ever go live. Total venues survives as context. */}
          <StatCard
            title={t("admin.dashboard.liveVenues")}
            value={sales.live}
            icon={<Building2 className="w-6 h-6" />}
            trend={t("admin.dashboard.liveVenuesTrend", { target: sales.liveTarget, signedUp: stats.venues })}
            trendUp={sales.live > 0}
          />
          <StatCard
            title={t("admin.dashboard.signingsThisWeek")}
            value={sales.signedThisWeek}
            icon={<TrendingUp className="w-6 h-6" />}
            trend={t("admin.dashboard.targetTrend", { target: sales.weeklyTarget })}
            trendUp={sales.signedThisWeek >= sales.weeklyTarget}
          />
          <StatCard title={t("navLabel.Influencers", "Influencers")} value={stats.influencers} icon={<Users className="w-6 h-6" />} trend={t("admin.dashboard.thisWeekTrend", { count: stats.newInfluencersThisWeek })} trendUp={stats.newInfluencersThisWeek > 0} />
          <StatCard title={t("admin.dashboard.activeOffers")} value={stats.activeOffers} icon={<Tag className="w-6 h-6" />} trend={t("admin.dashboard.totalOffersTrend", { count: stats.offers })} trendUp={stats.offers > 0} />
          <StatCard title={t("admin.dashboard.totalCreatorVisits")} value={stats.redemptions} icon={<TrendingUp className="w-6 h-6" />} trend={t("admin.dashboard.completedVisitsTrend", { count: stats.completedRedemptions })} trendUp={stats.completedRedemptions > 0} />
        </div>

        {/* Alert banners */}
        {stats.pendingVenues > 0 && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-lg border border-gold/30 bg-gold/10">
            <Clock className="w-5 h-5 text-gold shrink-0" />
            <p className="text-sm text-foreground">
              <strong>{t("admin.dashboard.venuesCount", { count: stats.pendingVenues })}</strong> {t("admin.dashboard.pendingApproval")}{" "}
              <a href="/admin/venues" className="underline text-gold hover:opacity-80">{t("admin.dashboard.reviewNow")}</a>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="gradient-card rounded-xl border border-border p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">{t("admin.dashboard.recentActivity")}</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 rounded-lg bg-secondary/50 animate-pulse" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("admin.dashboard.noRecentActivity")}</p>
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
            <h2 className="font-display text-xl font-bold text-foreground mb-4">{t("admin.dashboard.quickActions")}</h2>
            <div className="space-y-3">
              {[
                { labelKey: "admin.dashboard.manageVenues", href: "/admin/venues", icon: Building2, descKey: "admin.dashboard.manageVenuesDesc" },
                { labelKey: "admin.dashboard.reviewOffers", href: "/admin/offers", icon: Tag, descKey: "admin.dashboard.reviewOffersDesc" },
                { labelKey: "admin.dashboard.influencerManagement", href: "/admin/influencers", icon: Users, descKey: "admin.dashboard.influencerManagementDesc" },
                { labelKey: "admin.dashboard.platformAnalytics", href: "/admin/analytics", icon: TrendingUp, descKey: "admin.dashboard.platformAnalyticsDesc" },
                { labelKey: "admin.dashboard.billingSubscriptions", href: "/admin/billing", icon: CheckCircle, descKey: "admin.dashboard.billingSubscriptionsDesc" },
                { labelKey: "admin.dashboard.contentModeration", href: "/admin/moderation", icon: XCircle, descKey: "admin.dashboard.contentModerationDesc" },
              ].map(({ labelKey, href, icon: Icon, descKey }) => (
                <a key={href} href={href} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0 group-hover:bg-gold/20 transition-colors">
                    <Icon className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(descKey)}</p>
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
