import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MfaSettings from "@/components/admin/MfaSettings";
import { ShieldAlert } from "lucide-react";

/**
 * Enforces 2FA where it's required (admin, sales_manager, sales_rep —
 * Adnan, "Signing In": "Require two-step verification for admins and sales
 * reps at minimum"), instead of merely prompting when the user already
 * happens to have it enrolled. A required role with no verified factor is
 * walked through setup before the app renders at all, rather than let
 * through silently the way the old check-only version did.
 */
const MfaGate = ({ children, required = false }: { children: ReactNode; required?: boolean }) => {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<"checking" | "ok" | "needed" | "setup">("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const check = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) { setState("ok"); return; } // API error: fail open, never block on our own outage.
      const hasVerified = (data?.totp ?? []).some((f) => f.status === "verified");
      if (!hasVerified) {
        // A clean answer of "nothing enrolled" is the only thing that should
        // force setup — distinct from an error, which must never lock
        // someone out over a transient API problem.
        setState(required ? "setup" : "ok");
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setState(aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2" ? "needed" : "ok");
    } catch {
      setState("ok");
    }
  };

  useEffect(() => { void check(); }, [user?.id]);

  const verify = async () => {
    setBusy(true); setError("");
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.find((f) => f.status === "verified");
    if (!factor) { setState("ok"); setBusy(false); return; }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    setBusy(false);
    if (error) setError("That code didn't work. Try the latest code from your app.");
    else setState("ok");
  };

  if (state === "checking") return null;
  if (state === "ok") return <>{children}</>;

  if (state === "setup") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-start gap-2 text-foreground">
            <ShieldAlert className="w-5 h-5 text-gold mt-0.5 shrink-0" />
            <div>
              <h1 className="font-display text-2xl">Two-factor authentication required</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your role requires it before you can continue. It takes under a minute.
              </p>
            </div>
          </div>
          <MfaSettings onEnrolled={() => void check()} />
          <Button variant="ghost" className="w-full" onClick={() => signOut()}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="gradient-card rounded-xl border border-border p-8 w-full max-w-sm space-y-4">
        <h1 className="font-display text-2xl text-foreground">Two-factor check</h1>
        <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
        <Input inputMode="numeric" maxLength={6} placeholder="123456" value={code}
          onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verify()} autoFocus />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={verify} disabled={busy || code.trim().length !== 6}>Verify</Button>
        <Button variant="ghost" className="w-full" onClick={() => signOut()}>Sign out</Button>
      </div>
    </div>
  );
};

export default MfaGate;
