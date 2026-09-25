import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";

type Factor = { id: string; status: string; friendly_name?: string };

const MfaSettings = () => {
  const { toast } = useToast();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  };
  useEffect(() => { load(); }, []);

  const verified = factors.filter((f) => f.status === "verified");

  const start = async () => {
    setBusy(true);
    // Clean up abandoned, unverified enrollments first
    for (const f of factors.filter((f) => f.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
    setBusy(false);
    if (error) return toast({ title: "Couldn't start setup", description: error.message, variant: "destructive" });
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirm = async () => {
    if (!enroll) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) return toast({ title: "Invalid code", description: error.message, variant: "destructive" });
    toast({ title: "Two-factor authentication enabled" });
    setEnroll(null); setCode(""); load();
  };

  const disable = async (id: string) => {
    if (!confirmDialog()) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Two-factor authentication disabled" });
    load();
  };
  const confirmDialog = () => window.confirm("Turn off two-factor authentication for your account?");

  return (
    <div className="gradient-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-gold mt-1" />
        <div>
          <h3 className="font-display text-lg text-foreground">Two-Factor Authentication (your account)</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Use an authenticator app (Google Authenticator, 1Password, Authy) for a 6-digit code at every sign-in.
          </p>
        </div>
      </div>

      {verified.length > 0 && !enroll && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Enabled</span>
          <Button variant="outline" size="sm" onClick={() => disable(verified[0].id)}>Turn off</Button>
        </div>
      )}

      {verified.length === 0 && !enroll && (
        <Button onClick={start} disabled={busy} className="bg-gold text-background hover:bg-gold/90">Set up 2FA</Button>
      )}

      {enroll && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app, then enter the 6-digit code.</p>
          <img src={enroll.qr} alt="2FA QR code" className="w-44 h-44 bg-background rounded p-2" />
          <p className="text-xs text-muted-foreground break-all">Or enter manually: <code>{enroll.secret}</code></p>
          <div className="flex gap-2 max-w-xs">
            <Input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button onClick={confirm} disabled={busy || code.trim().length !== 6}>Verify</Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setEnroll(null); setCode(""); }}>Cancel</Button>
        </div>
      )}
    </div>
  );
};

export default MfaSettings;
