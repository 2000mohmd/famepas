import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import famepassLogo from "@/assets/famepass-logo.png";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wait for Supabase to process the recovery hash and establish the session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" }); return; }
    if (password !== confirm) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast({ title: "Couldn't update password", description: error.message, variant: "destructive" }); return; }
    await supabase.auth.signOut();
    toast({ title: "Password updated", description: "Please sign in with your new password." });
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#fff5f3] text-slate-900 flex flex-col">
      <header className="px-8 py-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={famepassLogo} alt="FamePass" className="w-9 h-9 rounded-lg" />
          <span className="font-display text-2xl font-bold">Fame<span className="text-[#ec4178]">Pass</span></span>
        </Link>
      </header>
      <main className="flex-1 flex justify-center px-4 pb-16">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <h1 className="text-2xl font-bold mb-2">Set a new password</h1>
            <p className="text-sm text-slate-600 mb-6">Choose a strong password (at least 8 characters).</p>
            {!ready ? (
              <p className="text-sm text-slate-600">Verifying your reset link…</p>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">New password</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg border border-slate-200 focus:outline-none focus:border-[#ec4178] focus:ring-2 focus:ring-[#ec4178]/20" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Confirm new password</label>
                  <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg border border-slate-200 focus:outline-none focus:border-[#ec4178] focus:ring-2 focus:ring-[#ec4178]/20" />
                </div>
                <button disabled={loading} className="w-full h-12 rounded-lg bg-[#ec4178] hover:bg-[#d83669] disabled:opacity-50 text-white font-semibold">
                  {loading ? "Updating..." : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
