import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

/*
 * Route: /instagram/callback
 * Registered as the redirect_uri on the Instagram app (Meta App Dashboard ->
 * Instagram -> API setup with Instagram business login). Instagram redirects
 * the browser here with ?code=...&state=... (or ?error=...access_denied if
 * the creator cancels). This page's only job is to hand that code to the
 * instagram-oauth edge function, which does the actual token exchange
 * server-side — the client never sees an Instagram access token.
 */

type Status = "waiting-for-session" | "exchanging" | "success" | "error" | "cancelled";

const InstagramCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("waiting-for-session");
  const [message, setMessage] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode / re-render guard — never exchange the same code twice
    if (authLoading) return;

    const oauthError = params.get("error");
    if (oauthError) {
      ran.current = true;
      setStatus("cancelled");
      setMessage(params.get("error_description") || "You cancelled the Instagram connection.");
      return;
    }

    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      ran.current = true;
      setStatus("error");
      setMessage("Missing code from Instagram. Please try connecting again.");
      return;
    }

    if (!user) {
      // Session hasn't hydrated from storage yet — give it a moment before
      // giving up and asking the creator to log back in.
      const t = setTimeout(() => {
        if (!user) {
          ran.current = true;
          setStatus("error");
          setMessage("Your session expired. Please log in and try connecting Instagram again.");
        }
      }, 4000);
      return () => clearTimeout(t);
    }

    ran.current = true;
    setStatus("exchanging");
    supabase.functions.invoke("instagram-oauth", { body: { action: "exchange", code, state } })
      .then(({ data, error }) => {
        if (error || !data?.success) {
          setStatus("error");
          setMessage((data as any)?.error || error?.message || "Could not complete the Instagram connection.");
          return;
        }
        setHandle(data.handle ?? null);
        setStatus("success");
        setTimeout(() => navigate("/influencer/settings?instagram=connected", { replace: true }), 1800);
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
            <h1 className="text-lg font-semibold">Connecting your Instagram…</h1>
            <p className="text-sm text-slate-500 mt-2">Hang on while we finish linking your account.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <h1 className="text-lg font-semibold">Instagram connected ✓</h1>
            <p className="text-sm text-slate-500 mt-2">
              {handle ? <>Linked as <span className="font-medium text-slate-700">@{handle}</span>.</> : "Your account is now linked."}
            </p>
            <p className="text-xs text-slate-400 mt-3">Taking you back to Settings…</p>
          </>
        )}

        {status === "cancelled" && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h1 className="text-lg font-semibold">Connection cancelled</h1>
            <p className="text-sm text-slate-500 mt-2">{message}</p>
            <Link to="/influencer/settings" className="inline-block mt-5 text-sm font-semibold text-[#b8923a] hover:underline">
              Back to Settings
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h1 className="text-lg font-semibold">Couldn't connect Instagram</h1>
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

export default InstagramCallback;
