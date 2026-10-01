import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGES, daysInStage, isOverdue, median, stageLabel, type Lead, type LeadActivity } from "./leadMeta";

const db = supabase as any;

const WEEKLY_SIGNING_TARGET = 12;
const ANNUAL_LIVE_TARGET = 500;

const sinceISO = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

const SalesDashboard = () => {
  const { role } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [days, setDays] = useState("7");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: leadRows }, { data: actRows }] = await Promise.all([
        db.from("leads").select("*"),
        db.from("lead_activities").select("*").gte("happened_at", sinceISO(90)),
      ]);
      setLeads(leadRows ?? []);
      setActivities(actRows ?? []);
      const ids = [...new Set((leadRows ?? []).map((l: any) => l.owner_id))];
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids as string[]);
        setOwners(Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.full_name || "Unnamed"])));
      }
      setLoading(false);
    })();
  }, []);

  const cutoff = sinceISO(Number(days));
  const leadOwner = useMemo(() => Object.fromEntries(leads.map((l) => [l.id, l.owner_id])), [leads]);
  const inRange = useMemo(() => activities.filter((a) => a.happened_at >= cutoff), [activities, cutoff]);
  const signedInRange = useMemo(
    () => inRange.filter((a) => a.type === "stage_change" && (a.outcome ?? "").endsWith("signed_up")),
    [inRange],
  );

  // Conversion is measured against how many leads reached this stage or any
  // later one — a lead sitting in "Live" did pass through "Contacted".
  const ORDER: string[] = STAGES.filter((s) => s.key !== "lost").map((s) => s.key);
  const reachedAtLeast = (stageKey: string) => {
    const idx = ORDER.indexOf(stageKey);
    return leads.filter((l) => {
      const li = ORDER.indexOf(l.stage);
      return li >= idx && li !== -1;
    }).length;
  };

  const funnel = STAGES.map((s) => {
    const inStage = leads.filter((l) => l.stage === s.key);
    const nextKey = ORDER[ORDER.indexOf(s.key) + 1];
    const reached = reachedAtLeast(s.key);
    return {
      ...s,
      count: inStage.length,
      reached,
      toNext: s.key === "lost" || !nextKey || !reached
        ? null
        : Math.round((reachedAtLeast(nextKey) / reached) * 100),
      medianDays: median(inStage.map((l) => daysInStage(l))),
    };
  });
  const maxCount = Math.max(1, ...funnel.map((f) => f.count));
  const liveCount = leads.filter((l) => l.stage === "live").length;
  const overdueLeads = leads.filter(isOverdue);

  const leaderboard = useMemo(() => {
    const rows: Record<string, { contacts: number; meetings: number; signings: number; overdue: number }> = {};
    const row = (id: string) => (rows[id] ??= { contacts: 0, meetings: 0, signings: 0, overdue: 0 });
    for (const a of inRange) {
      const ownerId = leadOwner[a.lead_id];
      if (!ownerId) continue;
      if (["call", "whatsapp", "visit"].includes(a.type)) row(ownerId).contacts++;
      if (a.type === "meeting") row(ownerId).meetings++;
      if (a.type === "stage_change" && (a.outcome ?? "").endsWith("signed_up")) row(ownerId).signings++;
    }
    for (const l of overdueLeads) row(l.owner_id).overdue++;
    return Object.entries(rows)
      .map(([id, v]) => ({ id, name: owners[id] ?? "Unnamed", ...v }))
      .sort((a, b) => b.signings - a.signings || b.meetings - a.meetings || b.contacts - a.contacts);
  }, [inRange, leadOwner, overdueLeads, owners]);

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="gradient-card rounded-xl border border-border p-5">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-display font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );

  return (
    <DashboardLayout type={role === "admin" ? "admin" : "sales"}>
      <div className="animate-fade-in">
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">
              Sales <span className="text-gold">dashboard</span>
            </h1>
            <p className="text-muted-foreground text-sm">Pipeline health and rep activity</p>
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Stat label="Signings in range" value={signedInRange.length} sub={`Weekly target ${WEEKLY_SIGNING_TARGET}`} />
              <Stat label="Live venues" value={liveCount} sub={`of ${ANNUAL_LIVE_TARGET} annual target`} />
              <Stat label="Open leads" value={leads.filter((l) => !["live", "lost"].includes(l.stage)).length} />
              <Stat label="Overdue follow-ups" value={overdueLeads.length} sub={overdueLeads.length ? "Needs chasing" : "All current"} />
            </div>

            <div className="gradient-card rounded-xl border border-border p-5 mb-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-1">Funnel</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Bar is how many sit in the stage now. "→" is the share that went on to the next stage; "med." is the median days a lead has been sitting there.
              </p>
              <div className="space-y-2.5">
                {funnel.map((f) => (
                  <div key={f.key} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 shrink-0">{f.label}</span>
                    <div className="flex-1 h-5 rounded bg-secondary overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${(f.count / maxCount) * 100}%`, background: "#e6c878" }} />
                    </div>
                    <span className="text-sm font-medium text-foreground w-8 text-right">{f.count}</span>
                    <span className="text-xs text-muted-foreground w-14 text-right">
                      {f.toNext === null ? "" : `→ ${f.toNext}%`}
                    </span>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {f.medianDays === null ? "" : `med. ${f.medianDays}d`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="gradient-card rounded-xl border border-border p-5">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Rep leaderboard</h2>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity logged in this range yet.</p>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 font-medium">Rep</th>
                        <th className="text-right py-2 font-medium">Contacts</th>
                        <th className="text-right py-2 font-medium">Meetings</th>
                        <th className="text-right py-2 font-medium">Signings</th>
                        <th className="text-right py-2 font-medium">Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((r) => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="py-2 text-foreground">{r.name}</td>
                          <td className="py-2 text-right text-muted-foreground">{r.contacts}</td>
                          <td className="py-2 text-right text-muted-foreground">{r.meetings}</td>
                          <td className="py-2 text-right text-foreground font-medium">{r.signings}</td>
                          <td className={`py-2 text-right ${r.overdue ? "text-destructive" : "text-muted-foreground"}`}>{r.overdue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SalesDashboard;
export { stageLabel };
