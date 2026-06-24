import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Film, ExternalLink, Download, Check, X, Heart, MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [postUrlInputs, setPostUrlInputs] = useState<Record<string, string>>({});
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const refreshMetrics = async (deliverableId: string) => {
    const url = postUrlInputs[deliverableId] || "";
    if (!url.includes("instagram.com") && !url.includes("tiktok.com")) {
      toast({ title: "Please enter a valid Instagram or TikTok post URL", variant: "destructive" });
      return;
    }
    setRefreshingId(deliverableId);
    try {
      const { error } = await supabase.functions.invoke("fetch-post-metrics", {
        body: { deliverable_id: deliverableId, post_url: url },
      });
      if (error) throw error;
      toast({ title: "Stats updated successfully" });
      load();
    } catch (err: any) {
      toast({ title: "Failed to fetch stats", description: err.message, variant: "destructive" });
    } finally {
      setRefreshingId(null);
    }
  };

  const load = async () => {
    if (!user) return;
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
    load();
  };

  const reject = async () => {
    if (!rejectFor) return;
    const { error } = await supabase.from("deliverables").update({
      status: "rejected", reviewed_at: new Date().toISOString(), feedback,
    }).eq("id", rejectFor.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Changes requested", description: "Influencer has been notified." });
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
      <div className="animate-fade-in">
        <h1 className="text-[28px] font-bold text-foreground mb-2">Content</h1>
        <p className="text-sm text-muted-foreground mb-6">Posts submitted by influencers from your campaigns and bookings.</p>

        <div className="flex gap-1 border-b border-border mb-6">
          {(["submitted","approved","rejected","all"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${tab===t?"border-foreground text-foreground":"border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t === "submitted" ? "Pending review" : t} ({counts[t]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white border border-border rounded-2xl py-24 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl py-20 text-center">
            <Film className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No content here yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Influencers submit posts after completing their booking.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(d => {
              const p = profiles[d.influencer_id];
              return (
                <div key={d.id} className="bg-white border border-border rounded-2xl overflow-hidden flex flex-col">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {(d.thumbnail_url || d.media_url) ? (
                      <img src={d.thumbnail_url || d.media_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Film className="w-10 h-10" /></div>
                    )}
                    <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/70 text-white uppercase">{d.platform || "—"} · {d.content_type}</span>
                    <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      d.status === "approved" ? "bg-green-100 text-green-700" :
                      d.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"}`}>{d.status}</span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      {p?.avatar_url ? <img src={p.avatar_url} className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-muted" />}
                      <span className="text-sm font-medium">{p?.full_name || "Influencer"}</span>
                    </div>
                    {d.caption && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{d.caption}</p>}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{d.views || 0}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3"/>{d.likes || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3"/>{d.comments || 0}</span>
                      </div>
                      {(d.post_url || d.content_url) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => refreshMetrics(d.id, d.post_url || d.content_url)}
                          disabled={refreshingId === d.id}
                        >
                          {refreshingId === d.id ? "Refreshing…" : "Refresh stats"}
                        </Button>
                      )}
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
                    </div>
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
      </div>
    </DashboardLayout>
  );
};

export default VenueContent;
