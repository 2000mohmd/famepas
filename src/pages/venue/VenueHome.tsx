import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Megaphone, CalendarDays, Film, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

/** Adnan, Venue Portal items 3 & 4: a real landing page instead of redirecting
 * straight to Campaigns — live campaigns, upcoming visits, content received —
 * and a pending venue sees "Under review" instead of an empty dashboard. */
const VenueHome = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<any>(null);
  const [liveCampaigns, setLiveCampaigns] = useState<any[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<any[]>([]);
  const [recentContent, setRecentContent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: v } = await supabase.from("venues").select("*").eq("owner_id", user.id)
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      setVenue(v);
      if (!v || v.approval_status !== "approved") { setLoading(false); return; }

      const [campaigns, bookings, deliverables] = await Promise.all([
        supabase.from("campaigns").select("id, title, status, cover_image_url").eq("venue_id", v.id).eq("status", "active").limit(5),
        supabase.from("bookings").select("id, influencer_id, scheduled_date, offers(title)").eq("venue_id", v.id)
          .eq("status", "upcoming").order("scheduled_date", { ascending: true }).limit(5),
        supabase.from("deliverables").select("id, platform, submitted_at, post_url, bookings!inner(venue_id, influencer_id)")
          .eq("bookings.venue_id", v.id).order("submitted_at", { ascending: false, nullsFirst: false }).limit(5),
      ]);
      setLiveCampaigns(campaigns.data ?? []);

      const bks = bookings.data ?? [];
      const infIds = [...new Set(bks.map((b: any) => b.influencer_id))];
      const delIds = [...new Set((deliverables.data ?? []).map((d: any) => (d as any).bookings?.influencer_id))].filter(Boolean);
      const allIds = [...new Set([...infIds, ...delIds])];
      let profiles: Record<string, any> = {};
      if (allIds.length) {
        const { data: profs } = await supabase.rpc("get_public_profiles_basic", { _user_ids: allIds });
        (profs ?? []).forEach((p: any) => { profiles[p.user_id] = p; });
      }
      setUpcomingVisits(bks.map((b: any) => ({ ...b, profile: profiles[b.influencer_id] })));
      setRecentContent((deliverables.data ?? []).map((d: any) => ({ ...d, profile: profiles[(d as any).bookings?.influencer_id] })));
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout type="venue">
        <div className="text-center text-muted-foreground py-24">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!venue || venue.approval_status === "pending") {
    return (
      <DashboardLayout type="venue">
        <Card className="max-w-lg mx-auto mt-16">
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground">Your venue is under review</h1>
            <p className="text-sm text-muted-foreground">
              Our team is reviewing your application. You'll get an email as soon as you're approved — then your dashboard opens up fully.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (venue.approval_status === "rejected") {
    return (
      <DashboardLayout type="venue">
        <Card className="max-w-lg mx-auto mt-16">
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <h1 className="text-xl font-bold text-foreground">Your application wasn't approved</h1>
            <p className="text-sm text-muted-foreground">Contact support if you think this is a mistake.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout type="venue">
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Welcome back{venue.name ? `, ${venue.name}` : ""}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2"><Megaphone className="w-4 h-4" /> Live campaigns</h2>
                <Link to="/venue/campaigns" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
              </div>
              {liveCampaigns.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">No live campaigns yet.</p>
                  <Button size="sm" asChild><Link to="/venue/campaigns/new">Create your first campaign</Link></Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {liveCampaigns.map((c) => (
                    <Link key={c.id} to="/venue/campaigns" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      {c.cover_image_url ? <img src={c.cover_image_url} className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-muted" />}
                      <span className="text-sm font-medium truncate">{c.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Upcoming visits</h2>
                <Link to="/venue/bookings" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
              </div>
              {upcomingVisits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No upcoming visits scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingVisits.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <span className="text-sm font-medium truncate">{b.profile?.full_name ?? "Creator"}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {b.scheduled_date ? format(new Date(b.scheduled_date), "MMM d") : "TBD"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2"><Film className="w-4 h-4" /> Content received</h2>
                <Link to="/venue/content" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
              </div>
              {recentContent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No content submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentContent.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <span className="text-sm font-medium truncate">{d.profile?.full_name ?? "Creator"}</span>
                      <span className="text-xs text-muted-foreground capitalize">{d.platform}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueHome;
