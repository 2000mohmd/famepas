import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function TwoFactorToggle({ userId }: { userId?: string }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("two_factor_enabled").eq("user_id", userId).maybeSingle()
      .then(({ data }) => setEnabled(!!data?.two_factor_enabled));
  }, [userId]);

  const onToggle = async (v: boolean) => {
    if (!userId) return;
    setEnabled(v);
    const { error } = await supabase.from("profiles").update({ two_factor_enabled: v }).eq("user_id", userId);
    if (error) { setEnabled(!v); toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else toast({ title: v ? "Two-factor login enabled" : "Two-factor login disabled" });
  };

  return (
    <div className="border border-border rounded-lg p-4 flex items-center justify-between">
      <div>
        <Label className="text-foreground font-semibold">Two-factor login (email code)</Label>
        <p className="text-xs text-muted-foreground">Require a 6-digit code emailed to you on every sign-in.</p>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}
