import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_SCORE_CONFIG, type ScoreConfig } from "@/pages/sales/leadMeta";

const db = supabase as any;

const WEIGHT_LABELS: { key: keyof ScoreConfig["weights"]; labelKey: string }[] = [
  { key: "category", labelKey: "admin.salesConfig.categoryFit" },
  { key: "area", labelKey: "admin.salesConfig.areaFit" },
  { key: "google_rating", labelKey: "admin.salesConfig.googleRating" },
  { key: "google_reviews", labelKey: "admin.salesConfig.googleReviewCount" },
  { key: "instagram_followers", labelKey: "admin.salesConfig.instagramFollowers" },
  { key: "price_level", labelKey: "admin.salesConfig.priceLevel" },
];

const AdminSalesConfig = () => {
  const { role } = useAuth();
  const { t } = useTranslation();
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
  const [targets, setTargets] = useState({ weekly_signings: 12, annual_live_venues: 500 });
  const [savingTargets, setSavingTargets] = useState(false);

  const saveTargets = async () => {
    setSavingTargets(true);
    const { error } = await supabase.from("platform_settings")
      .update({ value: targets as any }).eq("key", "sales_targets");
    setSavingTargets(false);
    if (error) { toast({ title: t("admin.salesConfig.couldntSave"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("admin.salesConfig.targetsUpdated") });
  };

  const saveCommission = async () => {
    setSavingCommission(true);
    const { error } = await supabase.from("platform_settings")
      .update({ value: commission as any }).eq("key", "sales_commission");
    setSavingCommission(false);
    if (error) { toast({ title: t("admin.salesConfig.couldntSave"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("admin.salesConfig.commissionUpdated") });
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
    supabase.from("platform_settings").select("value").eq("key", "sales_targets").maybeSingle()
      .then(({ data }) => { if (data?.value) setTargets(data.value as any); });
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
    if (error) { toast({ title: t("admin.salesConfig.couldntSave"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("admin.salesConfig.scoringUpdated"), description: t("admin.salesConfig.scoringUpdatedDesc") });
  };

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const addTerritory = async () => {
    if (!newTerritory.area || !newTerritory.rep_id) return;
    const { error } = await db.from("sales_territories")
      .upsert({ area: newTerritory.area, rep_id: newTerritory.rep_id, updated_at: new Date().toISOString() });
    if (error) { toast({ title: t("admin.salesConfig.couldntSaveTerritory"), description: error.message, variant: "destructive" }); return; }
    setNewTerritory({ area: "", rep_id: "" });
    void loadTerritories();
  };

  const removeTerritory = async (area: string) => {
    await db.from("sales_territories").delete().eq("area", area);
    void loadTerritories();
  };

  const repName = (id: string) => reps.find((r) => r.user_id === id)?.full_name ?? t("admin.auditLog.unknown");

  return (
    <DashboardLayout type={role === "admin" ? "admin" : "sales"}>
      <div className="animate-fade-in max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-1">
          {t("admin.salesConfig.titlePrefix")} <span className="text-gold">{t("admin.salesConfig.titleAccent")}</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          {t("admin.salesConfig.subtitle")}
        </p>

        <div className="gradient-card rounded-xl border border-border p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">{t("admin.salesConfig.targets")}</h2>
          <p className="text-xs text-muted-foreground mb-4">{t("admin.salesConfig.targetsDesc")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label>{t("admin.salesConfig.signingsPerWeek")}</Label>
              <Input
                type="number" min="0"
                value={targets.weekly_signings}
                onChange={(e) => setTargets({ ...targets, weekly_signings: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.salesConfig.liveVenuesPerYear")}</Label>
              <Input
                type="number" min="0"
                value={targets.annual_live_venues}
                onChange={(e) => setTargets({ ...targets, annual_live_venues: Number(e.target.value) })}
              />
            </div>
          </div>
          <Button onClick={() => void saveTargets()} disabled={savingTargets} className="btn-sales-primary font-semibold">
            {savingTargets ? t("admin.events.savingEllipsis") : t("admin.salesConfig.saveTargets")}
          </Button>
        </div>

        <div className="gradient-card rounded-xl border border-border p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">{t("admin.salesConfig.leadScoring")}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {t("admin.salesConfig.weightsDesc", { total: totalWeight })}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {WEIGHT_LABELS.map(({ key, labelKey }) => (
              <div key={key} className="space-y-1.5">
                <Label>{t(labelKey)}</Label>
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
              <Label>{t("admin.salesConfig.reviewsFullScore")}</Label>
              <Input
                type="number" min="1"
                value={cfg.targets.google_reviews}
                onChange={(e) => setCfg({ ...cfg, targets: { ...cfg.targets, google_reviews: Number(e.target.value) } })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.salesConfig.followersFullScore")}</Label>
              <Input
                type="number" min="1"
                value={cfg.targets.instagram_followers}
                onChange={(e) => setCfg({ ...cfg, targets: { ...cfg.targets, instagram_followers: Number(e.target.value) } })}
              />
            </div>
          </div>

          <div className="mb-4">
            <Label className="mb-2 block">{t("admin.salesConfig.preferredCategories")}</Label>
            <p className="text-xs text-muted-foreground mb-2">
              {t("admin.salesConfig.preferredCategoriesDesc")}
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
            <Label className="mb-2 block">{t("admin.salesConfig.preferredAreas")}</Label>
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

          <Button onClick={() => void saveWeights()} disabled={saving} className="btn-sales-primary font-semibold">
            {saving ? t("admin.events.savingEllipsis") : t("admin.salesConfig.saveScoring")}
          </Button>
        </div>

        <div className="gradient-card rounded-xl border border-border p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">{t("admin.salesConfig.commission")}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {t("admin.salesConfig.commissionDesc")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label>{t("admin.salesConfig.daysLiveQualify")}</Label>
              <Input
                type="number" min="0"
                value={commission.qualifying_days}
                onChange={(e) => setCommission({ ...commission, qualifying_days: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.salesConfig.howCalculated")}</Label>
              <Select value={commission.mode} onValueChange={(v) => setCommission({ ...commission, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">{t("admin.salesConfig.flatAmount")}</SelectItem>
                  <SelectItem value="percent">{t("admin.salesConfig.percentOfPlan")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {commission.mode === "flat" ? (
              <div className="space-y-1.5">
                <Label>{t("admin.salesConfig.amountPerVenue")}</Label>
                <Input
                  type="number" min="0"
                  value={commission.flat_amount}
                  onChange={(e) => setCommission({ ...commission, flat_amount: Number(e.target.value) })}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>{t("admin.salesConfig.percentOfPlanPrice")}</Label>
                <Input
                  type="number" min="0" max="100"
                  value={commission.percent_of_plan}
                  onChange={(e) => setCommission({ ...commission, percent_of_plan: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
          <Button onClick={() => void saveCommission()} disabled={savingCommission} className="btn-sales-primary font-semibold">
            {savingCommission ? t("admin.events.savingEllipsis") : t("admin.salesConfig.saveCommission")}
          </Button>
        </div>

        <div className="gradient-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">{t("admin.salesConfig.territories")}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {t("admin.salesConfig.territoriesDesc")}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={newTerritory.area} onValueChange={(v) => setNewTerritory({ ...newTerritory, area: v })}>
              <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder={t("admin.salesConfig.area")} /></SelectTrigger>
              <SelectContent>{areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={newTerritory.rep_id} onValueChange={(v) => setNewTerritory({ ...newTerritory, rep_id: v })}>
              <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue placeholder={t("admin.salesConfig.rep")} /></SelectTrigger>
              <SelectContent>{reps.map((r) => <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void addTerritory()} disabled={!newTerritory.area || !newTerritory.rep_id}>
              {t("admin.salesConfig.assign")}
            </Button>
          </div>

          {territories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.salesConfig.noTerritories")}</p>
          ) : (
            <div className="space-y-1.5">
              {territories.map((terr) => (
                <div key={terr.area} className="flex items-center justify-between text-sm border-b border-border/50 pb-1.5">
                  <span className="text-foreground">{terr.area}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {repName(terr.rep_id)}
                    <button onClick={() => void removeTerritory(terr.area)} aria-label={t("admin.salesConfig.removeArea", { area: terr.area })}>
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
