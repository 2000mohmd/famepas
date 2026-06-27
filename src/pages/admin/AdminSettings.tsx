import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface ToggleDef {
  key: string;
  title: string;
  description: string;
  default: boolean;
}

const TOGGLES: ToggleDef[] = [
  {
    key: "briefs_enabled",
    title: "Venue Briefs (Fiverr-style)",
    description: "When enabled, venues can post briefs and the AI matches them with influencers to invite directly.",
    default: true,
  },
  {
    key: "influencer_registration_open",
    title: "Influencer Registrations",
    description: "When disabled, new influencers cannot sign up. Existing accounts are unaffected.",
    default: true,
  },
  {
    key: "venue_registration_open",
    title: "Venue Registrations",
    description: "When disabled, new venues cannot sign up. Existing accounts are unaffected.",
    default: true,
  },
  {
    key: "maintenance_mode",
    title: "Maintenance Mode",
    description: "Shows a maintenance banner to all logged-in users across the platform.",
    default: false,
  },
];

const parseBool = (v: any, d: boolean) => {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return d;
};

const AdminSettings = () => {
  const { toast } = useToast();
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
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Setting updated" });
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Platform <span className="text-gold">Settings</span>
        </h1>
        <p className="text-muted-foreground mb-8">Toggle features across the platform.</p>

        <div className="space-y-4">
          {TOGGLES.map((t) => (
            <div key={t.key} className="gradient-card rounded-xl border border-border p-6 flex items-center justify-between gap-6">
              <div>
                <h3 className="font-display text-lg text-foreground">{t.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
              </div>
              <Switch
                checked={!!values[t.key]}
                disabled={loading}
                onCheckedChange={(v) => toggle(t.key, v)}
              />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
