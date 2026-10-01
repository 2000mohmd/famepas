import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { DEFAULT_SCORE_CONFIG, type ScoreConfig } from "@/pages/sales/leadMeta";

const db = supabase as any;

const WEIGHT_LABELS: { key: keyof ScoreConfig["weights"]; label: string }[] = [
  { key: "category", label: "Category fit" },
  { key: "area", label: "Area fit" },
  { key: "google_rating", label: "Google rating" },
  { key: "google_reviews", label: "Google review count" },
  { key: "instagram_followers", label: "Instagram followers" },
  { key: "price_level", label: "Price level" },
];

const AdminSalesConfig = () => {
  const [cfg, setCfg] = useState<ScoreConfig>(DEFAULT_SCORE_CONFIG);
  const [categories, setCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [reps, setReps] = useState<{ user_id: string; full_name: string }[]>([]);
  const [territories, setTerritories] = useState<{ area: string; rep_id: string }[]>([]);
  const [newTerritory, setNewTerritory] = useState({ area: "", rep_id: "" });
  const [saving, setSaving] = useState(false);
  const [commission, setCommission] = useState({
    qualifying_days: 60, mode: "flat", flat_amount: 50, percent_of_plan: 10, currency: "USD",
  });
  const [savingCommission, setSavingCommission] = useState(false);

  const saveCommission = async () => {
    setSavingCommission(true);
    const { error } = await supabase.from("platform_settings")
      .update({ value: commission as any }).eq("key", "sales_commission");
    setSavingCommission(false);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Commission rules updated" });
  };

  const loadTerritories = async () => {
    const { data } = await db.from("sales_territories").select("area, rep_id").order("area");
    setTerritories(data ?? []);
  };

  useEffect(() => {
    supabase.from("platform_settings").select("value").eq("key", "lead_score_weights").maybeSingle()
      .then(({ data }) => { if (data?.value) setCfg(data.value as unknown as ScoreConfig); });
    supabase.from("platform_settings").select("value").eq("key", "sales_commission").maybeSingle()
      .then(({ data }) => { if (data?.value) setCommission(data.value as any); });
    supabase.from("categories").select("name").eq("is_active", true).order("name")
      .then(({ data }) => setCategories((data ?? []).map((c: any) => c.name)));
    supabase.from("service_locations").select("area, city").eq("is_active", true)
      .then(({ data }) => {
        const names = (data ?? []).flatMap((l: any) => [l.area, l.city]).filter(Boolean) as string[];
        setAreas([...new Set(names)].sort());
      });
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const ids = [...new Set((roles ?? [])
        .filter((r: any) => r.role === "sales_rep" || r.role === "sales_manager")
        .map((r: any) => r.user_id))];
      if (!ids.length) return;
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids as string[]);
      setReps((profiles ?? []).map((p: any) => ({ user_id: p.user_id, full_name: p.full_name || "Unnamed" })));
    })();
    void loadTerritories();
  }, []);

  const totalWeight = Object.values(cfg.weights).reduce((a, b) => a + Number(b || 0), 0);

  const saveWeights = async () => {
    setSaving(true);
    const { error } = await supabase.from("platform_settings")
      .update({ value: cfg as any }).eq("key", "lead_score_weights");
    setSaving(false);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Scoring updated", description: "Lead scores recalculate the next time a rep opens their list." });
  };

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const addTerritory = async () => {
    if (!newTerritory.area || !newTerritory.rep_id) return;
    const { error } = await db.from("sales_territories")
      .upsert({ area: newTerritory.area, rep_id: newTerritory.rep_id, updated_at: new Date().toISOString() });
    if (error) { toast({ title: "Couldn't save territory", description: error.message, variant: "destructive" }); return; }
    setNewTerritory({ area: "", rep_id: "" });
    void loadTerritories();
  };

  const removeTerritory = async (area: string) => {
    await db.from("sales_territories").delete().eq("area", area);
    void loadTerritories();
  };

  const repName = (id: string) => reps.find((r) => r.user_id === id)?.full_name ?? "Unknown";

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-1">
          Sales <span className="text-gold">configuration</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          How leads are scored, and which rep owns which area.
        </p>

        <div className="gradient-card rounded-xl border border-border p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Lead scoring</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Weights are relative, so they don't need to add up to 100 — currently {totalWeight}.
            A lead is scored only on the fields it actually has.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {WEIGHT_LABELS.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  type="number" min="0"
                  value={cfg.weights[key]}
                  onChange={(e) => setCfg({ ...cfg, weights: { ...cfg.weights, [key]: Number(e.target.value) } })}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="space-y-1.5">
              <Label>Reviews counted as a full score</Label>
              <Input
                type="number" min="1"
                value={cfg.targets.google_reviews}
                onChange={(e) => setCfg({ ...cfg, targets: { ...cfg.targets, google_reviews: Number(e.target.value) } })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Followers counted as a full score</Label>
              <Input
                type="number" min="1"
                value={cfg.targets.instagram_followers}
                onChange={(e) => setCfg({ ...cfg, targets: { ...cfg.targets, instagram_followers: Number(e.target.value) } })}
              />
            </div>
          </div>

          <div className="mb-4">
            <Label className="mb-2 block">Preferred categories</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Pick none and category is left out of the score entirely, rather than counting against every lead.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button key={c} onClick={() => setCfg({ ...cfg, preferred_categories: toggleIn(cfg.preferred_categories, c) })}>
                  <Badge variant={cfg.preferred_categories.includes(c) ? "default" : "secondary"} className="text-[11px] cursor-pointer">
                    {c}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <Label className="mb-2 block">Preferred areas</Label>
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <button key={a} onClick={() => setCfg({ ...cfg, preferred_areas: toggleIn(cfg.preferred_areas, a) })}>
                  <Badge variant={cfg.preferred_areas.includes(a) ? "default" : "secondary"} className="text-[11px] cursor-pointer">
                    {a}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => void saveWeights()} disabled={saving} className="gradient-gold text-accent-foreground font-semibold">
            {saving ? "Saving…" : "Save scoring"}
          </Button>
        </div>

        <div className="gradient-card rounded-xl border border-border p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Commission</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Paid on venues that are still live after the qualifying period, so a signup that goes quiet doesn't earn.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label>Days live before it qualifies</Label>
              <Input
                type="number" min="0"
                value={commission.qualifying_days}
                onChange={(e) => setCommission({ ...commission, qualifying_days: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>How it's calculated</Label>
              <Select value={commission.mode} onValueChange={(v) => setCommission({ ...commission, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat amount per venue</SelectItem>
                  <SelectItem value="percent">Percentage of their plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {commission.mode === "flat" ? (
              <div className="space-y-1.5">
                <Label>Amount per venue</Label>
                <Input
                  type="number" min="0"
                  value={commission.flat_amount}
                  onChange={(e) => setCommission({ ...commission, flat_amount: Number(e.target.value) })}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Percent of plan price</Label>
                <Input
                  type="number" min="0" max="100"
                  value={commission.percent_of_plan}
                  onChange={(e) => setCommission({ ...commission, percent_of_plan: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
          <Button onClick={() => void saveCommission()} disabled={savingCommission} className="gradient-gold text-accent-foreground font-semibold">
            {savingCommission ? "Saving…" : "Save commission"}
          </Button>
        </div>

        <div className="gradient-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Territories</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Imported leads in these areas go straight to the right rep. Anything unmapped falls back to whoever runs the import.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={newTerritory.area} onValueChange={(v) => setNewTerritory({ ...newTerritory, area: v })}>
              <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder="Area" /></SelectTrigger>
              <SelectContent>{areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={newTerritory.rep_id} onValueChange={(v) => setNewTerritory({ ...newTerritory, rep_id: v })}>
              <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder="Rep" /></SelectTrigger>
              <SelectContent>{reps.map((r) => <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void addTerritory()} disabled={!newTerritory.area || !newTerritory.rep_id}>
              Assign
            </Button>
          </div>

          {territories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No territories assigned yet.</p>
          ) : (
            <div className="space-y-1.5">
              {territories.map((t) => (
                <div key={t.area} className="flex items-center justify-between text-sm border-b border-border/50 pb-1.5">
                  <span className="text-foreground">{t.area}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {repName(t.rep_id)}
                    <button onClick={() => void removeTerritory(t.area)} aria-label={`Remove ${t.area}`}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSalesConfig;
