import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  STAGES, daysInStage, isOverdue, lostReasonLabel, median, sourceLabel, stageLabel,
  type Lead, type LeadActivity,
} from "./leadMeta";

const db = supabase as any;

const sinceISO = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

const SalesDashboard = () => {
  const { role } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [activation, setActivation] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [targets, setTargets] = useState({ weekly_signings: 12, annual_live_venues: 500 });

  useEffect(() => {
    supabase.from("platform_settings").select("value").eq("key", "sales_targets").maybeSingle()
      .then(({ data }) => { if (data?.value) setTargets(data.value as any); });
  }, []);
  const [days, setDays] = useState("7");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [
        { data: leadRows }, { data: actRows }, { data: activationRows },
        { data: commissionRows }, { data: venueRows }, { data: tierRows },
      ] = await Promise.all([
        db.from("leads").select("*"),
        db.from("lead_activities").select("*").gte("happened_at", sinceISO(90)),
        db.from("venue_activation").select("*"),
        db.from("sales_commissions").select("*"),
        supabase.from("venues").select("id, approval_status, created_at, subscription_tier_id, subscription_renews_at, payment_status"),
        supabase.from("subscription_tiers").select("id, name, price"),
      ]);
      setLeads(leadRows ?? []);
      setActivities(actRows ?? []);
      setActivation(activationRows ?? []);
      setCommissions(commissionRows ?? []);
      setVenues(venueRows ?? []);
      setTiers(tierRows ?? []);
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

  // Scoped to leads created in the selected range, so these counts match what
  // the same range shows on the lead list (spec acceptance criteria).
  const leadsInRange = useMemo(
    () => leads.filter((l) => l.created_at >= cutoff),
    [leads, cutoff],
  );

  const reachedAtLeast = (stageKey: string) => {
    const idx = ORDER.indexOf(stageKey);
    return leadsInRange.filter((l) => {
      const li = ORDER.indexOf(l.stage);
      return li >= idx && li !== -1;
    }).length;
  };

  const funnel = STAGES.map((s) => {
    const inStage = leadsInRange.filter((l) => l.stage === s.key);
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

  // Phase 2 metrics.
  const pendingAges = venues
    .filter((v) => v.approval_status === "pending")
    .map((v) => Math.round((Date.now() - new Date(v.created_at).getTime()) / 3600000));
  const medianPendingHours = median(pendingAges);
  const breachingSla = pendingAges.filter((h) => h > 48).length;

  const signedVenues = activation.filter((a) => a.lead_id);
  const activated = signedVenues.filter((a) => a.first_offer_posted).length;
  const activationRate = signedVenues.length ? Math.round((activated / signedVenues.length) * 100) : null;

  const sourcePerformance = useMemo(() => {
    const rows: Record<string, { total: number; signed: number; live: number }> = {};
    for (const l of leads) {
      const r = (rows[l.source] ??= { total: 0, signed: 0, live: 0 });
      r.total++;
      if (["signed_up", "approved", "live"].includes(l.stage)) r.signed++;
      if (l.stage === "live") r.live++;
    }
    return Object.entries(rows).sort((a, b) => b[1].live - a[1].live || b[1].signed - a[1].signed);
  }, [leads]);

  const lostReasons = useMemo(() => {
    const rows: Record<string, number> = {};
    for (const l of leads.filter((x) => x.stage === "lost" && x.lost_reason)) {
      rows[l.lost_reason!] = (rows[l.lost_reason!] ?? 0) + 1;
    }
    return Object.entries(rows).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  const commissionByRep = useMemo(() => {
    const rows: Record<string, { earned: number; pending: number; venues: number }> = {};
    for (const c of commissions) {
      const row = (rows[c.rep_id] ??= { earned: 0, pending: 0, venues: 0 });
      row.venues++;
      // Only a venue that has stayed live past the qualifying period pays out;
      // the rest is shown as maturing so a rep can see what's coming.
      if (c.qualified) row.earned += Number(c.amount ?? 0);
      else row.pending += Number(c.amount ?? 0);
    }
    return Object.entries(rows)
      .map(([repId, r]) => ({ repId, ...r }))
      .sort((a, b) => b.earned - a.earned);
  }, [commissions]);

  const tierPrice = (id: string | null) => Number(tiers.find((t) => t.id === id)?.price ?? 0);
  const mrr = venues
    .filter((v) => v.subscription_tier_id && v.payment_status !== "cancelled")
    .reduce((sum, v) => sum + tierPrice(v.subscription_tier_id), 0);
  const renewingSoon = venues.filter((v) => {
    if (!v.subscription_renews_at) return false;
    const days = (new Date(v.subscription_renews_at).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 30;
  }).length;

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
              <Stat label="Signings in range" value={signedInRange.length} sub={`Weekly target ${targets.weekly_signings}`} />
              <Stat label="Live venues" value={liveCount} sub={`of ${targets.annual_live_venues} annual target`} />
              <Stat label="Open leads" value={leads.filter((l) => !["live", "lost"].includes(l.stage)).length} />
              <Stat label="Overdue follow-ups" value={overdueLeads.length} sub={overdueLeads.length ? "Needs chasing" : "All current"} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Stat
                label="Waiting for approval"
                value={pendingAges.length}
                sub={medianPendingHours === null
                  ? "Nothing pending"
                  : `${breachingSla} past the 48h mark · median ${medianPendingHours}h`}
              />
              <Stat
                label="Activation rate"
                value={activationRate === null ? "—" : `${activationRate}%`}
                sub={`${activated} of ${signedVenues.length} signed venues posted an offer`}
              />
              <Stat label="Monthly recurring revenue" value={mrr ? `$${mrr.toLocaleString()}` : "—"} sub="From venues on a paid plan" />
              <Stat label="Renewing in 30 days" value={renewingSoon} />
            </div>

            <div className="gradient-card rounded-xl border border-border p-5 mb-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-1">Funnel</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Leads created in the selected range. Bar is how many sit in the stage now; "→" is the share that went on to the next stage; "med." is the median days a lead has been sitting there.
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="gradient-card rounded-xl border border-border p-5">
                <h2 className="font-display text-lg font-bold text-foreground mb-4">Where signings come from</h2>
                {sourcePerformance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No leads yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sourcePerformance.map(([src, r]) => (
                      <div key={src} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{sourceLabel(src)}</span>
                        <span className="text-muted-foreground">
                          {r.total} leads · {r.signed} signed · <strong className="text-foreground">{r.live} live</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="gradient-card rounded-xl border border-border p-5">
                <h2 className="font-display text-lg font-bold text-foreground mb-4">Why leads are lost</h2>
                {lostReasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing marked lost yet.</p>
                ) : (
                  <div className="space-y-2">
                    {lostReasons.map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{lostReasonLabel(reason)}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="gradient-card rounded-xl border border-border p-5 mb-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-1">Signed but not live yet</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Venues that signed up but haven't finished activating. A venue only counts as Live once it posts an offer.
              </p>
              {(() => {
                const stalled = activation.filter((a) => a.lead_id && !a.first_offer_posted);
                if (!stalled.length) return <p className="text-sm text-muted-foreground">Every signed venue has posted an offer.</p>;
                const step = (done: boolean, label: string) => (
                  <span className={done ? "text-success" : "text-muted-foreground"}>
                    {done ? "✓" : "○"} {label}
                  </span>
                );
                return (
                  <div className="space-y-3">
                    {stalled.map((a) => (
                      <div key={a.venue_id} className="border-b border-border/50 pb-2 last:border-0">
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1">
                          {step(a.profile_complete, "Profile")}
                          {step(a.photos_uploaded, "Photos")}
                          {step(a.first_offer_posted, "First offer")}
                          {step(a.first_creator_visit, "First visit")}
                          {step(a.first_content_published, "First content")}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="gradient-card rounded-xl border border-border p-5 mb-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-1">Commission</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Earned on venues that are still live after the qualifying period — not on signups. Rates in Admin → Sales Scoring.
              </p>
              {commissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing qualifying yet — no venue has posted a first offer.</p>
              ) : (
                <div className="space-y-2">
                  {commissionByRep.map(({ repId, earned, pending, venues: venueCount }) => (
                    <div key={repId} className="flex items-center justify-between text-sm border-b border-border/50 pb-1.5 last:border-0">
                      <span className="text-foreground">{owners[repId] ?? "Unnamed"}</span>
                      <span className="text-muted-foreground">
                        {venueCount} venue{venueCount === 1 ? "" : "s"} ·{" "}
                        <strong className="text-success">${earned.toLocaleString()} earned</strong>
                        {pending > 0 && <> · ${pending.toLocaleString()} still maturing</>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
