import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const InfluencerSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["influencer-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("influencer_settings").select("*").eq("influencer_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-2fa", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("two_factor_enabled").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [twoFA, setTwoFA] = useState(false);
  useEffect(() => { if (profile) setTwoFA(!!profile.two_factor_enabled); }, [profile]);

  const toggle2FA = async (v: boolean) => {
    setTwoFA(v);
    const { error } = await supabase.from("profiles").update({ two_factor_enabled: v }).eq("user_id", user!.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setTwoFA(!v); }
    else toast({ title: v ? "Two-factor login enabled" : "Two-factor login disabled" });
  };

  const [form, setForm] = useState({
    notification_invitations: true,
    notification_messages: true,
    notification_earnings: true,
    notification_promotions: false,
    privacy_show_profile: true,
    privacy_show_earnings: false,
    language: "en",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        notification_invitations: settings.notification_invitations,
        notification_messages: settings.notification_messages,
        notification_earnings: settings.notification_earnings,
        notification_promotions: settings.notification_promotions,
        privacy_show_profile: settings.privacy_show_profile,
        privacy_show_earnings: settings.privacy_show_earnings,
        language: settings.language,
      });
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("influencer_settings")
        .upsert({ ...form, influencer_id: user!.id }, { onConflict: "influencer_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({ queryKey: ["influencer-settings"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your preferences</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "notification_invitations" as const, label: "Invitation notifications" },
              { key: "notification_messages" as const, label: "Message notifications" },
              { key: "notification_earnings" as const, label: "Earnings notifications" },
              { key: "notification_promotions" as const, label: "Promotional notifications" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch checked={form[key]} onCheckedChange={(v) => setForm({ ...form, [key]: v })} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Privacy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Show profile publicly</Label>
              <Switch checked={form.privacy_show_profile} onCheckedChange={(v) => setForm({ ...form, privacy_show_profile: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show earnings publicly</Label>
              <Switch checked={form.privacy_show_earnings} onCheckedChange={(v) => setForm({ ...form, privacy_show_earnings: v })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Language</CardTitle></CardHeader>
          <CardContent>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Security</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Two-factor login (email code)</Label>
                <p className="text-xs text-muted-foreground">Require a 6-digit code sent to your email on every sign-in.</p>
              </div>
              <Switch checked={twoFA} onCheckedChange={toggle2FA} />
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending}>
          <Save className="w-4 h-4 mr-2" /> {updateSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerSettings;
