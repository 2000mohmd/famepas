import DashboardLayout from "@/components/DashboardLayout";
import { connectWithPhyllo, disconnectPhyllo, phylloEnabled, type PhylloPlatform } from "@/lib/phylloConnect";
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
import { setLanguage } from "@/i18n";
import { useTranslation } from "react-i18next";

const IGLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.2 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.2 8.8 2.2 12 2.2zm0 5.6a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4zm0 6.93a2.73 2.73 0 1 1 0-5.46 2.73 2.73 0 0 1 0 5.46zm5.34-7.1a.98.98 0 1 1-1.96 0 .98.98 0 0 1 1.96 0z" />
  </svg>
);

// Real Instagram Business Login (OAuth), separate from the venue side's
// manual-handle-only "Instagram" field in VenueSettings.tsx.
const InstagramConnectRow = () => {
  const { t } = useTranslation();
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
    if (v === "connected") toast({ title: t("creator.settings.connectedToast", { name: "Instagram" }), description: t("creator.settings.accountLinked") });
    else toast({ title: t("creator.settings.notConnectedToast", { name: "Instagram" }), description: t("creator.settings.couldNotComplete"), variant: "destructive" });
    window.history.replaceState({}, "", window.location.pathname);
    queryClient.invalidateQueries({ queryKey: ["instagram-integration"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("instagram-oauth", { body: { action: "initiate" } });
    setBusy(false);
    if (error || !data?.url) {
      toast({ title: t("creator.settings.notConnectedToast", { name: "Instagram" }), description: (data as any)?.error || error?.message || t("creator.shared.tryLater"), variant: "destructive" });
      return;
    }
    window.location.href = data.url;
  };

  const disconnect = async () => {
    if (!user) return;
    await supabase.from("social_integrations").delete().eq("influencer_id", user.id).eq("platform", "instagram");
    toast({ title: t("creator.settings.disconnected") });
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
            {social?.status === "connected" ? (social.handle ? `@${social.handle}` : t("creator.settings.connected")) : t("creator.settings.notConnected")}
          </p>
        </div>
      </div>
      {social?.status === "connected" ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-green-600"><Check className="w-4 h-4" /> {t("creator.settings.connected")}</span>
          <Button size="sm" variant="ghost" onClick={disconnect}>{t("creator.settings.disconnect")}</Button>
        </div>
      ) : (
        <Button size="sm" onClick={connect} disabled={busy}>
          {busy ? t("creator.settings.connecting") : t("creator.settings.connectName", { name: "Instagram" })}
        </Button>
      )}
    </div>
  );
};

const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.84-2.48V9.77a5.68 5.68 0 1 0 4.93 5.63V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48z" />
  </svg>
);

// Phyllo Connect: one row per platform. Replaces the two native rows below when
// Phyllo is switched on (see src/lib/phylloConnect.ts).
const PhylloConnectRow = ({ platform }: { platform: PhylloPlatform }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const name = platform === "instagram" ? "Instagram" : "TikTok";

  const { data: social } = useQuery({
    queryKey: ["phyllo-integration", platform, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("social_integrations").select("id, handle, status")
        .eq("influencer_id", user!.id).eq("platform", platform).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const refresh = () => ["phyllo-integration", "instagram-integration", "tiktok-connected", "my-profile"]
    .forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

  const connect = async () => {
    setBusy(true);
    try {
      const { handle } = await connectWithPhyllo(platform);
      toast({ title: t("creator.settings.connectedToast", { name }), description: handle ? t("creator.settings.handleLinked", { handle }) : t("creator.settings.accountLinked") });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("creator.messages.tryAgain");
      if (msg !== "CANCELLED") toast({ title: t("creator.settings.notConnectedToast", { name }), description: msg, variant: "destructive" });
    }
    setBusy(false);
    refresh();
  };

  const disconnect = async () => {
    try { await disconnectPhyllo(platform); toast({ title: t("creator.settings.disconnected") }); }
    catch (e) { toast({ title: t("creator.settings.disconnectFailed"), description: e instanceof Error ? e.message : "", variant: "destructive" }); }
    refresh();
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: platform === "instagram" ? "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" : "#000" }}>
          {platform === "instagram" ? <IGLogo /> : <TikTokLogo />}
        </div>
        <div>
          <p className="font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">
            {social?.status === "connected" ? (social.handle ? `@${social.handle}` : t("creator.settings.connected")) : platform === "instagram" ? t("creator.settings.igRequirement") : t("creator.settings.notConnected")}
          </p>
        </div>
      </div>
      {social?.status === "connected" ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-green-600"><Check className="w-4 h-4" /> {t("creator.settings.connected")}</span>
          <Button size="sm" variant="ghost" onClick={disconnect}>{t("creator.settings.disconnect")}</Button>
        </div>
      ) : (
        <Button size="sm" onClick={connect} disabled={busy}>{busy ? t("creator.settings.connecting") : t("creator.settings.connectName", { name })}</Button>
      )}
    </div>
  );
};

