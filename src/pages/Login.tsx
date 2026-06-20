import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, role, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && role) {
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "venue") navigate("/venue/dashboard", { replace: true });
      else navigate("/influencer/home", { replace: true });
    }
  }, [user, role, navigate]);

  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingCreds, setPendingCreds] = useState<{ email: string; password: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
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

  const handleSocial = async (provider: "google" | "facebook") => {
    if (provider === "facebook") {
      toast({ title: "Facebook sign-in coming soon", description: "Please continue with Google or email." });
      return;
    }
    const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (error) toast({ title: "Google sign-in failed", description: String(error), variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-slate-900">
      <header className="px-8 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold text-slate-900">
            Fame<span className="text-[#b8923a]">Pass</span>
          </span>
        </Link>
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
          <UserCheck className="w-5 h-5" />
        </div>
      </header>

      <main className="flex justify-center px-4 pb-16">
        <div className="w-full max-w-xl">

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
                  <p className="text-xs text-slate-500 mt-2">We sent a code to {pendingCreds?.email}. It expires in 10 minutes.</p>
                </div>
                <button type="submit" disabled={isLoading} className="w-full h-12 rounded-lg bg-[#b8923a] hover:bg-[#9a7a30] disabled:opacity-50 text-white font-semibold transition">
                  {isLoading ? "Verifying..." : "Verify & Sign In"}
                </button>
                <button type="button" className="w-full h-12 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition" onClick={() => { setOtpRequired(false); setOtpCode(""); setPendingCreds(null); }}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  <button
                    type="button"
                    onClick={() => handleSocial("google")}
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
                  <button
                    type="button"
                    onClick={() => handleSocial("facebook")}
                    className="w-full h-12 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium flex items-center justify-center gap-2 transition"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Sign in with Facebook
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
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20 transition"
                    />
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
            <Link to="/signup/business" className="font-semibold text-[#b8923a] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
