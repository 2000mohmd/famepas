import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle } from "lucide-react";

const db = supabase as any;

const STAGES = [
  { key: "sourced", label: "Sourced" },
  { key: "contacted", label: "Contacted" },
  { key: "applied", label: "Applied" },
  { key: "approved", label: "Approved" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "removed", label: "Removed" },
  { key: "lost", label: "Lost" },
  { key: "rejected", label: "Rejected" },
];
const SOURCES = ["outreach", "referral", "inbound", "event", "other"];

interface PipelineRow {
  kind: "creator" | "prospect";
  id: string;
  user_id: string | null;
  full_name: string | null;
  instagram_handle: string | null;
  followers: number | null;
  area: string | null;
  source: string;
  owner_id: string | null;
  stage: string;
  applied_at: string | null;
  last_visit_at: string | null;
  last_post_at: string | null;
  verified_posts: number;
  delivered_posts: number;
  visits: number;
  on_time_posts: number;
  no_shows: number;
  strikes: number;
  is_suspended: boolean;
  suspended_until: string | null;
  next_action: string | null;
  next_action_date: string | null;
  approved_at: string | null;
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const DAY = 86400000;

const AdminCreatorOps = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [reds, setReds] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [targets, setTargets] = useState({ weekly_approved: 10, active_creators: 100 });
  const [stage, setStage] = useState("applied");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", instagram_handle: "", followers: "", niche: "", area: "", source: "outreach", next_action: "", next_action_date: "" });

