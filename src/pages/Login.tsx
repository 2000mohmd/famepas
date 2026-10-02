import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { roleHome } from "@/lib/roleHome";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import heroBrand from "@/assets/hero-brand.jpg";

const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const { signIn, role, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const nextParam = safeNext(params.get("next"));
  const stored = sessionStorage.getItem("postLoginRedirect");
  const next = nextParam ?? safeNext(stored);

  useEffect(() => {
    if (user && role) {
      sessionStorage.removeItem("postLoginRedirect");
      navigate(next || roleHome(role), { replace: true });
    }
  }, [user, role, navigate, next]);

  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Credentials are verified server-side before any code is emailed.
      const otpRes = await supabase.functions.invoke("login-otp", { body: { action: "send", email, password } });
      let payload: any = otpRes.data ?? null;
      if (otpRes.error) {
        try {
          const ctx: any = (otpRes.error as any).context;
          if (ctx && typeof ctx.json === "function") payload = await ctx.json();
        } catch { /* ignore */ }
      }
      if (payload?.error) {
        toast({ title: "Login failed", description: payload.error, variant: "destructive" });
        return;
      }
      if (payload?.twoFactor) {
        setOtpRequired(true);
        toast({ title: "Verification code sent", description: "Check your email for the 6-digit code." });
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
    setIsLoading(true);
    const verify = await supabase.functions.invoke("login-otp", { body: { action: "verify", email, code: otpCode } });
    if (verify.error || verify.data?.error) {
      toast({ title: "Invalid code", description: verify.data?.error || "Try again", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    else { setOtpRequired(false); setOtpCode(""); }
  };


  const handleSocial = async () => {
    if (next) sessionStorage.setItem("postLoginRedirect", next);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/login`,
    });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: result.error.message, variant: "destructive" });
    }
  };


  return (
    <div className="min-h-screen bg-[#f7f5f0] text-slate-900 lg:grid lg:grid-cols-2">
      <div
        className="hidden lg:flex relative flex-col justify-between p-12 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBrand})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(262_42%_22%)]/90 via-[hsl(262_42%_28%)]/70 to-black/50" />
        <Link to="/" className="relative z-10 flex items-center gap-2">
          <span className="font-display text-3xl font-bold text-white">
            Fame<span className="text-[#d9b05c]">Pass</span>
          </span>
        </Link>
        <p className="relative z-10 font-display text-3xl text-white max-w-sm leading-snug">
          Where creators and venues make fame happen.
        </p>
      </div>

      <main className="flex justify-center items-center px-4 py-12 lg:py-16">
        <div className="w-full max-w-xl">
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <span className="font-display text-3xl font-bold text-slate-900">
              Fame<span className="text-[#b8923a]">Pass</span>
            </span>
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-6">Welcome back to FamePass</h1>

            {otpRequired ? (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Verification code</label>
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="6-digit code"
                    required
                    maxLength={6}
                    className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-center tracking-widest text-lg focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20"
                  />
                  <p className="text-xs text-slate-500 mt-2">We sent a code to {email}. It expires in 10 minutes.</p>
                </div>
                <button type="submit" disabled={isLoading} className="w-full h-12 rounded-lg bg-[#b8923a] hover:bg-[#9a7a30] disabled:opacity-50 text-white font-semibold transition">
                  {isLoading ? "Verifying..." : "Verify & Sign In"}
                </button>
                <button type="button" className="w-full h-12 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition" onClick={() => { setOtpRequired(false); setOtpCode(""); }}>

                  Cancel
                </button>
              </form>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  <button
                    type="button"
                    onClick={handleSocial}
                    className="w-full h-12 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium flex items-center justify-center gap-2 transition"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign in with Google
                  </button>
                </div>


                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-400">OR</span></div>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      required
                      className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full h-12 pl-4 pr-16 rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-[#b8923a]"
                      >
                        {showPwd ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end -mt-2">
                    <Link to="/forgot-password" className="text-sm font-semibold text-[#b8923a] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-lg bg-[#b8923a] hover:bg-[#9a7a30] disabled:opacity-50 text-white font-semibold transition"
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-[#b8923a] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
