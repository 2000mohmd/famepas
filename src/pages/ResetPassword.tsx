import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wait for Supabase to process the recovery hash and establish the session
  useEffect(() => {
    // Supabase appends an error to the URL hash when a recovery link is invalid.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const err = hash.get("error_description") || hash.get("error") || query.get("error_description") || query.get("error");
    if (err) {
      setLinkError("This reset link is invalid or has expired.");
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });

    const timeout = setTimeout(() => {
      setReady((current) => {
        if (!current) setLinkError("This reset link is invalid or has expired.");
        return current;
      });
    }, 7000);

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
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
    <div className="min-h-screen bg-[#f7f5f0] text-slate-900 flex flex-col">
      <header className="px-8 py-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold">Fame<span className="text-[#b8923a]">Pass</span></span>
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
                  <div className="relative">
                    <input type={showPwd ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 pl-4 pr-16 rounded-lg border border-slate-200 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20" />
                    <button type="button" onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-[#b8923a]">
                      {showPwd ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Confirm new password</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                      className="w-full h-12 pl-4 pr-16 rounded-lg border border-slate-200 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20" />
                    <button type="button" onClick={() => setShowConfirm((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-[#b8923a]">
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <button disabled={loading} className="w-full h-12 rounded-lg bg-[#b8923a] hover:bg-[#9a7a30] disabled:opacity-50 text-white font-semibold">
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