  const load = async () => {
    const results = await Promise.all([
      db.from("creator_pipeline").select("*"),
      db.from("offer_redemptions").select("delivery_stage, post_due_at, checked_in_at"),
      supabase.from("deliverables").select("views, likes, comments, status"),
      db.from("venue_activation").select("venue_id, approval_status"),
      supabase.from("venues").select("id, city"),
      supabase.from("platform_settings").select("value").eq("key", "creator_targets").maybeSingle(),
    ]);
    const failed = results.find((r: any) => r.error);
    setLoadError(failed ? (failed as any).error.message : null);
    const [p, r, d, act, v, t] = results as any[];
    setRows(p.data ?? []);
    setReds(r.data ?? []);
    setPosts(d.data ?? []);
    const approvedIds = new Set((act.data ?? []).filter((a: any) => a.approval_status === "approved").map((a: any) => a.venue_id));
    setVenues((v.data ?? []).filter((x: any) => approvedIds.has(x.id)));
    if (t.data?.value) setTargets(t.data.value);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const m = useMemo(() => {
    const creators = rows.filter((r) => r.kind === "creator");
    const sum = (k: keyof PipelineRow) => creators.reduce((a, r) => a + Number(r[k] ?? 0), 0);
    const visits = sum("visits"), verified = sum("verified_posts"), delivered = sum("delivered_posts");
    const onTime = sum("on_time_posts"), noShows = sum("no_shows");
    const now = Date.now();
    const dueSoon = reds.filter((r) => r.delivery_stage === "visited" && r.post_due_at
      && new Date(r.post_due_at).getTime() < now + DAY).length;
    const approvedThisWeek = creators.filter((r) => r.approved_at && new Date(r.approved_at).getTime() > now - 7 * DAY).length;
    const active = creators.filter((r) => r.stage === "active").length;
    const published = posts.filter((p) => p.views || p.likes || p.comments);
    const avgViews = published.length ? Math.round(published.reduce((a, p) => a + (p.views ?? 0), 0) / published.length) : null;
    const avgEng = published.length
      ? Math.round(published.reduce((a, p) => a + (p.likes ?? 0) + (p.comments ?? 0), 0) / published.length) : null;

    const waiting48 = creators.filter((r) => r.stage === "applied" && r.applied_at
      && new Date(r.applied_at).getTime() < now - 2 * DAY)
      .sort((a, b) => (a.applied_at ?? "").localeCompare(b.applied_at ?? ""));
    const quiet = creators.filter((r) => ["approved", "active", "inactive"].includes(r.stage)
      && (!r.last_visit_at || new Date(r.last_visit_at).getTime() < now - 30 * DAY)
      && (!r.approved_at || new Date(r.approved_at).getTime() < now - 30 * DAY));

    // Where supply is thin: approved venues per city against creators who can serve them.
    const byArea: Record<string, { venues: number; creators: number }> = {};
    for (const v of venues) { const k = v.city || "Unknown"; (byArea[k] ??= { venues: 0, creators: 0 }).venues++; }
    for (const c of creators.filter((r) => ["approved", "active", "inactive"].includes(r.stage))) {
      const k = c.area || "Unknown"; (byArea[k] ??= { venues: 0, creators: 0 }).creators++;
    }

    return {
      postRate: pct(verified, visits), onTimeRate: pct(onTime, delivered), noShowRate: pct(noShows, visits + noShows),
      dueSoon, approvedThisWeek, active, avgViews, avgEng, waiting48, quiet,
      areas: Object.entries(byArea).sort((a, b) => b[1].venues - a[1].venues),
      leaderboard: creators.filter((r) => r.delivered_posts > 0)
        .sort((a, b) => b.verified_posts - a.verified_posts || b.on_time_posts - a.on_time_posts).slice(0, 10),
      strikeList: creators.filter((r) => r.strikes > 0).sort((a, b) => b.strikes - a.strikes),
    };
  }, [rows, reds, posts, venues]);

  const counts = useMemo(() => Object.fromEntries(STAGES.map((s) => [s.key, rows.filter((r) => r.stage === s.key).length])), [rows]);
  const list = rows.filter((r) => r.stage === stage);

  const addProspect = async () => {
    if (!form.full_name.trim()) { toast({ title: "Add a name", variant: "destructive" }); return; }
    const { error } = await db.from("creator_prospects").insert({
      full_name: form.full_name.trim(),
      instagram_handle: form.instagram_handle.trim().replace(/^@/, "") || null,
      followers: form.followers ? Number(form.followers) : null,
      niche: form.niche || null, area: form.area || null, source: form.source,
      next_action: form.next_action || null, next_action_date: form.next_action_date || null,
      owner_id: user?.id,
    });
    if (error) { toast({ title: "Couldn't add", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Prospect added" });
    setAddOpen(false);
    setForm({ full_name: "", instagram_handle: "", followers: "", niche: "", area: "", source: "outreach", next_action: "", next_action_date: "" });
    void load();
  };

  const moveProspect = async (id: string, next: string) => {
    const patch: Record<string, unknown> = { stage: next };
    if (next === "lost") {
      const reason = window.prompt("Why was this prospect lost?");
      if (!reason) return;
      patch.lost_reason = reason;
    }
    const { error } = await db.from("creator_prospects").update(patch).eq("id", id);
    if (error) toast({ title: "Couldn't move", description: error.message, variant: "destructive" });
    else void load();
  };

  const saveTargets = async () => {
    const { error } = await supabase.from("platform_settings").update({ value: targets as any }).eq("key", "creator_targets");
    toast(error ? { title: "Couldn't save", description: error.message, variant: "destructive" } : { title: "Targets saved" });
  };

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="gradient-card rounded-xl border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  const Card = ({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) => (
    <div className="gradient-card rounded-xl border border-border p-5">
      <h2 className="font-display text-lg font-bold text-foreground mb-1">{title}</h2>
      {note && <p className="text-xs text-muted-foreground mb-3">{note}</p>}
      {children}
    </div>
  );

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Creator <span className="text-gold">operations</span></h1>
            <p className="text-muted-foreground text-sm">Whether creators deliver — the half of the business that keeps venues renewing.</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gradient-gold text-accent-foreground font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> Add prospect
          </Button>
        </div>

        {loadError && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Some numbers couldn't load, so they may read as zero: {loadError}
          </div>
        )}

        {loading ? <p className="text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <Stat label="Post rate" value={m.postRate} sub="Verified posts ÷ visits" />
              <Stat label="On-time rate" value={m.onTimeRate} sub="Posted before the deadline" />
              <Stat label="No-show rate" value={m.noShowRate} />
              <Stat label="Posts due in 24h" value={m.dueSoon} sub="Today's workload" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <Stat label="Approved this week" value={m.approvedThisWeek} sub={`Target ${targets.weekly_approved}`} />
              <Stat label="Active creators" value={m.active} sub={`Posted in 30 days · target ${targets.active_creators}`} />
              <Stat label="Avg views per post" value={m.avgViews ?? "—"} />
              <Stat label="Avg engagement per post" value={m.avgEng ?? "—"} sub="Likes + comments" />
            </div>

            {(m.waiting48.length > 0 || m.quiet.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {m.waiting48.length > 0 && (
                  <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
                    <p className="font-semibold text-foreground mb-2">
                      <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5 text-gold" />
                      {m.waiting48.length} application{m.waiting48.length === 1 ? "" : "s"} waiting over 48 hours
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">Oldest first. Approve or reject them in Influencers.</p>
                    <div className="text-sm space-y-0.5 max-h-40 overflow-y-auto">
                      {m.waiting48.slice(0, 15).map((r) => (
                        <p key={r.id} className="text-foreground">
                          {r.full_name || "Unnamed"} <span className="text-muted-foreground">
                            — {Math.floor((Date.now() - new Date(r.applied_at!).getTime()) / DAY)} days
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {m.quiet.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="font-semibold text-foreground mb-2">
                      {m.quiet.length} approved creator{m.quiet.length === 1 ? "" : "s"} with no visit in 30 days
                    </p>
                    <div className="text-sm space-y-0.5 max-h-40 overflow-y-auto">
                      {m.quiet.slice(0, 15).map((r) => (
                        <p key={r.id} className="text-foreground">{r.full_name || "Unnamed"}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mb-3">
              {STAGES.map((s) => (
                <button key={s.key} onClick={() => setStage(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${stage === s.key ? "bg-gold/15 border-gold/40 text-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}>
                  {s.label} <span className="text-xs opacity-70">{counts[s.key] ?? 0}</span>
                </button>
              ))}
            </div>

            <div className="gradient-card rounded-xl border border-border overflow-hidden mb-6">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="p-3 font-medium">Name</th>
                      <th className="p-3 font-medium">Instagram</th>
                      <th className="p-3 font-medium">Followers</th>
                      <th className="p-3 font-medium">Area</th>
                      <th className="p-3 font-medium">Source</th>
                      <th className="p-3 font-medium">Posts</th>
                      <th className="p-3 font-medium">Strikes</th>
                      <th className="p-3 font-medium">Next</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nobody at this stage.</td></tr>
                    ) : list.slice(0, 200).map((r) => (
                      <tr key={`${r.kind}-${r.id}`} className="border-b border-border/50">
                        <td className="p-3 text-foreground">
                          {r.full_name || "Unnamed"}
                          {r.is_suspended && <Badge variant="outline" className="ml-2 text-[10px] border-destructive/40 text-destructive">Suspended</Badge>}
                        </td>
                        <td className="p-3 text-muted-foreground">{r.instagram_handle ? `@${r.instagram_handle.replace(/^@/, "")}` : "—"}</td>
                        <td className="p-3 text-muted-foreground">{r.followers ? r.followers.toLocaleString() : "—"}</td>
                        <td className="p-3 text-muted-foreground">{r.area ?? "—"}</td>
                        <td className="p-3 text-muted-foreground capitalize">{r.source}</td>
                        <td className="p-3 text-muted-foreground">{r.kind === "creator" ? `${r.verified_posts} verified` : "—"}</td>
                        <td className={`p-3 ${r.strikes ? "text-destructive font-medium" : "text-muted-foreground"}`}>{r.strikes || "—"}</td>
                        <td className="p-3">
                          {r.kind === "prospect" ? (
                            <Select value={r.stage} onValueChange={(v) => void moveProspect(r.id, v)}>
                              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sourced">Sourced</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : <span className="text-xs text-muted-foreground">{r.next_action ?? "—"}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {list.length > 200 && <p className="text-xs text-muted-foreground p-3">Showing the first 200 of {list.length}.</p>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card title="Supply by area" note="Approved venues against approved creators. A high ratio means venues there will wait for visits.">
                {m.areas.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
                  <div className="space-y-1.5 text-sm">
                    {m.areas.map(([area, x]) => (
                      <div key={area} className="flex justify-between">
                        <span className="text-foreground">{area}</span>
                        <span className={x.creators === 0 && x.venues > 0 ? "text-destructive" : "text-muted-foreground"}>
                          {x.venues} venues · {x.creators} creators
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Creator leaderboard" note="Who to push.">
                {m.leaderboard.length === 0 ? <p className="text-sm text-muted-foreground">No delivered posts yet.</p> : (
                  <div className="space-y-1.5 text-sm">
                    {m.leaderboard.map((r) => (
                      <div key={r.id} className="flex justify-between">
                        <span className="text-foreground">{r.full_name}</span>
                        <span className="text-muted-foreground">{r.verified_posts} verified · {pct(r.on_time_posts, r.delivered_posts)} on time</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Strike list" note="Who to cut.">
                {m.strikeList.length === 0 ? <p className="text-sm text-muted-foreground">No strikes.</p> : (
                  <div className="space-y-1.5 text-sm">
                    {m.strikeList.map((r) => (
                      <div key={r.id} className="flex justify-between">
                        <span className="text-foreground">{r.full_name}</span>
                        <span className="text-destructive">{r.strikes} strike{r.strikes === 1 ? "" : "s"}{r.is_suspended ? " · suspended" : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="max-w-xl">
              <Card title="Targets" note="Adnan's push-back: judge creator recruitment on active creators and post rate, not sign-ups.">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1.5">
                    <Label>New approved per week</Label>
                    <Input type="number" min="0" value={targets.weekly_approved}
                      onChange={(e) => setTargets({ ...targets, weekly_approved: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Active creators</Label>
                    <Input type="number" min="0" value={targets.active_creators}
                      onChange={(e) => setTargets({ ...targets, active_creators: Number(e.target.value) })} />
                  </div>
                </div>
                <Button onClick={() => void saveTargets()} className="gradient-gold text-accent-foreground font-semibold">Save targets</Button>
              </Card>
            </div>
          </>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Add a creator prospect</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            When they sign up with this Instagram handle, they join the pipeline here with you as their owner.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input value={form.instagram_handle} placeholder="@handle" onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Followers</Label>
              <Input type="number" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Niche</Label>
              <Input value={form.niche} placeholder="Food, fitness…" onChange={(e) => setForm({ ...form, niche: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Area</Label>
              <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Follow up on</Label>
              <Input type="date" value={form.next_action_date} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Next action</Label>
              <Input value={form.next_action} placeholder="DM about the Hamra cafés" onChange={(e) => setForm({ ...form, next_action: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => void addProspect()} className="gradient-gold text-accent-foreground font-semibold">Add prospect</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminCreatorOps;
