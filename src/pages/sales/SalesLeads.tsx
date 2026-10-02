import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, LayoutGrid, List as ListIcon, AlertCircle, Download, Upload, Users as UsersIcon, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LeadDialog from "./LeadDialog";
import LeadImportDialog from "./LeadImportDialog";
import {
  STAGES, STAGE_TONE, STAGE_COLUMN_TONE, DEFAULT_SCORE_CONFIG, isOpenStage, isOverdue, leadScore, lostReasonLabel,
  sourceLabel, stageLabel, toCsv, type Lead, type ScoreConfig,
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
  const [scoreConfig, setScoreConfig] = useState<ScoreConfig>(DEFAULT_SCORE_CONFIG);
  const [sortBy, setSortBy] = useState<"follow_up" | "score" | "newest">("follow_up");
  const [importOpen, setImportOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState("all");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  // The function answers from rows fetched with the caller's own token, so a
  // rep can only ever ask about their own pipeline.
  const askData = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("");
    const { data, error } = await supabase.functions.invoke("sales-ai", {
      body: { action: "ask", question },
    });
    setAsking(false);
    if (error || (data as any)?.error) {
      toast({ title: "Couldn't answer that", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    setAnswer((data as any).answer ?? "");
  };

  // Only worth showing once a second market exists; a Lebanon-only pipeline
  // doesn't need a country dropdown cluttering the toolbar.
  const countries = useMemo(
    () => [...new Set(leads.map((l) => l.country).filter(Boolean) as string[])].sort(),
    [leads],
  );

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from("leads").select("*").order("next_action_date", { nullsFirst: false });
    if (error) toast({ title: "Couldn't load leads", description: error.message, variant: "destructive" });
    setLeads(data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    supabase.from("platform_settings").select("value").eq("key", "lead_score_weights").maybeSingle()
      .then(({ data }) => { if (data?.value) setScoreConfig(data.value as unknown as ScoreConfig); });
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
    const rows = leads.filter((l) =>
      (stageFilter === "all" || l.stage === stageFilter) &&
      (ownerFilter === "all" || l.owner_id === ownerFilter) &&
      (countryFilter === "all" || l.country === countryFilter) &&
      (!q || l.venue_name.toLowerCase().includes(q) || l.contact_name.toLowerCase().includes(q) || l.phone.includes(q))
    );
    if (sortBy === "newest") {
      return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    if (sortBy === "score") {
      // Unscored leads sink rather than sorting as zero — they're unresearched,
      // not bad, and a rep should still reach them after the best ones.
      return [...rows].sort((a, b) => (leadScore(b, scoreConfig) ?? -1) - (leadScore(a, scoreConfig) ?? -1));
    }
    return [...rows].sort((a, b) =>
      (a.next_action_date ?? "9999-12-31").localeCompare(b.next_action_date ?? "9999-12-31"));
  }, [leads, search, stageFilter, ownerFilter, countryFilter, sortBy, scoreConfig]);

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
       "Source", "Stage", "Score", "Owner", "Next action", "Follow up", "Lost reason", "Created"],
      rows.map((l) => [
        l.venue_name, l.contact_name, l.contact_role, l.phone, l.instagram_handle,
        l.category, l.area, l.city, sourceLabel(l.source), stageLabel(l.stage),
        leadScore(l, scoreConfig), ownerName(l.owner_id), l.next_action, l.next_action_date,
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
        <Badge variant="outline" className={`text-[10px] ${STAGE_TONE[lead.stage]}`}>{stageLabel(lead.stage)}</Badge>
        <Badge variant="secondary" className="text-[10px]">{sourceLabel(lead.source)}</Badge>
        {isManager && <Badge variant="secondary" className="text-[10px]">{ownerName(lead.owner_id)}</Badge>}
        {(() => {
          const score = leadScore(lead, scoreConfig);
          if (score === null) return null;
          return (
            <Badge
              className="text-[10px] border-gold/40"
              style={{ background: `hsl(42 65% 50% / ${0.12 + (score / 100) * 0.3})` }}
              title="Lead score"
            >
              {score}
            </Badge>
          );
        })()}
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
          <div className="flex gap-2 flex-wrap">
            {isManager && (
              <>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload className="w-4 h-4 mr-1.5" /> Import
                </Button>
                <Button variant="outline" onClick={() => void exportCsv()} disabled={!filtered.length}>
                  <Download className="w-4 h-4 mr-1.5" /> Export
                </Button>
              </>
            )}
            <Button onClick={openNew} className="btn-sales-primary font-semibold">
              <Plus className="w-4 h-4 mr-1.5" /> Add lead
            </Button>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-border bg-card p-3">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void askData(); }}
              placeholder="Ask about your pipeline — e.g. which Hamra cafes have been waiting over 5 days?"
              className="bg-secondary border-border"
            />
            <Button variant="outline" onClick={() => void askData()} disabled={asking || !question.trim()}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              {asking ? "Thinking…" : "Ask"}
            </Button>
          </div>
          {answer && (
            <p className="text-sm text-foreground mt-3 whitespace-pre-wrap border-t border-border pt-3">{answer}</p>
          )}
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
          {countries.length > 1 && (
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[150px] bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All markets</SelectItem>
                {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[170px] bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="follow_up">Follow-up date</SelectItem>
              <SelectItem value="score">Best leads first</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
            </SelectContent>
          </Select>
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
          <>
            {/* Phones keep cards — a wide table is unusable at a venue door. */}
            <div className="grid gap-2 md:hidden">
              {filtered.map((lead) => (
                <div key={lead.id} className="space-y-1.5">
                  <LeadCard lead={lead} />
                  <Select value={lead.stage} onValueChange={(v) => void moveStage(lead, v)}>
                    <SelectTrigger className={`h-8 text-xs font-medium ${STAGE_TONE[lead.stage]}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    {isManager && <th className="p-3 w-8" />}
                    <th className="p-3 font-medium">Venue</th>
                    <th className="p-3 font-medium">Contact</th>
                    <th className="p-3 font-medium">Area</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Stage</th>
                    {isManager && <th className="p-3 font-medium">Owner</th>}
                    <th className="p-3 font-medium">Next action</th>
                    <th className="p-3 font-medium">Follow up</th>
                    <th className="p-3 font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => {
                    const overdue = isOverdue(lead);
                    const score = leadScore(lead, scoreConfig);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => openLead(lead)}
                        className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
                      >
                        {isManager && (
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(lead.id)}
                              onCheckedChange={() => toggleSelected(lead.id)}
                              aria-label={`Select ${lead.venue_name}`}
                            />
                          </td>
                        )}
                        <td className="p-3 font-medium text-foreground">{lead.venue_name}</td>
                        <td className="p-3 text-muted-foreground">
                          {lead.contact_name}
                          {lead.phone && <div className="text-xs">{lead.phone}</div>}
                        </td>
                        <td className="p-3 text-muted-foreground">{lead.area ?? "—"}</td>
                        <td className="p-3 text-muted-foreground">{lead.category ?? "—"}</td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <Select value={lead.stage} onValueChange={(v) => void moveStage(lead, v)}>
                            <SelectTrigger className={`h-8 w-[140px] text-xs font-medium ${STAGE_TONE[lead.stage]}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        {isManager && <td className="p-3 text-muted-foreground">{ownerName(lead.owner_id)}</td>}
                        <td className="p-3 text-muted-foreground">{lead.next_action ?? "—"}</td>
                        <td className={`p-3 whitespace-nowrap ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {lead.next_action_date ?? "—"}
                        </td>
                        <td className="p-3 text-right text-foreground">{score ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
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
                  className={`w-[260px] shrink-0 rounded-xl border p-2.5 ${STAGE_COLUMN_TONE[s.key]}`}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-xs font-bold uppercase tracking-wide">{s.label}</p>
                    <span className="text-xs font-semibold">{col.length}</span>
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

      <LeadImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={load}
        owners={owners}
        fallbackOwner={user?.id ?? ""}
      />
    </DashboardLayout>
  );
};

export default SalesLeads;
export { stageLabel };
