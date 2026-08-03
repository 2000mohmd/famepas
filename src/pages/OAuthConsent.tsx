import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="min-h-screen bg-[#f7f5f0] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <span className="font-display text-2xl font-bold text-slate-900">
          Fame<span className="text-[#b8923a]">Pass</span>
        </span>

        {error ? (
          <>
            <h1 className="mt-6 text-xl font-bold text-slate-900">Authorization failed</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </>
        ) : !details ? (
          <p className="mt-6 text-sm text-slate-600">Loading…</p>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-bold text-slate-900">Connect {clientName} to your account</h1>
            <p className="mt-2 text-sm text-slate-600">
              This lets {clientName} read and act on FamePass data as you. You can revoke access at any time.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 h-12 rounded-lg bg-[#b8923a] hover:bg-[#9a7a30] disabled:opacity-50 text-white font-semibold transition"
              >
                {busy ? "Working…" : "Approve"}
              </button>
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 h-12 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition"
              >
                Deny
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default OAuthConsent;
