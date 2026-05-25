import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Sparkles, Send, Trash2 } from "lucide-react";

type Brief = {
  id: string;
  title: string;
  description: string;
  city: string | null;
  niches: string[] | null;
  min_followers: number | null;
  budget: number | null;
  deliverables: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
  image_url: string | null;
  requirements: string | null;
  category: string | null;
};

type Match = {
  id: string;
  influencer_id: string;
  score: number;
  reasoning: string;
  invited: boolean;
  profile?: any;
};

const emptyForm = { title: "", description: "", city: "", category: "", niches: "", min_followers: "", budget: "", deliverables: "", requirements: "", deadline: "", image_url: "" };

const VenueBriefs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [matchesByBrief, setMatchesByBrief] = useState<Record<string, Match[]>>({});
  const [offersByVenue, setOffersByVenue] = useState<any[]>([]);

  const loadAll = async () => {
    if (!user) return;
    const { data: settings } = await supabase.from("platform_settings").select("value").eq("key", "briefs_enabled").maybeSingle();
    setEnabled(settings?.value === true || (settings?.value as any) === "true");
    const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle();
    if (!venue) return;
    setVenueId(venue.id);
    const { data: bs } = await supabase.from("venue_briefs").select("*").eq("venue_id", venue.id).order("created_at", { ascending: false });
    setBriefs((bs as Brief[]) ?? []);
    const { data: offers } = await supabase.from("offers").select("id, title").eq("venue_id", venue.id).eq("is_active", true);
    setOffersByVenue(offers ?? []);
    // load matches for each brief
    if (bs && bs.length) {
      const { data: matches } = await supabase.from("brief_matches").select("*").in("brief_id", bs.map((b: any) => b.id)).order("score", { ascending: false });
      const ids = [...new Set((matches ?? []).map((m: any) => m.influencer_id))];
      const { data: profiles } = ids.length
        ? await supabase.rpc("get_public_profiles_basic", { _user_ids: ids })
        : { data: [] as any[] };
      const grouped: Record<string, Match[]> = {};
      (matches ?? []).forEach((m: any) => {
        const profile = profiles?.find((p: any) => p.user_id === m.influencer_id);
        (grouped[m.brief_id] = grouped[m.brief_id] || []).push({ ...m, profile });
      });
      setMatchesByBrief(grouped);
    }
  };

  useEffect(() => { loadAll(); }, [user]);

  const create = async () => {
    if (!venueId) return;
    if (!form.title.trim() || !form.description.trim()) {
      return toast({ title: "Title and description required", variant: "destructive" });
    }
    setSaving(true);
    const payload: any = {
      venue_id: venueId,
      title: form.title,
      description: form.description,
      city: form.city || null,
      niches: form.niches ? form.niches.split(",").map((s) => s.trim()).filter(Boolean) : [],
      min_followers: form.min_followers ? parseInt(form.min_followers) : 0,
      budget: form.budget ? parseFloat(form.budget) : 0,
      deliverables: form.deliverables || null,
      deadline: form.deadline || null,
    };
    const { error } = await supabase.from("venue_briefs").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Brief posted" });
    setOpen(false);
    setForm(emptyForm);
    loadAll();
  };

  const runMatch = async (briefId: string) => {
    setMatchingId(briefId);
    const { data, error } = await supabase.functions.invoke("match-brief", { body: { brief_id: briefId } });
    setMatchingId(null);
    if (error || data?.error) {
      return toast({ title: "Match failed", description: data?.error ?? error?.message, variant: "destructive" });
    }
    toast({ title: `Found ${data?.matches?.length ?? 0} matches` });
    loadAll();
  };

  const invite = async (brief: Brief, match: Match) => {
    if (!venueId) return;
    const offerId = offersByVenue[0]?.id ?? null;
    const { error } = await supabase.from("invitations").insert({
      venue_id: venueId,
      influencer_id: match.influencer_id,
      offer_id: offerId,
      brief_id: brief.id,
      message: `From brief: ${brief.title}\n\n${brief.description}`,
      status: "pending",
    } as any);
    if (error) return toast({ title: "Invite failed", description: error.message, variant: "destructive" });
    await supabase.from("brief_matches").update({ invited: true }).eq("id", match.id);
    toast({ title: "Invitation sent" });
    loadAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this brief?")) return;
    await supabase.from("venue_briefs").delete().eq("id", id);
    loadAll();
  };

  if (!enabled) {
    return (
      <DashboardLayout type="venue">
        <div className="max-w-2xl mx-auto py-20 text-center">
          <Sparkles className="w-12 h-12 text-gold mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">Briefs are currently disabled</h1>
          <p className="text-muted-foreground">This feature has been turned off by the platform admin.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Venue <span className="text-gold">Briefs</span>
            </h1>
            <p className="text-muted-foreground">Post a brief — our AI finds the best-matching influencers to invite instantly.</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-gold hover:bg-gold/90 text-background">
            <Plus className="w-4 h-4 mr-2" /> New Brief
          </Button>
        </div>

        <div className="space-y-6">
          {briefs.length === 0 && (
            <div className="gradient-card rounded-xl border border-border p-8 text-center text-muted-foreground">
              No briefs yet. Post one to get AI-matched influencers in seconds.
            </div>
          )}
          {briefs.map((b) => {
            const matches = matchesByBrief[b.id] ?? [];
            return (
              <div key={b.id} className="gradient-card rounded-xl border border-border p-5">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-bold text-foreground">{b.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{b.description}</p>
                    <div className="flex gap-2 mt-3 flex-wrap text-xs">
                      {b.city && <Badge variant="secondary">{b.city}</Badge>}
                      {(b.niches ?? []).map((n) => <Badge key={n} variant="secondary">{n}</Badge>)}
                      {b.min_followers ? <Badge variant="secondary">{b.min_followers.toLocaleString()}+ followers</Badge> : null}
                      {b.budget ? <Badge className="bg-gold/20 text-gold border-gold/30">${b.budget}</Badge> : null}
                      <Badge>{b.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => runMatch(b.id)}
                      disabled={matchingId === b.id}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {matchingId === b.id ? "Matching…" : matches.length ? "Re-match" : "Find matches"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>

                {matches.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm font-medium text-foreground mb-3">AI-matched influencers</p>
                    <div className="grid gap-3">
                      {matches.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                          <img src={m.profile?.avatar_url || "/placeholder.svg"} alt="" className="w-10 h-10 rounded-full object-cover" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground truncate">{m.profile?.full_name ?? "Influencer"}</p>
                              <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">Score {m.score}</Badge>
                              {m.profile?.is_verified && <Badge className="text-xs">verified</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.reasoning}</p>
                          </div>
                          <Button size="sm" disabled={m.invited} onClick={() => invite(b, m)} className="bg-gold hover:bg-gold/90 text-background">
                            <Send className="w-3 h-3 mr-1" /> {m.invited ? "Invited" : "Invite"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Post a Brief</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Launch campaign for new rooftop lounge" />
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What you need, the vibe, the audience..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Dubai" />
                </div>
                <div>
                  <Label>Min followers</Label>
                  <Input type="number" value={form.min_followers} onChange={(e) => setForm({ ...form, min_followers: e.target.value })} placeholder="10000" />
                </div>
                <div>
                  <Label>Niches (comma separated)</Label>
                  <Input value={form.niches} onChange={(e) => setForm({ ...form, niches: e.target.value })} placeholder="food, lifestyle" />
                </div>
                <div>
                  <Label>Budget ($)</Label>
                  <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="500" />
                </div>
              </div>
              <div>
                <Label>Deliverables</Label>
                <Textarea rows={2} value={form.deliverables} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} placeholder="1 Reel + 3 Stories" />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={create} disabled={saving} className="bg-gold hover:bg-gold/90 text-background">
                  {saving ? "Posting…" : "Post Brief"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default VenueBriefs;
