import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Link2, Phone, MessageCircle } from "lucide-react";
import {
  ACTIVITY_TYPES, LOST_REASONS, PRICE_LEVELS, SOURCES, STAGES,
  isOpenStage, stageLabel, todayISO,
  type Lead, type LeadActivity,
} from "./leadMeta";

// The generated Supabase types don't know about leads/lead_activities yet
// (they're regenerated from the live schema, and this migration isn't applied
// there). The app-side shapes in leadMeta.ts carry the typing instead.
const db = supabase as any;

interface Duplicate { kind: string; match_name: string; matched_on: string; owner_name: string | null }

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  owners: { user_id: string; full_name: string }[];
  canReassign: boolean;
  categories: string[];
  areas: string[];
}

const emptyForm = (ownerId: string) => ({
  venue_name: "", category: "", area: "", city: "", address: "", maps_place_id: "",
  contact_name: "", contact_role: "", phone: "", instagram_handle: "",
  instagram_followers: "", google_rating: "", google_review_count: "", price_level: "",
  plan_pitched_id: "",
  source: "walk_in", stage: "new", owner_id: ownerId,
  next_action: "", next_action_date: todayISO(), lost_reason: "", notes: "",
});

/** "" means "not captured" for these — 0 is a real rating, so don't coerce. */
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const LeadDialog = ({ lead, open, onOpenChange, onSaved, owners, canReassign, categories, areas }: Props) => {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm(user?.id ?? ""));
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [newActivity, setNewActivity] = useState({ type: "call", outcome: "" });
  const [tiers, setTiers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("subscription_tiers").select("id, name").eq("is_active", true).order("price")
      .then(({ data }) => setTiers((data ?? []) as any));
  }, []);

  useEffect(() => {
    if (!open) return;
    setDuplicates([]);
    setOverrideDuplicate(false);
    if (lead) {
      setForm({
        venue_name: lead.venue_name, category: lead.category ?? "", area: lead.area ?? "",
        city: lead.city ?? "", address: lead.address ?? "", maps_place_id: lead.maps_place_id ?? "",
        contact_name: lead.contact_name, contact_role: lead.contact_role ?? "",
        phone: lead.phone, instagram_handle: lead.instagram_handle ?? "",
        instagram_followers: lead.instagram_followers?.toString() ?? "",
        google_rating: lead.google_rating?.toString() ?? "",
        google_review_count: lead.google_review_count?.toString() ?? "",
        price_level: lead.price_level?.toString() ?? "",
        plan_pitched_id: lead.plan_pitched_id ?? "",
        source: lead.source, stage: lead.stage, owner_id: lead.owner_id,
        next_action: lead.next_action ?? "", next_action_date: lead.next_action_date ?? todayISO(),
        lost_reason: lead.lost_reason ?? "", notes: lead.notes ?? "",
      });
      db.from("lead_activities").select("*").eq("lead_id", lead.id).order("happened_at", { ascending: false })
        .then(({ data }: any) => setActivities(data ?? []));
    } else {
      setForm(emptyForm(user?.id ?? ""));
      setActivities([]);
    }
  }, [open, lead, user]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.venue_name.trim()) return "Venue name is required.";
    if (!form.contact_name.trim()) return "Contact name is required.";
    if (!form.phone.trim()) return "Phone is required.";
    if (isOpenStage(form.stage) && (!form.next_action.trim() || !form.next_action_date))
      return "An open lead needs a next action and a date — that's what keeps it from going quiet.";
    if (form.stage === "lost" && !form.lost_reason) return "Pick a reason this lead was lost.";
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) { toast({ title: problem, variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (!overrideDuplicate) {
        const { data: dupes } = await db.rpc("check_lead_duplicate", {
          _phone: form.phone, _instagram: form.instagram_handle || null, _exclude: lead?.id ?? null,
        });
        if (dupes?.length) { setDuplicates(dupes); setSaving(false); return; }
      }
      const payload = {
        ...form,
        category: form.category || null, area: form.area || null, city: form.city || null,
        address: form.address || null, contact_role: form.contact_role || null,
        maps_place_id: form.maps_place_id || null,
        instagram_handle: form.instagram_handle || null, notes: form.notes || null,
        instagram_followers: numOrNull(form.instagram_followers),
        google_rating: numOrNull(form.google_rating),
        google_review_count: numOrNull(form.google_review_count),
        price_level: numOrNull(form.price_level),
        plan_pitched_id: form.plan_pitched_id || null,
        next_action: isOpenStage(form.stage) ? form.next_action : null,
        next_action_date: isOpenStage(form.stage) ? form.next_action_date : null,
        lost_reason: form.stage === "lost" ? form.lost_reason : null,
      };
      const { error } = lead
        ? await db.from("leads").update(payload).eq("id", lead.id)
        : await db.from("leads").insert(payload);
      if (error) throw error;
      toast({ title: lead ? "Lead updated" : "Lead added" });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const logActivity = async () => {
    if (!lead || !newActivity.outcome.trim()) return;
    const { error } = await db.from("lead_activities").insert({
      lead_id: lead.id, user_id: user?.id, type: newActivity.type, outcome: newActivity.outcome,
    });
    if (error) { toast({ title: "Couldn't log that", description: error.message, variant: "destructive" }); return; }
    setNewActivity({ type: newActivity.type, outcome: "" });
    const { data } = await db.from("lead_activities").select("*").eq("lead_id", lead.id).order("happened_at", { ascending: false });
    setActivities(data ?? []);
  };

  // Plain signup URL: the lead attaches itself when the venue signs up with
  // this phone number, so nothing has to survive the signup flow.
  const signupLink = `${window.location.origin}/signup/business`;
  const digits = form.phone.replace(/\D/g, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? lead.venue_name : "Add lead"}</DialogTitle>
        </DialogHeader>

        {duplicates.length > 0 && (
          <div className="rounded-lg border border-yellow-400/40 bg-yellow-500/10 p-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" /> This venue may already be in the system
            </p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {duplicates.map((d, i) => (
                <li key={i}>
                  {d.kind === "venue" ? "Already signed up as a venue" : `Already a lead${d.owner_name ? `, owned by ${d.owner_name}` : ""}`}
                  : <strong>{d.match_name}</strong> (same {d.matched_on})
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => { setOverrideDuplicate(true); setDuplicates([]); }}>
                Save anyway
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDuplicates([])}>Let me check</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Venue name *</Label>
            <Input value={form.venue_name} onChange={(e) => set("venue_name", e.target.value)} placeholder="e.g. Cafe Younes Hamra" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact name *</Label>
            <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Their role</Label>
            <Input value={form.contact_role} onChange={(e) => set("contact_role", e.target.value)} placeholder="Owner / manager" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" placeholder="03 123 456" />
          </div>
          <div className="space-y-1.5">
            <Label>Instagram</Label>
            <Input value={form.instagram_handle} onChange={(e) => set("instagram_handle", e.target.value)} placeholder="@handle" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Area</Label>
            <Select value={form.area} onValueChange={(v) => set("area", v)}>
              <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
              <SelectContent>{areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => set("source", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {canReassign && (
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={form.owner_id} onValueChange={(v) => set("owner_id", v)}>
                <SelectTrigger><SelectValue placeholder="Assign a rep" /></SelectTrigger>
                <SelectContent>{owners.map((o) => <SelectItem key={o.user_id} value={o.user_id}>{o.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {form.stage === "lost" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Why was it lost? *</Label>
              <Select value={form.lost_reason} onValueChange={(v) => set("lost_reason", v)}>
                <SelectTrigger><SelectValue placeholder="Pick a reason" /></SelectTrigger>
                <SelectContent>{LOST_REASONS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {isOpenStage(form.stage) && (
            <>
              <div className="space-y-1.5">
                <Label>Next action *</Label>
                <Input value={form.next_action} onChange={(e) => set("next_action", e.target.value)} placeholder="Call the owner back" />
              </div>
              <div className="space-y-1.5">
                <Label>Follow up on *</Label>
                <Input type="date" value={form.next_action_date} onChange={(e) => set("next_action_date", e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          {/* Collapsed by default so adding a lead on a phone stays quick —
              everything below is optional and feeds Phase 2 lead scoring. */}
          <details className="sm:col-span-2 rounded-lg border border-border p-3">
            <summary className="text-sm text-muted-foreground cursor-pointer select-none">
              More details (optional)
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Google Maps place ID</Label>
                <Input value={form.maps_place_id} onChange={(e) => set("maps_place_id", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram followers</Label>
                <Input type="number" inputMode="numeric" value={form.instagram_followers} onChange={(e) => set("instagram_followers", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Price level</Label>
                <Select value={form.price_level} onValueChange={(v) => set("price_level", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{PRICE_LEVELS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Google rating</Label>
                <Input type="number" step="0.1" min="0" max="5" value={form.google_rating} onChange={(e) => set("google_rating", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Google reviews</Label>
                <Input type="number" inputMode="numeric" value={form.google_review_count} onChange={(e) => set("google_review_count", e.target.value)} />
              </div>
              {tiers.length > 0 && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Plan pitched</Label>
                  <Select value={form.plan_pitched_id} onValueChange={(v) => set("plan_pitched_id", v)}>
                    <SelectTrigger><SelectValue placeholder="None yet" /></SelectTrigger>
                    <SelectContent>{tiers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </details>
        </div>

        {lead && (
          <div className="flex flex-wrap gap-2 pt-1">
            {digits && (
              <>
                <Button size="sm" variant="outline" asChild>
                  <a href={`tel:${digits}`}><Phone className="w-3.5 h-3.5 mr-1.5" /> Call</a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> WhatsApp
                  </a>
                </Button>
              </>
            )}
            {lead.venue_id ? (
              <Badge className="bg-success/20 text-success border-success/30">Signed up — linked to venue</Badge>
            ) : (
              <Button
                size="sm" variant="outline"
                onClick={() => { void navigator.clipboard.writeText(signupLink); toast({ title: "Signup link copied", description: `Send it to them. If they sign up using ${form.phone}, this lead links to the venue automatically.` }); }}
              >
                <Link2 className="w-3.5 h-3.5 mr-1.5" /> Copy signup link
              </Button>
            )}
          </div>
        )}

        {lead && (
          <div className="border-t border-border pt-3 space-y-3">
            <Label className="text-muted-foreground">Activity</Label>
            <div className="flex gap-2">
              <Select value={newActivity.type} onValueChange={(v) => setNewActivity((a) => ({ ...a, type: v }))}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIVITY_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input
                value={newActivity.outcome}
                onChange={(e) => setNewActivity((a) => ({ ...a, outcome: e.target.value }))}
                placeholder="What happened?"
                onKeyDown={(e) => { if (e.key === "Enter") void logActivity(); }}
              />
              <Button size="sm" onClick={() => void logActivity()} disabled={!newActivity.outcome.trim()}>Log</Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activities.length === 0 && <p className="text-xs text-muted-foreground">Nothing logged yet.</p>}
              {activities.map((a) => (
                <div key={a.id} className="text-xs flex gap-2">
                  <span className="text-muted-foreground shrink-0 w-24">{new Date(a.happened_at).toLocaleDateString()}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {a.type === "stage_change" ? "stage" : a.type}
                  </Badge>
                  <span className="text-foreground">{a.outcome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving} className="gradient-gold text-accent-foreground font-semibold">
            {saving ? "Saving…" : overrideDuplicate ? "Save anyway" : lead ? "Save changes" : "Add lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDialog;
export { stageLabel };
