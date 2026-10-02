import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MfaGate from "@/components/MfaGate";

/**
 * Adnan, "Signing In": "Require two-step verification for admins and sales
 * reps at minimum." Before this, MfaGate only ever *checked* 2FA for someone
 * who had already enrolled it — a required role with nothing enrolled was
 * let straight through. These lock down the two failure modes that matter:
 * a clean "nothing enrolled" answer must force setup for a required role,
 * but an actual API error must never lock someone out over our own outage.
 */
const mfa = vi.hoisted(() => ({
  listFactors: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { mfa } },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, signOut: vi.fn() }),
}));

describe("MfaGate", () => {
  beforeEach(() => {
    mfa.listFactors.mockReset();
    mfa.getAuthenticatorAssuranceLevel.mockReset();
  });

  it("forces setup for a required role with nothing enrolled", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    render(<MfaGate required><div>protected content</div></MfaGate>);
    expect(await screen.findByText(/two-factor authentication required/i)).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("lets a non-required role through with nothing enrolled", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    render(<MfaGate><div>protected content</div></MfaGate>);
    expect(await screen.findByText("protected content")).toBeInTheDocument();
  });

  it("fails open on an API error even for a required role, rather than locking them out", async () => {
    mfa.listFactors.mockResolvedValue({ data: null, error: new Error("network blip") });
    render(<MfaGate required><div>protected content</div></MfaGate>);
    expect(await screen.findByText("protected content")).toBeInTheDocument();
  });

  it("fails open when the call throws outright", async () => {
    mfa.listFactors.mockRejectedValue(new Error("boom"));
    render(<MfaGate required><div>protected content</div></MfaGate>);
    expect(await screen.findByText("protected content")).toBeInTheDocument();
  });

  it("still prompts for a code when a required role already has 2FA enrolled and needs to step up", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: "f1", status: "verified" }] }, error: null });
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null });
    render(<MfaGate required><div>protected content</div></MfaGate>);
    expect(await screen.findByText(/two-factor check/i)).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("passes a required role straight through once already at aal2", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: "f1", status: "verified" }] }, error: null });
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal2", nextLevel: "aal2" }, error: null });
    render(<MfaGate required><div>protected content</div></MfaGate>);
    expect(await screen.findByText("protected content")).toBeInTheDocument();
  });
});
