import { describe, it, expect } from "vitest";
import { hasAdminPermission } from "@/hooks/useAdminPermissions";

describe("hasAdminPermission", () => {
  it("allows through while permissions are still loading (null)", () => {
    expect(hasAdminPermission(null, "manage_venues")).toBe(true);
  });

  it("denies once loaded without the permission", () => {
    expect(hasAdminPermission(new Set(["manage_venues"]), "manage_billing")).toBe(false);
  });

  it("allows once loaded with the permission", () => {
    expect(hasAdminPermission(new Set(["manage_venues"]), "manage_venues")).toBe(true);
  });
});
