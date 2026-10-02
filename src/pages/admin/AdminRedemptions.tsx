import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Check, X, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DELIVERY_LABEL, DELIVERY_TONE, VISITED } from "@/lib/delivery";
import { formatLabel } from "./_format";

const db = supabase as any;

interface Row {
  id: string;
  status: string;
  created_at: string;
  offer_id: string;
  influencer_id: string;
  preferred_date: string | null;
  delivery_stage: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  manual_checkin_reason: string | null;
  post_due_at: string | null;
  post_url: string | null;
  posted_late: boolean;
  post_check_due_at: string | null;
  failure_reason: string | null;
  offer_title?: string;
  venue_name?: string;
  influencer_name?: string;
  scanner_name?: string;
}

type Prompt = { kind: "manual" | "reject"; row: Row } | null;

const beirutToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Beirut" });
const fmt = (iso: string | null) => iso
  ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  : "—";

const AdminRedemptions = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("action");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [promptText, setPromptText] = useState("");
  const [rules, setRules] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const fetchAll = async () => {
    const { data: reds, error } = await db
      .from("offer_redemptions")
      .select("id, status, created_at, offer_id, influencer_id, preferred_date, delivery_stage, checked_in_at, checked_in_by, manual_checkin_reason, post_due_at, post_url, posted_late, post_check_due_at, failure_reason")
      .order("created_at", { ascending: false });
    if (error) { setLoadError(error.message); setLoading(false); return; }
    setLoadError(null);
    const list = (reds ?? []) as Row[];
    const offerIds = [...new Set(list.map((r) => r.offer_id))];
    const people = [...new Set(list.flatMap((r) => [r.influencer_id, r.checked_in_by]).filter(Boolean))] as string[];
    const [{ data: offers }, { data: profiles }] = await Promise.all([
      offerIds.length ? supabase.from("offers").select("id, title, venues(name)").in("id", offerIds) : Promise.resolve({ data: [] as any[] }),
      people.length ? supabase.rpc("get_public_profiles_basic", { _user_ids: people }) : Promise.resolve({ data: [] as any[] }),
    ]);
    const offerMap = new Map((offers ?? []).map((o: any) => [o.id, o]));
    const nameOf = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
    setRows(list.map((r) => ({
      ...r,
      offer_title: offerMap.get(r.offer_id)?.title,
      venue_name: offerMap.get(r.offer_id)?.venues?.name,
      influencer_name: nameOf.get(r.influencer_id) ?? undefined,
      scanner_name: r.checked_in_by ? nameOf.get(r.checked_in_by) ?? "Venue staff" : undefined,
    })));
    setLoading(false);
  };

  useEffect(() => {
    void fetchAll();
    supabase.from("platform_settings").select("value").eq("key", "delivery_rules").maybeSingle()
      .then(({ data }) => setRules((data?.value as any) ?? {}));
    // Spec: status changes show live — a scan at the door appears here within seconds.
    const channel = supabase
      .channel("admin-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "offer_redemptions" }, () => void fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const call = async (fn: string, args: Record<string, unknown>, success: string) => {
    const { data, error } = await db.rpc(fn, args);
    if (error || data?.ok === false) {
      toast({ title: "Not done", description: data?.reason || error?.message, variant: "destructive" });
      return false;
    }
    toast({ title: success });
    void fetchAll();
    return true;
  };

  const decideApplication = async (id: string, status: "approved" | "rejected") => {
    const { error } = await db.from("offer_redemptions").update({ status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Application ${status}` }); void fetchAll(); }
  };

  const submitPrompt = async () => {
    if (!prompt) return;
    const ok = prompt.kind === "manual"
      ? await call("manual_check_in", { _redemption_id: prompt.row.id, _reason: promptText }, "Checked in manually")
      : await call("review_booking_post", { _redemption_id: prompt.row.id, _approve: false, _note: promptText }, "Post rejected");
    if (ok) { setPrompt(null); setPromptText(""); }
  };

  const saveRules = async () => {
    const { error } = await supabase.from("platform_settings").update({ value: rules as any }).eq("key", "delivery_rules");
    toast(error ? { title: "Couldn't save", description: error.message, variant: "destructive" } : { title: "Delivery rules saved" });
  };

  const now = Date.now();
  const needsAction = (r: Row) =>
    r.status === "pending"
    || r.delivery_stage === "posted" || r.delivery_stage === "late"
    || (r.delivery_stage === "verified" && !!r.post_check_due_at && new Date(r.post_check_due_at).getTime() <= now);

  const stats = useMemo(() => {
    const today = beirutToday();
    const weekAgo = now - 7 * 86400000;
    const checkInsToday = rows.filter((r) => r.checked_in_at
      && new Date(r.checked_in_at).toLocaleDateString("en-CA", { timeZone: "Asia/Beirut" }) === today).length;
    const noShowsWeek = rows.filter((r) => r.delivery_stage === "no_show"
      && r.preferred_date && new Date(r.preferred_date).getTime() >= weekAgo).length;
    const visited = rows.filter((r) => r.delivery_stage && VISITED.has(r.delivery_stage)).length;
    const noShows = rows.filter((r) => r.delivery_stage === "no_show").length;
    const toVerify = rows.filter((r) => r.delivery_stage === "posted" || r.delivery_stage === "late").length;
    return {
      checkInsToday,
      noShowsWeek,
      noShowRate: visited + noShows ? Math.round((noShows / (visited + noShows)) * 100) : null,
      toVerify,
    };
  }, [rows, now]);

  const q = search.toLowerCase();
  const filtered = rows.filter((r) =>
    (view === "all" || (view === "action" ? needsAction(r) : r.delivery_stage === view)) &&
    (!q || [r.offer_title, r.influencer_name, r.venue_name].some((v) => (v || "").toLowerCase().includes(q))));

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="gradient-card rounded-xl border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  const actions = (r: Row) => {
    if (r.status === "pending") return (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => void decideApplication(r.id, "approved")} className="h-7 px-2 text-success" title="Approve"><Check className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => void decideApplication(r.id, "rejected")} className="h-7 px-2 text-destructive" title="Reject"><X className="w-4 h-4" /></Button>
      </div>
    );
    if (r.delivery_stage === "booked" || r.delivery_stage === "no_show") return (
      <Button size="sm" variant="outline" className="h-7" onClick={() => { setPrompt({ kind: "manual", row: r }); setPromptText(""); }}>
        Manual check-in
      </Button>
    );
    if (r.delivery_stage === "posted" || r.delivery_stage === "late") return (
      <div className="flex gap-1">
        <Button size="sm" className="h-7" onClick={() => void call("review_booking_post", { _redemption_id: r.id, _approve: true }, "Post verified")}>Verify</Button>
        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => { setPrompt({ kind: "reject", row: r }); setPromptText(""); }}>Reject</Button>
      </div>
    );
    if (r.delivery_stage === "verified" && r.post_check_due_at && new Date(r.post_check_due_at).getTime() <= now) return (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7" onClick={() => void call("confirm_post_live", { _redemption_id: r.id, _still_live: true }, "Post confirmed live")}>Still live</Button>
        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => void call("confirm_post_live", { _redemption_id: r.id, _still_live: false }, "Marked deleted — strike added")}>Deleted</Button>
      </div>
    );
    return <span className="text-xs text-muted-foreground">—</span>;
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Offer <span className="text-gold">Attendance</span></h1>
        <p className="text-muted-foreground mb-6">Every booking from check-in to a verified post. Updates live as venues scan.</p>

        {loadError && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Couldn't load bookings: {loadError}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Stat label="Check-ins today" value={stats.checkInsToday} />
          <Stat label="No-shows this week" value={stats.noShowsWeek} />
          <Stat label="No-show rate" value={stats.noShowRate === null ? "—" : `${stats.noShowRate}%`} sub="Of bookings whose window has passed" />
          <Stat label="Posts to verify" value={stats.toVerify} />
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search offer, venue or creator..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-[200px] bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="action">Needs action</SelectItem>
              <SelectItem value="all">Everything</SelectItem>
              {Object.entries(DELIVERY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden mb-8">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-3 font-medium">Creator</th>
                  <th className="p-3 font-medium">Offer · Venue</th>
                  <th className="p-3 font-medium">Booked for</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Checked in</th>
                  <th className="p-3 font-medium">Post</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {view === "action" ? "Nothing waiting on you." : "No bookings here."}
                  </td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30 align-top">
                    <td className="p-3 text-foreground">{r.influencer_name || "—"}</td>
                    <td className="p-3">
                      <p className="text-foreground">{r.offer_title || "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.venue_name}</p>
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{r.preferred_date ?? "Any day"}</td>
                    <td className="p-3">
                      {r.delivery_stage ? (
                        <Badge variant="outline" className={DELIVERY_TONE[r.delivery_stage]}>{DELIVERY_LABEL[r.delivery_stage]}</Badge>
                      ) : (
                        <Badge variant="outline">{formatLabel(r.status)}</Badge>
                      )}
                      {r.failure_reason && <p className="text-xs text-destructive mt-1">{r.failure_reason}</p>}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {r.checked_in_at ? (
                        <>
                          <p className="text-foreground">{fmt(r.checked_in_at)}</p>
                          <p>by {r.scanner_name}</p>
                          {r.manual_checkin_reason && <Badge variant="outline" className="mt-1 text-[10px] border-yellow-500/40 text-yellow-700">Manual: {r.manual_checkin_reason}</Badge>}
                        </>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-xs">
                      {r.post_url ? (
                        <a href={r.post_url} target="_blank" rel="noreferrer" className="text-gold hover:underline inline-flex items-center gap-1">
                          View post <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : r.delivery_stage === "visited" && r.post_due_at ? (
                        <span className={new Date(r.post_due_at).getTime() < now ? "text-destructive" : "text-muted-foreground"}>
                          Due {fmt(r.post_due_at)}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3">{actions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="gradient-card rounded-xl border border-border p-5 max-w-2xl">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Delivery rules</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Adnan's two emails give the post deadline as 72 hours and 48 hours — set the one you want here.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {[
              ["post_deadline_hours", "Post deadline after check-in (hours)"],
              ["checkin_open_hours_before", "Check-in opens before opening time (hours)"],
              ["post_check_days", "Re-check post is still live after (days)"],
              ["strikes_to_suspend", "Strikes before a suspension"],
              ["suspend_days", "Suspension length (days)"],
              ["strikes_to_remove", "Strikes before removal"],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input type="number" min="0" value={rules[key] ?? ""}
                  onChange={(e) => setRules({ ...rules, [key]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <Button onClick={() => void saveRules()} className="gradient-gold text-accent-foreground font-semibold">Save rules</Button>
        </div>
      </div>

      <Dialog open={!!prompt} onOpenChange={(v) => { if (!v) setPrompt(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{prompt?.kind === "manual" ? "Manual check-in" : "Reject this post"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {prompt?.kind === "manual"
              ? "Only when the scan failed (scanner broken, no signal). This is logged and flagged."
              : "Tell the creator what's wrong. If the deadline hasn't passed they can resubmit; after it, this counts as missed."}
          </p>
          <Textarea rows={3} value={promptText} onChange={(e) => setPromptText(e.target.value)}
            placeholder={prompt?.kind === "manual" ? "Reason (required)" : "e.g. Venue isn't tagged"} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPrompt(null)}>Cancel</Button>
            <Button onClick={() => void submitPrompt()} disabled={prompt?.kind === "manual" && !promptText.trim()}>
              {prompt?.kind === "manual" ? "Check in" : "Reject post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminRedemptions;
