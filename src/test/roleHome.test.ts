import { describe, it, expect } from "vitest";
import { roleHome } from "@/lib/roleHome";

describe("roleHome", () => {
  it("sends every role to a page that role is actually allowed to open", () => {
    expect(roleHome("admin")).toBe("/admin");
    expect(roleHome("sales_manager")).toBe("/sales");
    expect(roleHome("sales_rep")).toBe("/sales");
    expect(roleHome("venue")).toBe("/venue");
    expect(roleHome("influencer")).toBe("/influencer/home");
  });

  it("never sends sales staff to a creator page", () => {
    // The original bug: sales roles fell through to /influencer/home, which
    // ProtectedRoute rejected, bouncing them out to the public landing page.
    expect(roleHome("sales_manager")).not.toContain("influencer");
    expect(roleHome("sales_rep")).not.toContain("influencer");
  });

  it("falls back to the public welcome page for no role", () => {
    expect(roleHome(null)).toBe("/welcome");
    expect(roleHome(undefined)).toBe("/welcome");
    expect(roleHome("some_future_role")).toBe("/welcome");
  });
});
