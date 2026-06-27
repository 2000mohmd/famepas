import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { EmptyState, ClipboardIllustration } from "@/components/venue/EmptyState";
import { Plus, Clipboard, Star, Film, CheckCircle2, Check, Calendar, ImageIcon, Loader2, ArrowRight, Users, Instagram, Music2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Stage = "draft" | "matching" | "in_progress" | "review" | "complete";

const PINK = "#b8923a";

const VenueBriefs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("draft");
  const [briefs, setBriefs] = useState<any[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [invitedCounts, setInvitedCounts] = useState<Record<string, number>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [matchesFor, setMatchesFor] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const openMatches = async (b: any) => {
    setMatchesFor(b);
    setMatchesLoading(true);
    const { data: rows } = await supabase
      .from("brief_matches").select("*").eq("brief_id", b.id).order("score", { ascending: false });
    const list = rows ?? [];
    if (list.length) {
      const ids = list.map((r: any) => r.influencer_id);
      const { data: profs } = await supabase.rpc("get_public_profiles_basic", { _user_ids: ids });
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      setMatches(list.map((r: any) => ({ ...r, profile: map.get(r.influencer_id) })));
    } else setMatches([]);
    setMatchesLoading(false);
  };

  const approveMatch = async (m: any) => {
    if (!matchesFor) return;
    const { error } = await supabase.from("invitations").insert({
      venue_id: matchesFor.venue_id,
      influencer_id: m.influencer_id,
      brief_id: matchesFor.id,
      status: "pending",
      message: `Approved for brief: ${matchesFor.title}`,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("brief_matches").update({ invited: true }).eq("id", m.id);
    toast({ title: "Invitation sent", description: "Waiting for influencer to accept." });
    setMatchesFor(null);
    load();
  };

  const load = async () => {
    if (!user) return;
    const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (!venue) return;
    const { data } = await supabase.from("venue_briefs").select("*").eq("venue_id", venue.id).order("created_at", { ascending: false });
    const list = data ?? [];
    setBriefs(list);
    if (list.length) {
      const { data: m } = await supabase.from("brief_matches").select("brief_id,invited").in("brief_id", list.map(b => b.id));
      const counts: Record<string, number> = {};
      const invCounts: Record<string, number> = {};
      (m ?? []).forEach((row: any) => {
        counts[row.brief_id] = (counts[row.brief_id] ?? 0) + 1;
        if (row.invited) invCounts[row.brief_id] = (invCounts[row.brief_id] ?? 0) + 1;
      });
      setMatchCounts(counts);
      setInvitedCounts(invCounts);
    }
  };

  useEffect(() => { load(); }, [user]);

  const counts: Record<Stage, number> = {
    draft: briefs.filter(b => (b.pipeline_stage ?? "draft") === "draft").length,
    matching: briefs.filter(b => b.pipeline_stage === "matching").length,
    in_progress: briefs.filter(b => b.pipeline_stage === "in_progress").length,
    review: briefs.filter(b => b.pipeline_stage === "review").length,
    complete: briefs.filter(b => b.pipeline_stage === "complete").length,
  };

  const stages: { key: Stage; label: string; icon: any }[] = [
    { key: "draft", label: "Drafts", icon: Clipboard },
    { key: "matching", label: "Matching", icon: Star },
    { key: "in_progress", label: "In Progress", icon: Film },
    { key: "review", label: "Review", icon: CheckCircle2 },
    { key: "complete", label: "Complete", icon: Check },
  ];

  const filtered = briefs.filter(b => (b.pipeline_stage ?? "draft") === stage);

  const setLive = async (b: any) => {
    setWorking(b.id);
    const { error } = await supabase.from("venue_briefs").update({ pipeline_stage: "matching", is_active: true, status: "open" }).eq("id", b.id);
    if (error) { setWorking(null); toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    // Kick off matching (best-effort)
    try { await supabase.functions.invoke("match-brief", { body: { brief_id: b.id } }); } catch {}
    setWorking(null);
    toast({ title: "Brief is live", description: "We're matching influencers now." });
    load();
  };

  const advance = async (b: any, next: Stage, msg: string) => {
    setWorking(b.id);
    const { error } = await supabase.from("venue_briefs").update({ pipeline_stage: next }).eq("id", b.id);
    setWorking(null);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: msg });
    load();
  };

  const stageActions = (b: any) => {
    const id = b.id;
    const busy = working === id;
    switch (b.pipeline_stage ?? "draft") {
      case "draft":
        return <>
          <Button size="sm" variant="outline" onClick={() => navigate(`/venue/briefs/${id}/edit`)}>Edit</Button>
          <Button size="sm" disabled={busy} onClick={() => setLive(b)} className="bg-green-600 hover:bg-green-700 text-white">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "▶ Set Live"}
          </Button>
        </>;
      case "matching":
        return <>
          <span className="text-xs text-muted-foreground">{matchCounts[b.id] ?? 0} matches</span>
          <Button size="sm" variant="outline" onClick={() => openMatches(b)}>
            <Users className="w-3.5 h-3.5 mr-1" /> View Matches
          </Button>
        </>;
      case "in_progress":
        return <Button size="sm" disabled={busy} onClick={() => advance(b, "review", "Sent to Review")} style={{ background: PINK }} className="text-white hover:opacity-90">
          Send to Review <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>;
      case "review":
        return <Button size="sm" disabled={busy} onClick={() => advance(b, "complete", "Marked Complete")} className="bg-green-600 hover:bg-green-700 text-white">
          <Check className="w-3.5 h-3.5 mr-1" /> Mark Complete
        </Button>;
      case "complete":
        return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><Check className="w-3.5 h-3.5" /> Completed</span>;
    }
  };

  const stageBadge = (s: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      draft: { bg: "#f1f5f9", color: "#475569", label: "Draft" },
      matching: { bg: "#fef3c7", color: "#92400e", label: "Matching" },
      in_progress: { bg: "#dbeafe", color: "#1e40af", label: "In Progress" },
      review: { bg: "#fce7f3", color: "#9d174d", label: "In Review" },
      complete: { bg: "#dcfce7", color: "#166534", label: "Complete" },
    };
    const s2 = map[s] ?? map.draft;
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s2.bg, color: s2.color }}>{s2.label}</span>;
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-[28px] font-bold text-foreground">Briefs</h1>
            <a href="#" className="text-sm font-medium" style={{ color: PINK }}>How does it work?</a>
          </div>
          <Button onClick={() => navigate("/venue/briefs/new")} style={{ background: PINK }} className="text-white hover:opacity-90">
            <Plus className="w-4 h-4 mr-1.5" /> New Brief
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-8">
          {stages.map(s => {
            const Icon = s.icon;
            const isActive = stage === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStage(s.key)}
                className={`bg-white border rounded-xl p-4 text-left transition-all ${isActive ? "border-2" : "border-border hover:border-[hsl(42_65%_50%_/_0.30)]"}`}
                style={isActive ? { borderColor: PINK } : undefined}
              >
                <Icon className="w-5 h-5 mb-2" style={{ color: isActive ? PINK : "#94a3b8" }} />
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{counts[s.key]} items</p>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardIllustration />}
            title="Start here or pick up where you left off"
            description="Create your first brief or jump back into your drafts"
            action={<Button onClick={() => navigate("/venue/briefs/new")} style={{ background: PINK }} className="text-white hover:opacity-90"><Plus className="w-4 h-4 mr-1.5" /> Create a brief</Button>}
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map(b => {
              const cover = b.cover_image_url || b.image_url;
              const spec = Array.isArray(b.deliverables_spec) ? b.deliverables_spec : [];
              const totalQty = spec.reduce((s: number, d: any) => s + (Number(d.quantity) || 0), 0);
              return (
                <div key={b.id} className="bg-white border border-border rounded-2xl overflow-hidden flex hover:shadow-md transition-shadow">
                  <div className="w-40 h-32 bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {cover ? <img src={cover} alt={b.title} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">{b.title}</h3>
                          {stageBadge(b.pipeline_stage ?? "draft")}
                          {b.pipeline_stage === "matching" && (invitedCounts[b.id] ?? 0) > 0 && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#92400e" }}>
                              {invitedCounts[b.id]} pending acceptance
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{b.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                      {b.deadline && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Due {new Date(b.deadline).toLocaleDateString()}</span>}
                      {spec.length > 0 && <span className="inline-flex items-center gap-1"><Film className="w-3 h-3" /> {totalQty} deliverable{totalQty !== 1 ? "s" : ""}</span>}
                      {b.budget != null && <span>${b.budget}</span>}
                    </div>
                    <div className="mt-auto pt-3 flex items-center justify-end gap-2">
                      {stageActions(b)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!matchesFor} onOpenChange={(o) => !o && setMatchesFor(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Matched Influencers — {matchesFor?.title}</DialogTitle>
          </DialogHeader>
          {matchesLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : matches.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No matches yet. The AI is still ranking influencers — check back in a moment.</p>
          ) : (
            <div className="space-y-2">
              {matches.map(m => {
                const p = m.profile || {};
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={p.avatar_url} />
                      <AvatarFallback>{(p.full_name ?? "?").slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{p.full_name ?? "Influencer"}</p>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: PINK }}>{m.score}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{m.reasoning}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                        {p.instagram_handle && <span className="inline-flex items-center gap-0.5"><Instagram className="w-3 h-3" />@{p.instagram_handle}</span>}
                        {p.tiktok_handle && <span className="inline-flex items-center gap-0.5"><Music2 className="w-3 h-3" />@{p.tiktok_handle}</span>}
                        {p.city && <span>{p.city}</span>}
                      </div>
                    </div>
                    {m.invited ? (
                      <span className="text-xs font-medium text-green-700 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Approved</span>
                    ) : (
                      <Button size="sm" onClick={() => approveMatch(m)} style={{ background: PINK }} className="text-white hover:opacity-90">Approve</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default VenueBriefs;
