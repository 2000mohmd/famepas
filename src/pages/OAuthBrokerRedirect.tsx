import { useEffect, useState } from "react";

const LOVABLE_OAUTH_BROKER = "https://oauth.lovable.app/initiate";

/**
 * Forwards /~oauth/initiate to Lovable's real OAuth broker.
 *
 * @lovable.dev/cloud-auth-js always navigates to this exact relative path
 * (DEFAULT_OAUTH_BROKER_URL) expecting the hosting edge to proxy it there.
 * On the famepass.app custom domain that proxy rule doesn't exist, so the
 * request 200s the SPA instead and falls through to the 404 page — while
 * the same path on any *.lovable.app domain correctly 302s to this broker.
 * This route closes that gap in the client rather than in DNS/edge config.
 */
const OAuthBrokerRedirect = () => {
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("provider")) {
      setError(true);
      return;
    }
    window.location.replace(`${LOVABLE_OAUTH_BROKER}?${params.toString()}`);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold text-foreground mb-2">Sign-in link is incomplete</p>
          <p className="text-muted-foreground text-sm mb-4">
            This sign-in link is missing information and can't continue. Please go back and try signing in again.
          </p>
          <a href="/login" className="text-gold underline">Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-pulse font-display text-xl text-gold">Redirecting to sign in…</div>
    </div>
  );
};

export default OAuthBrokerRedirect;
