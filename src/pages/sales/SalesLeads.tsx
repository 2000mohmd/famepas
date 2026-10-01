import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, LayoutGrid, List as ListIcon, AlertCircle, Download, Users as UsersIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LeadDialog from "./LeadDialog";
import {
  STAGES, isOpenStage, isOverdue, lostReasonLabel, sourceLabel, stageLabel, toCsv, type Lead,
} from "./leadMeta";

const db = supabase as any;

const SalesLeads = () => {
  const { user, role } = useAuth();
  const isManager = role === "admin" || role === "sales_manager";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [view, setView] = useState<"board" | "list">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [owners, setOwners] = useState<{ user_id: string; full_name: string }[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reassigning, setReassigning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from("leads").select("*").order("next_action_date", { nullsFirst: false });
    if (error) toast({ title: "Couldn't load leads", description: error.message, variant: "destructive" });
    setLeads(data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    supabase.from("categories").select("name").eq("is_active", true).order("name")
      .then(({ data }) => setCategories((data ?? []).map((c: any) => c.name)));
    supabase.from("service_locations").select("area, city").eq("is_active", true)
      .then(({ data }) => {
        const names = (data ?? []).flatMap((l: any) => [l.area, l.city]).filter(Boolean) as string[];
        setAreas([...new Set(names)].sort());
      });
  }, []);

  useEffect(() => {
    if (!isManager) return;
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const staff = (roles ?? [])
        .filter((r: any) => ["sales_rep", "sales_manager", "admin"].includes(r.role))
        .map((r: any) => r.user_id);
      const ids = [...new Set(staff)];
      if (!ids.length) return;
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      setOwners((profiles ?? []).map((p: any) => ({ user_id: p.user_id, full_name: p.full_name || "Unnamed" })));
    })();
  }, [isManager]);

  const ownerName = (id: string) => owners.find((o) => o.user_id === id)?.full_name ?? (id === user?.id ? "You" : "—");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) =>
      (stageFilter === "all" || l.stage === stageFilter) &&
      (ownerFilter === "all" || l.owner_id === ownerFilter) &&
      (!q || l.venue_name.toLowerCase().includes(q) || l.contact_name.toLowerCase().includes(q) || l.phone.includes(q))
    );
  }, [leads, search, stageFilter, ownerFilter]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openLead = (lead: Lead) => { setEditing(lead); setDialogOpen(true); };

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const bulkReassign = async (newOwner: string) => {
    const ids = [...selected];
    if (!ids.length) return;
    setReassigning(true);
    const { error } = await db.from("leads").update({ owner_id: newOwner }).in("id", ids);
    if (error) {
      toast({ title: "Couldn't reassign", description: error.message, variant: "destructive" });
      setReassigning(false);
      return;
    }
    await db.from("sales_audit_log").insert({
      user_id: user?.id, action: "bulk_reassign",
      detail: { lead_ids: ids, to_owner: newOwner, count: ids.length },
    });
    toast({ title: `Reassigned ${ids.length} lead${ids.length === 1 ? "" : "s"} to ${ownerName(newOwner)}` });
    setSelected(new Set());
    setReassigning(false);
    void load();
  };

  const exportCsv = async () => {
    const rows = (selected.size ? filtered.filter((l) => selected.has(l.id)) : filtered);
    if (!rows.length) return;
    const csv = toCsv(
      ["Venue", "Contact", "Role", "Phone", "Instagram", "Category", "Area", "City",
       "Source", "Stage", "Owner", "Next action", "Follow up", "Lost reason", "Created"],
      rows.map((l) => [
        l.venue_name, l.contact_name, l.contact_role, l.phone, l.instagram_handle,
        l.category, l.area, l.city, sourceLabel(l.source), stageLabel(l.stage),
        ownerName(l.owner_id), l.next_action, l.next_action_date,
        l.lost_reason ? lostReasonLabel(l.lost_reason) : "",
        l.created_at.slice(0, 10),
      ]),
    );
    // BOM so Excel reads UTF-8 — venue names here are routinely Arabic.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await db.from("sales_audit_log").insert({
      user_id: user?.id, action: "export", detail: { count: rows.length, scope: selected.size ? "selected" : "filtered" },
    });
    toast({ title: `Exported ${rows.length} lead${rows.length === 1 ? "" : "s"}` });
  };

  /** A stage move only goes straight through when it can satisfy the DB's
   *  "open leads need a next step" rule; otherwise the form opens to collect it. */
  const moveStage = async (lead: Lead, stage: string) => {
    if (stage === lead.stage) return;
    const needsNextAction = isOpenStage(stage) && (!lead.next_action || !lead.next_action_date);
    const needsReason = stage === "lost" && !lead.lost_reason;
    if (needsNextAction || needsReason) {
      setEditing({ ...lead, stage: stage as Lead["stage"] });
      setDialogOpen(true);
      return;
    }
    const patch: Record<string, unknown> = { stage };
    if (!isOpenStage(stage)) { patch.next_action = null; patch.next_action_date = null; }
    const { error } = await db.from("leads").update(patch).eq("id", lead.id);
    if (error) { toast({ title: "Couldn't move that", description: error.message, variant: "destructive" }); return; }
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, ...patch, stage } as Lead : l)));
  };

  const LeadCard = ({ lead, draggable }: { lead: Lead; draggable?: boolean }) => (
    <div
      draggable={draggable}
      onDragStart={() => setDragging(lead.id)}
      onDragEnd={() => setDragging(null)}
      onClick={() => openLead(lead)}
      className={`rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-gold/50 transition-colors ${dragging === lead.id ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-2">
        {isManager && (
          <span onClick={(e) => e.stopPropagation()} className="pt-0.5">
            <Checkbox
              checked={selected.has(lead.id)}
              onCheckedChange={() => toggleSelected(lead.id)}
              aria-label={`Select ${lead.venue_name}`}
            />
          </span>
        )}
        <p className="font-medium text-foreground text-sm leading-tight flex-1">{lead.venue_name}</p>
        {isOverdue(lead) && <AlertCircle className="w-4 h-4 text-destructive shrink-0" aria-label="Overdue" />}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{lead.contact_name} · {lead.phone}</p>
      {(lead.area || lead.category) && (
        <p className="text-xs text-muted-foreground">{[lead.area, lead.category].filter(Boolean).join(" · ")}</p>
      )}
      {lead.next_action && (
        <p className={`text-xs mt-1.5 ${isOverdue(lead) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          {lead.next_action} — {lead.next_action_date}
        </p>
      )}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Badge variant="secondary" className="text-[10px]">{sourceLabel(lead.source)}</Badge>
        {isManager && <Badge variant="secondary" className="text-[10px]">{ownerName(lead.owner_id)}</Badge>}
      </div>
    </div>
  );

  return (
    <DashboardLayout type={role === "admin" ? "admin" : "sales"}>
      <div className="animate-fade-in">
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">
              Lead <span className="text-gold">pipeline</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {filtered.length} lead{filtered.length === 1 ? "" : "s"}
              {!isManager && " assigned to you"}
            </p>
          </div>
          <div className="flex gap-2">
            {isManager && (
              <Button variant="outline" onClick={() => void exportCsv()} disabled={!filtered.length}>
                <Download className="w-4 h-4 mr-1.5" /> Export
              </Button>
            )}
            <Button onClick={openNew} className="gradient-gold text-accent-foreground font-semibold">
              <Plus className="w-4 h-4 mr-1.5" /> Add lead
            </Button>
          </div>
        </div>

        {isManager && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4 rounded-xl border border-gold/40 bg-gold/10 p-3">
            <span className="text-sm font-medium text-foreground">
              <UsersIcon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              {selected.size} selected
            </span>
            <Select onValueChange={(v) => void bulkReassign(v)} disabled={reassigning}>
              <SelectTrigger className="w-[200px] bg-card border-border">
                <SelectValue placeholder={reassigning ? "Reassigning…" : "Reassign to…"} />
              </SelectTrigger>
              <SelectContent>
                {owners.map((o) => <SelectItem key={o.user_id} value={o.user_id}>{o.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Venue, contact or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {isManager && owners.length > 0 && (
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reps</SelectItem>
                {owners.map((o) => <SelectItem key={o.user_id} value={o.user_id}>{o.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("list")} aria-label="List view"
              className={`px-3 py-2 ${view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
              <ListIcon className="w-4 h-4" />
            </button>
            <button onClick={() => setView("board")} aria-label="Board view"
              className={`px-3 py-2 ${view === "board" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading leads…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground mb-3">No leads here yet.</p>
            <Button onClick={openNew} variant="outline"><Plus className="w-4 h-4 mr-1.5" /> Add the first one</Button>
          </div>
        ) : view === "list" ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lead) => (
              <div key={lead.id} className="space-y-1.5">
                <LeadCard lead={lead} />
                <Select value={lead.stage} onValueChange={(v) => void moveStage(lead, v)}>
                  <SelectTrigger className="h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((s) => {
              const col = filtered.filter((l) => l.stage === s.key);
              return (
                <div
                  key={s.key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    const lead = leads.find((l) => l.id === dragging);
                    setDragging(null);
                    if (lead) void moveStage(lead, s.key);
                  }}
                  className="w-[260px] shrink-0 rounded-xl bg-secondary/40 border border-border p-2.5"
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    <span className="text-xs text-muted-foreground">{col.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.map((lead) => <LeadCard key={lead.id} lead={lead} draggable />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {view === "board" && (
          <p className="text-xs text-muted-foreground mt-2">
            Drag cards between columns on a computer. On a phone, use the list view — each card has a stage picker.
          </p>
        )}
      </div>

      <LeadDialog
        lead={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        owners={owners}
        canReassign={isManager}
        categories={categories}
        areas={areas}
      />
    </DashboardLayout>
  );
};

export default SalesLeads;
export { stageLabel };
