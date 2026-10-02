import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import OAuthBrokerRedirect from "@/pages/OAuthBrokerRedirect";

/**
 * Regression test for the famepass.app Google sign-in 404: the custom domain
 * doesn't proxy /~oauth/initiate to Lovable's broker the way *.lovable.app
 * does, so @lovable.dev/cloud-auth-js's redirect fell through to the SPA's
 * 404 page. This route forwards the request itself.
 */
describe("OAuthBrokerRedirect", () => {
  const replace = vi.fn();

  const setSearch = (search: string) => {
    // jsdom's real `location.replace` throws "Not implemented" and its
    // `location` property isn't directly spy-able, so the whole object is
    // swapped for one the component reads `.search` from and calls our mock
    // `.replace` on.
    Object.defineProperty(window, "location", {
      value: { ...window.location, search, replace },
      writable: true,
    });
  };

  beforeEach(() => {
    replace.mockClear();
  });

  it("forwards a valid provider straight to Lovable's real OAuth broker", async () => {
    setSearch("?provider=google&state=abc123");
    render(<OAuthBrokerRedirect />);
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    const target = replace.mock.calls[0][0] as string;
    expect(target.startsWith("https://oauth.lovable.app/initiate?")).toBe(true);
    expect(target).toContain("provider=google");
    expect(target).toContain("state=abc123");
  });

  it("shows an error instead of silently redirecting when provider is missing", async () => {
    setSearch("");
    render(<OAuthBrokerRedirect />);
    expect(await screen.findByText(/sign-in link is incomplete/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
