import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";
import { Phone, MessageCircle, CalendarDays } from "lucide-react";
import LeadDialog from "./LeadDialog";
import { isOpenStage, sourceLabel, stageLabel, todayISO, type Lead } from "./leadMeta";

const db = supabase as any;

const SalesMyDay = () => {
  const { user, role } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    // Explicitly scoped to this rep: "My day" stays personal even for a
    // manager, whose RLS would otherwise return the whole team's pipeline.
    const { data } = await db.from("leads").select("*").eq("owner_id", user.id).order("next_action_date");
    setLeads(data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

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
            <Badge variant="secondary" className="text-[10px]">{stageLabel(lead.stage)}</Badge>
            <Badge variant="secondary" className="text-[10px]">{sourceLabel(lead.source)}</Badge>
          </div>
        </button>
        {digits && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0">
              <a href={`tel:${digits}`} aria-label={`Call ${lead.venue_name}`}><Phone className="w-4 h-4" /></a>
            </Button>
            <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0">
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${lead.venue_name}`}>
                <MessageCircle className="w-4 h-4" />
              </a>
            </Button>
          </div>
        )}
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
