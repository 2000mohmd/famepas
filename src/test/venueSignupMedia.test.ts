import { describe, it, expect } from "vitest";
import { isVenueMediaComplete } from "@/lib/validation";

describe("venue signup mandatory media (B6)", () => {
  it("requires a logo", () => {
    expect(isVenueMediaComplete({ hasLogo: false, photoCount: 3, instagram: "famepass" })).toBe(false);
  });
  it("requires at least 3 photos", () => {
    expect(isVenueMediaComplete({ hasLogo: true, photoCount: 2, instagram: "famepass" })).toBe(false);
    expect(isVenueMediaComplete({ hasLogo: true, photoCount: 3, instagram: "famepass" })).toBe(true);
  });
  it("requires a valid Instagram handle, accepting @ and profile URLs", () => {
    expect(isVenueMediaComplete({ hasLogo: true, photoCount: 3, instagram: "" })).toBe(false);
    expect(isVenueMediaComplete({ hasLogo: true, photoCount: 3, instagram: "not a handle" })).toBe(false);
    expect(isVenueMediaComplete({ hasLogo: true, photoCount: 3, instagram: "@cafe.beirut" })).toBe(true);
    expect(isVenueMediaComplete({ hasLogo: true, photoCount: 3, instagram: "https://instagram.com/cafe_beirut/" })).toBe(true);
  });
});
