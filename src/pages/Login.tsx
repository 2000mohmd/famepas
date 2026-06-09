import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import famepassLogo from "@/assets/famepass-logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, role, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user && role) {
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "venue") navigate("/venue", { replace: true });
      else navigate("/", { replace: true });
    }
  }, [user, role, navigate]);

  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingCreds, setPendingCreds] = useState<{ email: string; password: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Check if 2FA is enabled for this email
      const otpRes = await supabase.functions.invoke("login-otp", { body: { action: "send", email } });
      if (otpRes.data?.twoFactor) {
        setPendingCreds({ email, password });
        setOtpRequired(true);
        toast({ title: "Verification code sent", description: "Check your email for the 6-digit code." });
        setIsLoading(false);
        return;
      }
      const { error } = await signIn(email, password);
      if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCreds) return;
    setIsLoading(true);
    const verify = await supabase.functions.invoke("login-otp", { body: { action: "verify", email: pendingCreds.email, code: otpCode } });
    if (verify.error || verify.data?.error) {
      toast({ title: "Invalid code", description: verify.data?.error || "Try again", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const { error } = await signIn(pendingCreds.email, pendingCreds.password);
    setIsLoading(false);
    if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    else { setOtpRequired(false); setOtpCode(""); setPendingCreds(null); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-auto py-8">
      <div className="fixed inset-0 gradient-purple opacity-20 pointer-events-none" />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass rounded-2xl p-8 glow-purple animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <img src={famepassLogo} alt="Fame Pass" className="w-24 h-24 rounded-2xl mb-4 border-2 border-gold/30" />
            <h1 className="text-2xl font-display font-bold text-foreground">
              Fame<span className="text-gold">Pass</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Management Portal</p>
          </div>

          <div className="w-full">
            <div className="mt-0">
              {otpRequired ? (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm">Verification code</Label>
                    <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="6-digit code" required maxLength={6} className="bg-secondary border-border text-center tracking-widest text-lg" />
                    <p className="text-xs text-muted-foreground">We sent a code to {pendingCreds?.email}. It expires in 10 minutes.</p>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full gradient-gold text-accent-foreground font-semibold">
                    {isLoading ? "Verifying..." : "Verify & Sign In"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setOtpRequired(false); setOtpCode(""); setPendingCreds(null); }}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-muted-foreground text-sm">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required className="bg-secondary border-border focus:border-gold/50 focus:ring-gold/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-muted-foreground text-sm">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="bg-secondary border-border focus:border-gold/50 focus:ring-gold/20" />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full gradient-gold text-accent-foreground font-semibold hover:opacity-90 transition-opacity">
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>

              <div className="space-y-2">
                <Button type="button" variant="outline" className="w-full border-border hover:bg-secondary" onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                  if (error) toast({ title: "Google sign-in failed", description: String(error), variant: "destructive" });
                }}>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </Button>

                <Button type="button" variant="outline" className="w-full border-border hover:bg-secondary" onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
                  if (error) toast({ title: "Apple sign-in failed", description: String(error), variant: "destructive" });
                }}>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Sign in with Apple
                </Button>
              </div>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                New business?{" "}
                <button type="button" onClick={() => navigate("/signup/business")} className="font-semibold text-gold hover:underline">
                  Create a venue account
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
