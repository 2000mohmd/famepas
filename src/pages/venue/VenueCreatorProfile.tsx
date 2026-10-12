import DashboardLayout from "@/components/DashboardLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Instagram, Music2, Star, Users, Briefcase, Send } from "lucide-react";

/**
 * Adnan, recap E3: venue-facing creator profile, reachable from Discover.
 * Only shows real, derivable numbers (collabs, rating, recent posted work,
 * venues worked with) -- no fabricated engagement % or reach, since real
 * Instagram analytics (VP9/IP54) is still an open decision.
 */
type Profile = {
  user_id: string; full_name: string; avatar_url: string | null; bio: string | null;
  city: string | null; country: string | null; niche: string[] | null;
  instagram_handle: string | null; tiktok_handle: string | null;
  followers_count: number | null; tiktok_followers: number | null;
  is_verified: boolean | null; collab_count: number; avg_rating: number | null; review_count: number;
};
type Work = { post_url: string; posted_at: string; venue_name: string };
type Venue = { venue_id: string; venue_name: string; logo_url: string | null };
type Review = { id: string; rating: number; review_text: string | null; created_at: string; venue_name: string | null };

const VenueCreatorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [work, setWork] = useState<Work[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteOfferId, setInviteOfferId] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("venues").select("id").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => setVenueId((data as any)?.id ?? null));
  }, [user]);

  const { data: liveOffers } = useQuery({
    queryKey: ["venue-live-offers", venueId],
    queryFn: async () => {
      const { data } = await supabase.from("offers").select("id, title").eq("venue_id", venueId).eq("is_active", true);
      return data ?? [];
    },
    enabled: !!venueId,
  });

  const sendInvite = async () => {
    if (!venueId || !id || !inviteOfferId) return;
    setSendingInvite(true);
    const { error } = await (supabase as any).from("invitations").insert({
      venue_id: venueId, influencer_id: id, offer_id: inviteOfferId,
      message: inviteMessage.trim() || null, status: "pending",
    });
    setSendingInvite(false);
    if (error) { toast({ title: "Couldn't send invite", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Invite sent", description: `${profile?.full_name} will see it in their Invitations.` });
    setInviteOpen(false);
    setInviteOfferId("");
    setInviteMessage("");
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: w }, { data: v }, { data: r }] = await Promise.all([
        (supabase as any).rpc("get_creator_profile", { _user_id: id }),
        (supabase as any).rpc("get_creator_recent_work", { _user_id: id }),
        (supabase as any).rpc("get_creator_venues_worked_with", { _user_id: id }),
        (supabase as any).rpc("get_creator_reviews", { _user_id: id }),
      ]);
      setProfile((p ?? [])[0] ?? null);
      setWork(w ?? []);
      setVenues(v ?? []);
      setReviews(r ?? []);
      setLoading(false);
    })();
  }, [id]);

  const maxFollowers = Math.max(profile?.followers_count ?? 0, profile?.tiktok_followers ?? 0);

  return (
    <DashboardLayout type="venue">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <button onClick={() => navigate("/venue/discover")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ChevronLeft className="w-4 h-4" /> Back to Discover
        </button>

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Loading…</p>
        ) : !profile ? (
          <p className="text-muted-foreground text-center py-12">Creator not found.</p>
        ) : (
          <>
            <div className="flex items-start gap-4 mb-6">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-display font-bold text-foreground">{profile.full_name}</h1>
                  {profile.is_verified && <Badge variant="secondary">Verified</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{[profile.city, profile.country].filter(Boolean).join(", ")}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {profile.instagram_handle && <span className="flex items-center gap-1"><Instagram className="w-3.5 h-3.5" /> @{profile.instagram_handle}</span>}
                  {profile.tiktok_handle && <span className="flex items-center gap-1"><Music2 className="w-3.5 h-3.5" /> @{profile.tiktok_handle}</span>}
                </div>
              </div>
            </div>

            {profile.bio && <p className="text-sm text-muted-foreground mb-6">{profile.bio}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Card><CardContent className="pt-5 pb-4 text-center">
                <p className="text-lg font-semibold text-foreground flex items-center justify-center gap-1"><Users className="w-4 h-4" /> {maxFollowers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </CardContent></Card>
              <Card><CardContent className="pt-5 pb-4 text-center">
                <p className="text-lg font-semibold text-foreground flex items-center justify-center gap-1"><Briefcase className="w-4 h-4" /> {profile.collab_count}</p>
                <p className="text-xs text-muted-foreground">Collabs</p>
              </CardContent></Card>
              <Card><CardContent className="pt-5 pb-4 text-center">
                <p className="text-lg font-semibold text-foreground flex items-center justify-center gap-1">
                  <Star className="w-4 h-4" /> {profile.avg_rating != null ? profile.avg_rating : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{profile.review_count} review{profile.review_count === 1 ? "" : "s"}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-5 pb-4 text-center">
                <p className="text-lg font-semibold text-foreground">{venues.length}</p>
                <p className="text-xs text-muted-foreground">Venues worked with</p>
              </CardContent></Card>
            </div>

            {profile.niche && profile.niche.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Niches</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.niche.map((n) => <Badge key={n} variant="secondary">{n}</Badge>)}
                </div>
              </div>
            )}

            {venues.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Venues worked with</p>
                <div className="flex flex-wrap gap-3">
                  {venues.map((v) => (
                    <div key={v.venue_id} className="flex items-center gap-2 bg-muted/40 border border-border rounded-full pl-1 pr-3 py-1">
                      {v.logo_url ? <img src={v.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-muted" />}
                      <span className="text-xs text-foreground">{v.venue_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {work.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Recent work</p>
                <div className="space-y-2">
                  {work.map((w, i) => (
                    <a key={i} href={w.post_url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted/60">
                      <span className="text-foreground">{w.venue_name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(w.posted_at).toLocaleDateString()}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {reviews.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Reviews</p>
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <Card key={r.id}><CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{r.venue_name ?? "A venue"}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="w-3 h-3 fill-current" /> {r.rating}</span>
                      </div>
                      {r.review_text && <p className="text-sm text-muted-foreground">{r.review_text}</p>}
                    </CardContent></Card>
                  ))}
                </div>
              </div>
            )}

            {venueId && (
              <Button className="w-full" onClick={() => setInviteOpen(true)}>
                <Send className="w-3.5 h-3.5 mr-1.5" /> Invite to offer
              </Button>
            )}
          </>
        )}

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite {profile?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {(liveOffers ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">You don't have a live offer to invite them to yet — create one first.</p>
              ) : (
                <>
                  <Select value={inviteOfferId} onValueChange={setInviteOfferId}>
                    <SelectTrigger><SelectValue placeholder="Choose an offer" /></SelectTrigger>
                    <SelectContent>
                      {(liveOffers ?? []).map((o: any) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Optional personal note" value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} />
                  <Button className="w-full" onClick={sendInvite} disabled={!inviteOfferId || sendingInvite}>
                    {sendingInvite ? "Sending..." : "Send invite"}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default VenueCreatorProfile;
