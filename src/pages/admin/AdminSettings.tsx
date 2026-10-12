import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface ToggleDef {
  key: string;
  titleKey: string;
  descriptionKey: string;
  default: boolean;
}

const TOGGLES: ToggleDef[] = [
  {
    key: "briefs_enabled",
    titleKey: "admin.settings.briefsTitle",
    descriptionKey: "admin.settings.briefsDesc",
    default: true,
  },
  {
    key: "influencer_registration_open",
    titleKey: "admin.settings.influencerRegTitle",
    descriptionKey: "admin.settings.influencerRegDesc",
    default: true,
  },
  {
    key: "venue_registration_open",
    titleKey: "admin.settings.venueRegTitle",
    descriptionKey: "admin.settings.venueRegDesc",
    default: true,
  },
  {
    key: "maintenance_mode",
    titleKey: "admin.settings.maintenanceTitle",
    descriptionKey: "admin.settings.maintenanceDesc",
    default: false,
  },
  {
    key: "billing_numbers_hidden",
    titleKey: "admin.settings.hideBillingTitle",
    descriptionKey: "admin.settings.hideBillingDesc",
    default: true,
  },
];

const parseBool = (v: any, d: boolean) => {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return d;
};

const AdminSettings = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", TOGGLES.map((t) => t.key));
      const map: Record<string, boolean> = {};
      TOGGLES.forEach((t) => {
        const row = (data ?? []).find((r: any) => r.key === t.key);
        map[t.key] = parseBool(row?.value, t.default);
      });
      setValues(map);
      setLoading(false);
    })();
  }, []);

  const toggle = async (key: string, next: boolean) => {
    setValues((v) => ({ ...v, [key]: next }));
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key, value: next as any }, { onConflict: "key" });
    if (error) toast({ title: t("admin.common.error"), description: error.message, variant: "destructive" });
    else toast({ title: t("admin.settings.settingUpdated") });
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          {t("admin.settings.title")} <span className="text-gold">{t("admin.settings.titleAccent")}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{t("admin.settings.subtitle")}</p>

        <div className="space-y-4">
          {TOGGLES.map((tg) => (
            <div key={tg.key} className="gradient-card rounded-xl border border-border p-6 flex items-center justify-between gap-6">
              <div>
                <h3 className="font-display text-lg text-foreground">{t(tg.titleKey)}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t(tg.descriptionKey)}</p>
              </div>
              <Switch
                checked={!!values[tg.key]}
                disabled={loading}
                onCheckedChange={(v) => toggle(tg.key, v)}
              />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