// Creator-side TikTok Login Kit connection (per-creator OAuth), separate from
// the venue-side TikTok link in VenueSettings.tsx.
const TikTokConnectRow = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: social } = useQuery({
    queryKey: ["tiktok-integration", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("social_integrations")
        .select("id, handle, status, connected_at")
        .eq("influencer_id", user!.id)
        .eq("platform", "tiktok")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("tiktok");
    if (!v) return;
    if (v === "connected") toast({ title: t("creator.settings.connectedToast", { name: "TikTok" }), description: t("creator.settings.accountLinked") });
    else toast({ title: t("creator.settings.notConnectedToast", { name: "TikTok" }), description: t("creator.settings.couldNotComplete"), variant: "destructive" });
    window.history.replaceState({}, "", window.location.pathname);
    queryClient.invalidateQueries({ queryKey: ["tiktok-integration"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("tiktok-oauth", { body: { action: "initiate" } });
    setBusy(false);
    if (error || !(data as any)?.url) {
      toast({ title: t("creator.settings.notConnectedToast", { name: "TikTok" }), description: (data as any)?.error || error?.message || t("creator.shared.tryLater"), variant: "destructive" });
      return;
    }
    window.location.href = (data as any).url;
  };

  const disconnect = async () => {
    if (!user) return;
    await supabase.from("social_integrations").delete().eq("influencer_id", user.id).eq("platform", "tiktok");
    toast({ title: t("creator.settings.disconnected") });
    queryClient.invalidateQueries({ queryKey: ["tiktok-integration"] });
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-foreground">
          <TikTokLogo />
        </div>
        <div>
          <p className="font-medium text-foreground">TikTok</p>
          <p className="text-xs text-muted-foreground">
            {social?.status === "connected" ? (social.handle ? `@${social.handle}` : t("creator.settings.connected")) : t("creator.settings.notConnected")}
          </p>
        </div>
      </div>
      {social?.status === "connected" ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-green-600"><Check className="w-4 h-4" /> {t("creator.settings.connected")}</span>
          <Button size="sm" variant="ghost" onClick={disconnect}>{t("creator.settings.disconnect")}</Button>
        </div>
      ) : (
        <Button size="sm" onClick={connect} disabled={busy}>
          {busy ? t("creator.settings.connecting") : t("creator.settings.connectName", { name: "TikTok" })}
        </Button>
      )}
    </div>
  );
};

const InfluencerSettings = () => {
  const { t } = useTranslation();
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
    if (error) { toast({ title: t("creator.common.error"), description: error.message, variant: "destructive" }); setTwoFA(!v); }
    else toast({ title: v ? t("creator.settings.twoFAOn") : t("creator.settings.twoFAOff") });
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

  // Adnan, "Creator Page fixes" #13: toggles save themselves, no "Save
  // Settings" click needed — same idea as toggle2FA above, generalized.
  const saveField = async (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    const { error } = await supabase.from("influencer_settings").upsert({ ...next, influencer_id: user!.id }, { onConflict: "influencer_id" });
    if (error) { toast({ title: t("creator.common.error"), description: error.message, variant: "destructive" }); setForm(form); return; }
    queryClient.invalidateQueries({ queryKey: ["influencer-settings"] });
  };

  const updateSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("influencer_settings")
        .upsert({ ...form, influencer_id: user!.id }, { onConflict: "influencer_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("creator.settings.saved") });
      queryClient.invalidateQueries({ queryKey: ["influencer-settings"] });
    },
    onError: (e: any) => toast({ title: t("creator.common.error"), description: e.message, variant: "destructive" }),
  });

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6 max-w-4xl">
        <div className="relative overflow-hidden rounded-[2rem] p-7 md:p-10 flex flex-wrap items-end justify-between gap-6 creator-hero">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] mb-3 creator-hero-eyebrow">{t("creator.settings.eyebrow")}</p>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.02] creator-hero-title">{t("nav.settings")}</h1>
            <p className="mt-3 text-base md:text-lg opacity-75 max-w-2xl">{t("creator.settings.subtitle")}</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>{t("creator.settings.connectedAccounts")}</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border">
            {phylloEnabled() ? (
              <>
                <PhylloConnectRow platform="instagram" />
                <PhylloConnectRow platform="tiktok" />
              </>
            ) : (
              <>
                <InstagramConnectRow />
                <TikTokConnectRow />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("creator.settings.notifications")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "notification_invitations" as const, label: t("creator.settings.notifInvitations") },
              { key: "notification_messages" as const, label: t("creator.settings.notifMessages") },
              { key: "notification_earnings" as const, label: t("creator.settings.notifEarnings") },
              { key: "notification_promotions" as const, label: t("creator.settings.notifPromotions") },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch checked={form[key]} onCheckedChange={(v) => saveField({ [key]: v })} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("creator.settings.privacy")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("creator.settings.showProfile")}</Label>
              <Switch checked={form.privacy_show_profile} onCheckedChange={(v) => saveField({ privacy_show_profile: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("creator.settings.showEarnings")}</Label>
              <Switch checked={form.privacy_show_earnings} onCheckedChange={(v) => saveField({ privacy_show_earnings: v })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("common.language")}</CardTitle></CardHeader>
          <CardContent>
            <Select value={form.language} onValueChange={(v) => { setLanguage(v); saveField({ language: v }); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("creator.settings.security")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("creator.settings.twoFA")}</Label>
                <p className="text-xs text-muted-foreground">{t("creator.settings.twoFAHint")}</p>
              </div>
              <Switch checked={twoFA} onCheckedChange={toggle2FA} />
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending}>
          <Save className="w-4 h-4 me-2" /> {updateSettings.isPending ? t("creator.profile.saving") : t("creator.settings.save")}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerSettings;
