import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't send email", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
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
            <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
            <p className="text-sm text-slate-600 mb-6">Enter your email and we'll send you a link to set a new password.</p>
            {sent ? (
              <div className="text-sm text-slate-700">
                <p className="mb-4">✅ If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox (and spam).</p>
                <Link to="/login" className="text-[#b8923a] font-semibold hover:underline">Back to sign in</Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full h-12 px-4 rounded-lg border border-slate-200 focus:outline-none focus:border-[#b8923a] focus:ring-2 focus:ring-[#b8923a]/20" />
                </div>
                <button disabled={loading} className="w-full h-12 rounded-lg bg-[#b8923a] hover:bg-[#9a7a30] disabled:opacity-50 text-white font-semibold">
                  {loading ? "Sending..." : "Send reset link"}
                </button>
                <p className="text-center text-sm text-slate-600">
                  <Link to="/login" className="text-[#b8923a] font-semibold hover:underline">Back to sign in</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
