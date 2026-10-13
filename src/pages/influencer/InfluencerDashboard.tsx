import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Send, CalendarDays, CheckCircle, DollarSign, Star, AlertTriangle, Search, ArrowRight, Award, Instagram, Sparkles } from "lucide-react";
import { VenueHero, HeroButton, BrandButton, VenueEmpty } from "@/components/venue/VenueUI";
import OfferTile from "@/components/influencer/OfferTile";
import { useNavigate } from "react-router-dom";
import { prettyLabel } from "@/lib/format";

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
      // Only live offers: active and not past their end date.
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("offers")
        .select("*, venues(name, city, logo_url, cover_image_url)")
        .eq("is_active", true)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  // Adnan, "Influencer Portal" item 57: prompt to rate a venue automatically
  // after a completed visit, rather than relying on the creator to find the
  // Reviews page on their own.
  const { data: unreviewedCount } = useQuery({
    queryKey: ["unreviewed-bookings-count", user?.id],
    queryFn: async () => {
      const { data: bks } = await supabase
        .from("bookings").select("id").eq("influencer_id", user!.id).eq("status", "completed");
      const bookingIds = (bks ?? []).map((b: any) => b.id);
      if (!bookingIds.length) return 0;
      const { data: existing } = await supabase
        .from("reviews").select("booking_id").eq("reviewer_id", user!.id).in("booking_id", bookingIds);
      const reviewed = new Set((existing ?? []).map((r: any) => r.booking_id));
      return bookingIds.filter((id: string) => !reviewed.has(id)).length;
    },
    enabled: !!user,
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
        <VenueHero
          eyebrow="Creator dashboard"
          title={<>Welcome back,<br />{profile?.full_name?.split(" ")[0] || "creator"} <span aria-hidden>✨</span></>}
          subtitle="Your invitations, visits and earnings at a glance."
          actions={<HeroButton to="/influencer/explore"><Search /> Find offers</HeroButton>}
          aside={
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Send, label: "Pending invitations", value: stats?.pendingInvitations ?? 0, to: "/influencer/invitations" },
                { icon: CalendarDays, label: "Upcoming visits", value: stats?.upcomingBookings ?? 0, to: "/influencer/bookings" },
                { icon: CheckCircle, label: "Completed visits", value: stats?.completedVisits ?? 0, to: "/influencer/bookings" },
                { icon: DollarSign, label: "Wallet balance", value: `$${Number(stats?.walletBalance ?? 0).toFixed(0)}`, to: "/influencer/earnings" },
              ].map(({ icon: Icon, label, value, to }) => (
                <button key={label} type="button" onClick={() => navigate(to)} className="text-left rounded-3xl p-5 transition hover:brightness-110"
                  style={{ background: "hsl(var(--venue-brand-foreground) / .07)", border: "1px solid hsl(var(--venue-brand-foreground) / .12)" }}>
                  <Icon className="w-5 h-5 mb-5" style={{ color: "hsl(var(--primary))" }} />
                  <p className="text-3xl md:text-4xl font-extrabold leading-none">{value}</p>
                  <p className="text-xs mt-2 opacity-70">{label}</p>
                </button>
              ))}
            </div>
          }
        />

        {!!unreviewedCount && unreviewedCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-card border border-border p-5 shadow-[var(--venue-shadow)]">
            <div className="flex items-center gap-4">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / .2)" }}><Star className="w-5 h-5" style={{ color: "hsl(var(--venue-brand))" }} /></span>
              <div>
                <p className="font-extrabold text-foreground">Rate your visit{unreviewedCount > 1 ? "s" : ""}</p>
                <p className="text-sm text-muted-foreground">You have {unreviewedCount} completed visit{unreviewedCount > 1 ? "s" : ""} waiting for a review.</p>
              </div>
            </div>
            <BrandButton to="/influencer/reviews">Rate now</BrandButton>
          </div>
        )}

        {warnings && warnings.length > 0 && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-extrabold text-red-700">Warnings from the FamePass team</h3>
            </div>
            <div className="space-y-2">
              {warnings.map((w: any) => (
                <div key={w.id} className="p-4 rounded-2xl bg-white border border-red-100">
                  <p className="text-sm text-neutral-800">{w.warning_message}</p>
                  <p className="text-xs text-neutral-500 mt-1">{new Date(w.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Profile strength ring */}
          <div className="rounded-[2rem] bg-card border border-border p-6 md:p-7 shadow-[var(--venue-shadow)] flex items-center gap-6">
            <span className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--venue-brand))" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${profileStrength * 0.974} 97.4`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-foreground">{profileStrength}%</span>
            </span>
            <div>
              <p className="text-lg font-extrabold text-foreground">Profile strength</p>
              <p className="text-sm text-muted-foreground mt-1">{profileStrength < 100 ? "Complete profiles get picked by venues far more often." : "Your profile is complete — nice."}</p>
              {profileStrength < 100 && <button type="button" onClick={() => navigate("/influencer/profile")} className="mt-3 inline-flex items-center gap-1 text-sm font-bold" style={{ color: "hsl(var(--venue-brand))" }}>Complete profile <ArrowRight className="w-4 h-4" /></button>}
            </div>
          </div>

          {/* Rewards tier */}
          <button type="button" onClick={() => navigate("/influencer/rewards")} className="text-left rounded-[2rem] p-6 md:p-7 flex items-center gap-5 transition hover:brightness-105"
            style={{ background: "linear-gradient(135deg, hsl(var(--gold-light)), hsl(var(--primary)))", color: "hsl(var(--venue-brand))" }}>
            <span className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--venue-brand))" }}><Award className="w-8 h-8" style={{ color: "hsl(var(--primary))" }} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">Your tier</p>
              <p className="text-2xl font-extrabold">{prettyLabel(rewardPoints?.tier ?? "bronze")}</p>
              <p className="text-sm opacity-80">{rewardPoints?.points ?? 0} points · view rewards</p>
            </div>
          </button>

          {/* Instagram / next action */}
          {profile && !profile.instagram_verified ? (
            <div className="rounded-[2rem] p-6 md:p-7 text-white flex flex-col justify-between gap-4" style={{ background: "linear-gradient(135deg,#f09433,#dc2743 55%,#bc1888)" }}>
              <div>
                <Instagram className="w-7 h-7 mb-3" />
                <p className="text-lg font-extrabold">Connect your Instagram</p>
                <p className="text-sm text-white/85 mt-1">Venues need your real followers before you can apply.</p>
              </div>
              <button type="button" onClick={() => navigate("/influencer/settings")} className="self-start h-11 px-5 rounded-full bg-white text-neutral-900 text-sm font-bold">Connect now</button>
            </div>
          ) : (
            <button type="button" onClick={() => navigate("/influencer/invitations")} className="text-left rounded-[2rem] bg-card border border-border p-6 md:p-7 shadow-[var(--venue-shadow)] hover:border-primary transition">
              <Send className="w-7 h-7 mb-3" style={{ color: "hsl(var(--venue-brand))" }} />
              <p className="text-lg font-extrabold text-foreground">Invitations</p>
              <p className="text-sm text-muted-foreground mt-1">Venues can invite you directly — check your inbox.</p>
            </button>
          )}
        </div>

        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">New offers</h2>
              <p className="text-muted-foreground text-sm mt-1">Fresh experiences from venues on FamePass.</p>
            </div>
            <button type="button" onClick={() => navigate("/influencer/explore")} className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: "hsl(var(--venue-brand))" }}>View all <ArrowRight className="w-4 h-4" /></button>
          </div>
          {recentOffers && recentOffers.length === 0 ? (
            <VenueEmpty compact icon={Sparkles} title="No live offers right now" body="New venues join every week — we'll show their offers here the moment they go live."
              actions={<BrandButton to="/influencer/explore"><Search /> Explore venues</BrandButton>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {recentOffers?.map((offer: any) => <OfferTile key={offer.id} offer={offer} />)}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerDashboard;
