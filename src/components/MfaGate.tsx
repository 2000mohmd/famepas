import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Asks for a TOTP code when the signed-in user has 2FA enrolled but hasn't verified it this session. */
const MfaGate = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<"checking" | "ok" | "needed">("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setState(data && data.nextLevel === "aal2" && data.currentLevel !== "aal2" ? "needed" : "ok");
    })();
  }, [user?.id]);

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
