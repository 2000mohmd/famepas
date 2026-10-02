import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";
import { Phone, MessageCircle, CalendarDays, AlertTriangle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LeadDialog from "./LeadDialog";
import { isOpenStage, sourceLabel, STAGE_TONE, stageLabel, todayISO, type Lead } from "./leadMeta";

const db = supabase as any;

const SalesMyDay = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [completing, setCompleting] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    // Explicitly scoped to this rep: "My day" stays personal even for a
    // manager, whose RLS would otherwise return the whole team's pipeline.
    const { data } = await db.from("leads").select("*").eq("owner_id", user.id).order("next_action_date");
    setLeads(data ?? []);

    // Admins see every alert; a rep sees the ones on venues they brought in.
    let alertQuery = db.from("sales_alerts").select("*");
    if (role !== "admin") alertQuery = alertQuery.eq("rep_id", user.id);
    const { data: alertRows } = await alertQuery;
    setAlerts(alertRows ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  /**
   * "Done" on today's task, not on the pipeline stage — it logs the follow-up
   * as handled and rolls the date to tomorrow, keeping the same next_action
   * text, rather than clearing it outright. The database requires a next
   * action and date on every open-stage lead (Adnan's own earlier review
   * confirmed that rule matches spec), so a lead can't go "doneless"; this
   * reads it as "I did this today, remind me again if nothing else changes"
   * rather than a stage advance, which is a one-tap away in the full dialog.
   */
  const markDone = async (lead: Lead) => {
    if (!user) return;
    setCompleting(lead.id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDate = tomorrow.toISOString().slice(0, 10);
    const { error } = await db.from("leads").update({ next_action_date: nextDate }).eq("id", lead.id);
    if (!error) {
      await db.from("lead_activities").insert({
        lead_id: lead.id, user_id: user.id, type: "note", outcome: `Done: ${lead.next_action}`,
      });
    }
    setCompleting(null);
    if (error) { toast({ title: "Couldn't mark that done", description: error.message, variant: "destructive" }); return; }
    void load();
  };

  useEffect(() => {
    supabase.from("categories").select("name").eq("is_active", true).order("name")
      .then(({ data }) => setCategories((data ?? []).map((c: any) => c.name)));
    supabase.from("service_locations").select("area, city").eq("is_active", true)
      .then(({ data }) => {
        const names = (data ?? []).flatMap((l: any) => [l.area, l.city]).filter(Boolean) as string[];
        setAreas([...new Set(names)].sort());
      });
  }, []);

  const today = todayISO();
  const open = leads.filter((l) => isOpenStage(l.stage) && l.next_action_date);
  const overdue = open.filter((l) => l.next_action_date! < today);
  const dueToday = open.filter((l) => l.next_action_date === today);
  const upcoming = open.filter((l) => l.next_action_date! > today).slice(0, 10);

  const Row = ({ lead, tone }: { lead: Lead; tone?: "danger" }) => {
    const digits = lead.phone.replace(/\D/g, "");
    return (
      <div className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
        <button className="flex-1 min-w-0 text-left" onClick={() => { setEditing(lead); setDialogOpen(true); }}>
          <p className="font-medium text-foreground text-sm">{lead.venue_name}</p>
          <p className={`text-xs mt-0.5 ${tone === "danger" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {lead.next_action} — {lead.next_action_date}
          </p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${STAGE_TONE[lead.stage]}`}>{stageLabel(lead.stage)}</Badge>
            <Badge variant="secondary" className="text-[10px]">{sourceLabel(lead.source)}</Badge>
          </div>
        </button>
        <div className="flex gap-1 shrink-0">
          {digits && (
            <>
              <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0">
                <a href={`tel:${digits}`} aria-label={`Call ${lead.venue_name}`}><Phone className="w-4 h-4" /></a>
              </Button>
              <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0">
                <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${lead.venue_name}`}>
                  <MessageCircle className="w-4 h-4" />
                </a>
              </Button>
            </>
          )}
          <Button
            size="sm" variant="ghost" className="h-8 w-8 p-0 text-success hover:text-success"
            disabled={completing === lead.id}
            onClick={() => void markDone(lead)}
            aria-label={`Mark done: ${lead.next_action}`}
            title="Done — follows up again tomorrow"
          >
            <Check className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const Section = ({ title, items, tone }: { title: string; items: Lead[]; tone?: "danger" }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0
        ? <p className="text-sm text-muted-foreground">Nothing here.</p>
        : <div className="grid gap-2 sm:grid-cols-2">{items.map((l) => <Row key={l.id} lead={l} tone={tone} />)}</div>}
    </div>
  );

  return (
    <DashboardLayout type={role === "admin" ? "admin" : "sales"}>
      <div className="animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-1">
          My <span className="text-gold">day</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          <CalendarDays className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>

        {alerts.length > 0 && (
          <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4">
            <h2 className="font-display text-lg font-bold text-foreground mb-2">Needs chasing</h2>
            <div className="space-y-1.5">
              {alerts.map((a, i) => (
                <p key={i} className="text-sm text-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-gold" />
                  <strong>{a.subject}</strong> — {a.detail}
                </p>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : open.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground mb-3">No follow-ups scheduled.</p>
            <Button asChild variant="outline"><NavLink to="/sales/leads">Go to your pipeline</NavLink></Button>
          </div>
        ) : (
          <>
            <Section title="Overdue" items={overdue} tone="danger" />
            <Section title="Today" items={dueToday} />
            <Section title="Coming up" items={upcoming} />
          </>
        )}
      </div>

      <LeadDialog
        lead={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        owners={[]}
        canReassign={false}
        categories={categories}
        areas={areas}
      />
    </DashboardLayout>
  );
};

export default SalesMyDay;
