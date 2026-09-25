import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

/*
 * Route: /tiktok/callback
 * Registered as a redirect URI on the TikTok Login Kit app. TikTok sends the
 * browser here with ?code=...&state=... (or ?error=...). The code is handed to
 * the tiktok-oauth edge function, which exchanges it server-side — the client
 * never sees a TikTok access token.
 */

type Status = "waiting-for-session" | "exchanging" | "success" | "error" | "cancelled";

const TikTokCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("waiting-for-session");
  const [message, setMessage] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;

    const oauthError = params.get("error");
    if (oauthError) {
      ran.current = true;
      setStatus("cancelled");
      setMessage(params.get("error_description") || "You cancelled the TikTok connection.");
      return;
    }

    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      ran.current = true;
      setStatus("error");
      setMessage("Missing code from TikTok. Please try connecting again.");
      return;
    }

    if (authLoading) return;

    if (!user) {
      const t = setTimeout(() => {
        if (!user) {
          ran.current = true;
          setStatus("error");
          setMessage("Your session expired. Please log in and try connecting TikTok again.");
        }
      }, 4000);
      return () => clearTimeout(t);
    }

    ran.current = true;
    setStatus("exchanging");
    supabase.functions.invoke("tiktok-oauth", { body: { action: "exchange", code, state } })
      .then(({ data, error }) => {
        if (error || !(data as any)?.success) {
          setStatus("error");
          setMessage((data as any)?.error || error?.message || "Could not complete the TikTok connection.");
          return;
        }
        setHandle((data as any).handle ?? null);
        setStatus("success");
        setTimeout(() => navigate("/influencer/settings?tiktok=connected", { replace: true }), 1800);
      })
      .catch((e) => {
        setStatus("error");
        setMessage(e?.message || "Unexpected error completing the connection.");
      });
  }, [authLoading, user, params, navigate]);

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <span className="font-display text-2xl font-bold text-slate-900 block mb-6">
          Fame<span className="text-[#b8923a]">Pass</span>
        </span>

        {(status === "waiting-for-session" || status === "exchanging") && (
          <>
            <Loader2 className="w-10 h-10 mx-auto text-[#b8923a] animate-spin mb-4" />
            <h1 className="text-lg font-semibold">Connecting your TikTok…</h1>
            <p className="text-sm text-slate-500 mt-2">Hang on while we finish linking your account.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <h1 className="text-lg font-semibold">TikTok connected ✓</h1>
            <p className="text-sm text-slate-500 mt-2">
              {handle ? <>Linked as <span className="font-medium text-slate-700">@{handle}</span>.</> : "Your account is now linked."}
            </p>
            <p className="text-xs text-slate-400 mt-3">Taking you back to Settings…</p>
          </>
        )}

        {(status === "cancelled" || status === "error") && (
          <>
            <XCircle className={`w-12 h-12 mx-auto mb-4 ${status === "error" ? "text-red-500" : "text-slate-400"}`} />
            <h1 className="text-lg font-semibold">
              {status === "error" ? "Couldn't connect TikTok" : "Connection cancelled"}
            </h1>
            <p className="text-sm text-slate-500 mt-2">{message}</p>
            <Link to="/influencer/settings" className="inline-block mt-5 text-sm font-semibold text-[#b8923a] hover:underline">
              Back to Settings to try again
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default TikTokCallback;
