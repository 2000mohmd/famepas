import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const { toast } = useToast();
  const [briefsEnabled, setBriefsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("platform_settings").select("value").eq("key", "briefs_enabled").maybeSingle();
      setBriefsEnabled(data?.value === true || (data?.value as any) === "true");
      setLoading(false);
    })();
  }, []);

  const toggle = async (next: boolean) => {
    setBriefsEnabled(next);
    const { error } = await supabase.from("platform_settings").update({ value: next as any }).eq("key", "briefs_enabled");
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: `Briefs feature ${next ? "enabled" : "disabled"}` });
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Platform <span className="text-gold">Settings</span>
        </h1>
        <p className="text-muted-foreground mb-8">Toggle features across the platform.</p>

        <div className="gradient-card rounded-xl border border-border p-6 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-foreground">Venue Briefs (Fiverr-style)</h3>
            <p className="text-sm text-muted-foreground mt-1">
              When enabled, venues can post briefs and the AI matches them with influencers to invite directly.
            </p>
          </div>
          <Switch checked={briefsEnabled} disabled={loading} onCheckedChange={toggle} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
