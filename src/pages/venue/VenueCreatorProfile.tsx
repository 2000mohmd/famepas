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
import { ChevronLeft, Instagram, Music2, Star, Users, Briefcase, Send, BadgeCheck, MapPin, Sparkles } from "lucide-react";
import CreatorPhoto from "@/components/CreatorPhoto";
import { VenuePanel, VenueEmpty } from "@/components/venue/VenueUI";

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
      <div className="animate-fade-in space-y-6">
        <button type="button" onClick={() => navigate("/venue/discover")} className="inline-flex items-center gap-1.5 h-10 pl-3 pr-5 rounded-full bg-card border border-border text-sm font-semibold text-foreground hover:border-primary transition">
          <ChevronLeft className="w-4 h-4" /> Back to Discover
        </button>

        {loading ? (
          <div className="rounded-[2rem] bg-card border border-border py-24 text-center text-muted-foreground">Loading…</div>
        ) : !profile ? (
          <div className="rounded-[2rem] bg-card border border-border py-24 text-center text-muted-foreground">Creator not found.</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
            {/* Identity card */}
            <aside className="rounded-[2rem] bg-card border border-border p-3 shadow-[var(--venue-shadow)] xl:sticky xl:top-24">
              <div className="relative rounded-[1.6rem] overflow-hidden aspect-[4/5] bg-muted">
                <CreatorPhoto src={profile.avatar_url} name={profile.full_name} className="w-full h-full object-cover text-6xl" style={{ objectPosition: "center 25%" }} />
                {profile.is_verified && (
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>
              <div className="px-3 pt-5 pb-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{profile.full_name}</h1>
                <p className="mt-1 text-muted-foreground flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {[profile.city, profile.country].filter(Boolean).join(", ") || "Location not added"}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {profile.instagram_handle && <a href={`https://instagram.com/${profile.instagram_handle}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-muted text-sm font-semibold text-foreground hover:bg-secondary"><Instagram className="w-4 h-4" /> @{profile.instagram_handle}</a>}
                  {profile.tiktok_handle && <a href={`https://tiktok.com/@${profile.tiktok_handle}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-muted text-sm font-semibold text-foreground hover:bg-secondary"><Music2 className="w-4 h-4" /> @{profile.tiktok_handle}</a>}
                </div>
                {venueId && (
                  <button type="button" onClick={() => setInviteOpen(true)} className="mt-6 w-full inline-flex items-center justify-center gap-2 h-14 rounded-full font-bold transition hover:opacity-90"
                    style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
                    <Send className="w-4 h-4" /> Invite to an offer
                  </button>
                )}
              </div>
            </aside>

            <div className="space-y-6 min-w-0">
              <section className="rounded-[2rem] p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
                {[
                  { icon: Users, label: "Followers", value: maxFollowers.toLocaleString() },
                  { icon: Briefcase, label: "Collabs", value: profile.collab_count },
                  { icon: Star, label: `${profile.review_count} review${profile.review_count === 1 ? "" : "s"}`, value: profile.avg_rating != null ? profile.avg_rating : "—" },
                  { icon: MapPin, label: "Venues worked with", value: venues.length },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-3xl p-5" style={{ background: "hsl(var(--venue-brand-foreground) / .07)", border: "1px solid hsl(var(--venue-brand-foreground) / .12)" }}>
                    <Icon className="w-5 h-5 mb-5" style={{ color: "hsl(var(--primary))" }} />
                    <p className="text-3xl md:text-4xl font-extrabold leading-none">{value}</p>
                    <p className="text-xs mt-2 opacity-70">{label}</p>
                  </div>
                ))}
              </section>

              {(profile.bio || (profile.niche && profile.niche.length > 0)) && (
                <VenuePanel title="About">
                  {profile.bio && <p className="text-foreground/80 leading-relaxed">{profile.bio}</p>}
                  {profile.niche && profile.niche.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-5">
                      {profile.niche.map((n) => (
                        <span key={n} className="px-4 py-1.5 rounded-full text-sm font-semibold" style={{ background: "hsl(var(--primary) / .18)", color: "hsl(var(--venue-brand))" }}>{n}</span>
                      ))}
                    </div>
                  )}
                </VenuePanel>
              )}

              {venues.length > 0 && (
                <VenuePanel title="Venues worked with">
                  <div className="flex flex-wrap gap-3">
                    {venues.map((v) => (
                      <div key={v.venue_id} className="flex items-center gap-3 rounded-full bg-muted pl-1.5 pr-5 py-1.5">
                        {v.logo_url ? <img src={v.logo_url} alt="" className="w-9 h-9 rounded-full object-cover bg-white" /> : <span className="w-9 h-9 rounded-full bg-card" />}
                        <span className="text-sm font-semibold text-foreground">{v.venue_name}</span>
                      </div>
                    ))}
                  </div>
                </VenuePanel>
              )}

              {work.length > 0 && (
                <VenuePanel title="Recent work">
                  <div className="divide-y divide-border">
                    {work.map((w, i) => (
                      <a key={i} href={w.post_url} target="_blank" rel="noreferrer" className="flex items-center justify-between py-4 group">
                        <span className="font-semibold text-foreground group-hover:underline">{w.venue_name}</span>
                        <span className="text-sm text-muted-foreground">{new Date(w.posted_at).toLocaleDateString()}</span>
                      </a>
                    ))}
                  </div>
                </VenuePanel>
              )}

              {reviews.length > 0 && (
                <VenuePanel title="What venues say">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="rounded-3xl bg-muted/60 p-5">
                        <div className="flex items-center gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-current" : "opacity-25"}`} style={{ color: "hsl(var(--primary))" }} />)}
                        </div>
                        {r.review_text && <p className="text-foreground/80 leading-relaxed">"{r.review_text}"</p>}
                        <p className="text-sm font-bold text-foreground mt-3">{r.venue_name ?? "A venue"}</p>
                      </div>
                    ))}
                  </div>
                </VenuePanel>
              )}

              {!profile.bio && venues.length === 0 && work.length === 0 && reviews.length === 0 && (
                <VenueEmpty compact icon={Sparkles} title="New on FamePass" body="This creator hasn't completed a collab yet — invite them to be among the first venues they work with." />
              )}
            </div>
          </div>
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
