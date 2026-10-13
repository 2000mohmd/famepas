import DashboardLayout from "@/components/DashboardLayout";
import CreatorPhoto from "@/components/CreatorPhoto";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Film, ExternalLink, Download, Check, X, Heart, MessageCircle, Eye, Link2, Star, Flag, BarChart3, Plus } from "lucide-react";
import { VenueHero, VenueTabs, VenueEmpty, BrandButton } from "@/components/venue/VenueUI";
import CreatorInsightsPanel from "@/components/CreatorInsightsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { notifyEmail } from "@/lib/notify";

type Tab = "all" | "submitted" | "approved" | "rejected";

const VenueContent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("submitted");
  const [items, setItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [rejectFor, setRejectFor] = useState<any | null>(null);
  const [feedback, setFeedback] = useState("");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [disputeFor, setDisputeFor] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [statsFor, setStatsFor] = useState<{ id: string; name?: string } | null>(null);

  const submitDispute = async () => {
    if (!disputeFor) return;
    const { error } = await supabase.from("deliverables").update({
      disputed: true,
      dispute_reason: disputeReason || null,
      disputed_at: new Date().toISOString(),
      disputed_by: user?.id ?? null,
    } as any).eq("id", disputeFor.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Flagged for review", description: "Our team will look into this delivery." });
    setDisputeFor(null); setDisputeReason(""); load();
  };

  const rateQuality = async (d: any, rating: number) => {
    const { error } = await supabase
      .from("deliverables")
      .update({
        content_quality_rating: rating,
        content_rated_at: new Date().toISOString(),
        content_rated_by: user?.id ?? null,
      } as any)
      .eq("id", d.id);
    if (error) {
      toast({ title: "Could not save rating", description: error.message, variant: "destructive" });
      return;
    }
    setItems(prev => prev.map(x => (x.id === d.id ? { ...x, content_quality_rating: rating } : x)));
    toast({ title: `Rated ${rating}/5` });
  };

  const refreshMetrics = async (deliverableId: string, url?: string | null) => {
    if (!url || (!url.includes("instagram.com") && !url.includes("tiktok.com"))) {
      toast({ title: "No Instagram/TikTok post URL on this deliverable", variant: "destructive" });
      return;
    }
    setRefreshingId(deliverableId);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-post-metrics", {
        body: { deliverable_id: deliverableId, post_url: url },
      });
      if (error) throw error;
      if (data && data.success === false) {
        toast({
          title: "Metrics unavailable",
          description: data.code === "MISSING_API_KEY"
            ? "The metrics provider isn't configured yet."
            : data.code === "PROVIDER_RATE_LIMITED"
            ? "Provider rate limit reached. Try again in a minute."
            : data.error || "Couldn't fetch stats right now.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Stats updated successfully" });
      }
      load();
    } catch (err: any) {
      toast({ title: "Failed to fetch stats", description: err.message, variant: "destructive" });
    } finally {
      setRefreshingId(null);
    }
  };

  const savePostUrl = async (deliverableId: string, url: string) => {
    const clean = url.trim();
    const { error } = await supabase.from("deliverables").update({ post_url: clean || null }).eq("id", deliverableId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Post URL saved" });
    load();
  };

  const load = async () => {
    // Guards against the exact "stuck on Loading…" bug: if this runs before
    // auth resolves, bailing out here must still clear the spinner —
    // otherwise an empty page is stuck loading forever.
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data: venues } = await supabase.from("venues").select("id").eq("owner_id", user.id);
    const venueIds = (venues ?? []).map((v: any) => v.id);
    if (!venueIds.length) { setLoading(false); return; }
    const { data: bks } = await supabase.from("bookings").select("id,influencer_id,venue_id").in("venue_id", venueIds);
    const bookingIds = (bks ?? []).map((b: any) => b.id);
    if (!bookingIds.length) { setItems([]); setLoading(false); return; }
    const { data: ds } = await supabase.from("deliverables").select("*").in("booking_id", bookingIds)
      .order("submitted_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    setItems(ds ?? []);
    const ids = [...new Set((ds ?? []).map((d: any) => d.influencer_id))];
    if (ids.length) {
      const { data: profs } = await supabase.rpc("get_public_profiles_basic", { _user_ids: ids });
      const map: any = {}; (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = items.filter(d =>
    tab === "all" ? true :
    tab === "submitted" ? d.status === "submitted" || d.status === "pending" :
    d.status === tab);

  const approve = async (d: any) => {
    const { error } = await supabase.from("deliverables").update({
      status: "approved", reviewed_at: new Date().toISOString(), feedback: null,
    }).eq("id", d.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Approved", description: "Content marked as approved." });
    notifyEmail({ event: "content_approved", deliverable_id: d.id });
    load();
  };

  const reject = async () => {
    if (!rejectFor) return;
    const { error } = await supabase.from("deliverables").update({
      status: "rejected", reviewed_at: new Date().toISOString(), feedback,
    }).eq("id", rejectFor.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Changes requested", description: "Influencer has been notified." });
    notifyEmail({ event: "content_rejected", deliverable_id: rejectFor.id, feedback });
    setRejectFor(null); setFeedback(""); load();
  };

  const counts = {
    all: items.length,
    submitted: items.filter(d => d.status === "submitted" || d.status === "pending").length,
    approved: items.filter(d => d.status === "approved").length,
    rejected: items.filter(d => d.status === "rejected").length,
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in space-y-8">
        <VenueHero
          eyebrow="Creator content"
          title="Content"
          subtitle="Every post creators publish from your offers lands here. Approve it, request changes, and keep the best for your own channels."
          aside={
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Pending review", value: counts.submitted },
                { label: "Approved", value: counts.approved },
                { label: "Changes requested", value: counts.rejected },
                { label: "Total posts", value: counts.all },
              ].map((x) => (
                <div key={x.label} className="rounded-2xl px-5 py-4" style={{ background: "hsl(var(--venue-brand-foreground) / .07)", border: "1px solid hsl(var(--venue-brand-foreground) / .12)" }}>
                  <p className="text-3xl font-extrabold leading-none">{x.value}</p>
                  <p className="text-xs mt-2 opacity-70">{x.label}</p>
                </div>
              ))}
            </div>
          }
        />

        <VenueTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "submitted", label: "Pending review", count: counts.submitted },
            { key: "approved", label: "Approved", count: counts.approved },
            { key: "rejected", label: "Changes requested", count: counts.rejected },
            { key: "all", label: "All", count: counts.all },
          ]}
        />

        {loading ? (
          <div className="rounded-[2rem] bg-card border border-border py-24 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <VenueEmpty
            icon={Film}
            title={tab === "submitted" ? "Nothing waiting for review" : "No content here yet"}
            body="Creators submit their posts after visiting your venue. You'll be able to approve them, download the media and see their reach."
            actions={<BrandButton to="/venue/campaigns/new"><Plus /> Create an offer</BrandButton>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
            {filtered.map(d => {
              const p = profiles[d.influencer_id];
              return (
                <div key={d.id} className="rounded-3xl bg-card border border-border p-3 flex flex-col shadow-[var(--venue-shadow)]">
                  <div className="aspect-[4/5] rounded-2xl bg-muted relative overflow-hidden">
                    {(d.thumbnail_url || d.media_url) ? (
                      <img src={d.thumbnail_url || d.media_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Film className="w-10 h-10" /></div>
                    )}
                    <span className="absolute top-3 left-3 text-[11px] font-bold px-3 py-1 rounded-full bg-black/45 backdrop-blur text-white uppercase tracking-wide">{d.platform || "—"} · {d.content_type}</span>
                    <span className={`absolute top-3 right-3 text-[11px] px-3 py-1 rounded-full font-bold capitalize ${
                      d.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                      d.status === "rejected" ? "bg-red-50 text-red-700" :
                      "bg-amber-50 text-amber-800"}`}>{d.status === "rejected" ? "changes requested" : d.status}</span>
                  </div>
                  <div className="px-2 pt-4 pb-2 flex-1 flex flex-col">
                    <button
                      type="button"
                      onClick={() => setStatsFor({ id: d.influencer_id, name: p?.full_name })}
                      className="flex items-center gap-2 mb-2 text-left hover:opacity-80"
                    >
                      <CreatorPhoto src={p?.avatar_url} name={p?.full_name} className="w-9 h-9 rounded-full object-cover text-xs" />
                      <span className="text-base font-extrabold text-foreground underline-offset-2 hover:underline">{p?.full_name || "Influencer"}</span>
                      <BarChart3 className="w-3 h-3 text-muted-foreground" />
                    </button>
                    {d.caption && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{d.caption}</p>}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{d.views || 0}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3"/>{d.likes || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3"/>{d.comments || 0}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => refreshMetrics(d.id, d.post_url || d.content_url)}
                        disabled={refreshingId === d.id || !(d.post_url || d.content_url)}
                      >
                        {refreshingId === d.id ? "Refreshing…" : "Refresh stats"}
                      </Button>
                    </div>
                    <div className="mb-3">
                      <label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                        <Link2 className="w-3 h-3" /> Published post URL
                      </label>
                      <Input
                        defaultValue={d.post_url || ""}
                        placeholder="https://instagram.com/p/... or https://tiktok.com/..."
                        onBlur={(e) => {
                          if ((e.target.value || "").trim() !== (d.post_url || "")) {
                            savePostUrl(d.id, e.target.value);
                          }
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2">
                      {d.content_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={d.content_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3 mr-1"/>Open</a>
                        </Button>
                      )}
                      {d.media_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={d.media_url} target="_blank" rel="noreferrer" download><Download className="w-3 h-3 mr-1"/>Download</a>
                        </Button>
                      )}
                      {(d.status === "submitted" || d.status === "pending") && (
                        <>
                          <Button size="sm" onClick={() => approve(d)}><Check className="w-3 h-3 mr-1"/>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectFor(d); setFeedback(""); }}><X className="w-3 h-3 mr-1"/>Request changes</Button>
                        </>
                      )}
                      {d.disputed ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 inline-flex items-center gap-1">
                          <Flag className="w-3 h-3" /> Flagged for review
                        </span>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setDisputeFor(d); setDisputeReason(""); }}>
                          <Flag className="w-3 h-3 mr-1" />Flag issue
                        </Button>
                      )}
                    </div>
                    {d.status === "approved" && (
                      <div className="mt-3 border-t border-border pt-2">
                        <p className="text-[11px] text-muted-foreground mb-1">Content quality</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => rateQuality(d, n)}
                              className="p-0.5"
                              aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                            >
                              <Star className={`w-4 h-4 ${n <= (d.content_quality_rating ?? 0) ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                            </button>
                          ))}
                          {d.content_quality_rating ? (
                            <span className="ml-2 text-[11px] text-muted-foreground">{d.content_quality_rating}/5</span>
                          ) : (
                            <span className="ml-2 text-[11px] text-muted-foreground">Not rated</span>
                          )}
                        </div>
                      </div>
                    )}
                    {d.feedback && d.status === "rejected" && (
                      <p className="mt-3 text-xs text-red-600 border-t border-border pt-2">Feedback: {d.feedback}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Request changes</DialogTitle></DialogHeader>
            <Textarea placeholder="What needs to change?" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
              <Button onClick={reject} disabled={!feedback.trim()}>Send feedback</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!disputeFor} onOpenChange={(o) => !o && setDisputeFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Flag this delivery</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tell us what wasn't delivered as promised. Our team reviews flagged deliveries.
            </p>
            <Textarea placeholder="Describe the issue…" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} rows={5} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDisputeFor(null)}>Cancel</Button>
              <Button variant="destructive" onClick={submitDispute} disabled={!disputeReason.trim()}>Flag for review</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!statsFor} onOpenChange={(o) => !o && setStatsFor(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{statsFor?.name || "Creator"} — audience & performance</DialogTitle></DialogHeader>
            {statsFor && <CreatorInsightsPanel influencerId={statsFor.id} />}
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
};

export default VenueContent;
