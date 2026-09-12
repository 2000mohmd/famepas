import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const IGLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.2 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.2 8.8 2.2 12 2.2zm0 5.6a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4zm0 6.93a2.73 2.73 0 1 1 0-5.46 2.73 2.73 0 0 1 0 5.46zm5.34-7.1a.98.98 0 1 1-1.96 0 .98.98 0 0 1 1.96 0z" />
  </svg>
);

// Real Instagram Business Login (OAuth), separate from the venue side's
// manual-handle-only "Instagram" field in VenueSettings.tsx.
const InstagramConnectRow = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: social } = useQuery({
    queryKey: ["instagram-integration", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("social_integrations")
        .select("id, handle, status, connected_at")
        .eq("influencer_id", user!.id)
        .eq("platform", "instagram")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Handle ?instagram=connected coming back from /instagram/callback.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("instagram");
    if (!v) return;
    if (v === "connected") toast({ title: "Instagram connected ✓", description: "Your Instagram account is now linked." });
    else toast({ title: "Instagram error", description: "Could not complete connection.", variant: "destructive" });
    window.history.replaceState({}, "", window.location.pathname);
    queryClient.invalidateQueries({ queryKey: ["instagram-integration"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("instagram-oauth", { body: { action: "initiate" } });
    setBusy(false);
    if (error || !data?.url) {
      toast({ title: "Instagram not ready", description: (data as any)?.error || error?.message || "Try again later.", variant: "destructive" });
      return;
    }
    window.location.href = data.url;
  };

  const disconnect = async () => {
    if (!user) return;
    await supabase.from("social_integrations").delete().eq("influencer_id", user.id).eq("platform", "instagram");
    toast({ title: "Disconnected" });
    queryClient.invalidateQueries({ queryKey: ["instagram-integration"] });
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
        >
          <IGLogo />
        </div>
        <div>
          <p className="font-medium text-foreground">Instagram</p>
          <p className="text-xs text-muted-foreground">
            {social?.status === "connected" ? (social.handle ? `@${social.handle}` : "Connected") : "Not connected"}
          </p>
        </div>
      </div>
      {social?.status === "connected" ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-green-600"><Check className="w-4 h-4" /> Connected</span>
          <Button size="sm" variant="ghost" onClick={disconnect}>Disconnect</Button>
        </div>
      ) : (
        <Button size="sm" onClick={connect} disabled={busy}>
          {busy ? "Redirecting…" : "Connect Instagram"}
        </Button>
      )}
    </div>
  );
};

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
          <CardHeader><CardTitle>Connected Accounts</CardTitle></CardHeader>
          <CardContent>
            <InstagramConnectRow />
          </CardContent>
        </Card>

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
