import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/lib/validation";

describe("normalizePhone", () => {
  it("accepts a normal Lebanese mobile number", () => {
    expect(normalizePhone("71123456")).toBe("+96171123456");
    expect(normalizePhone("03 123 456")).toBe("+9613123456");
  });

  it("rejects a Lebanese number with too many digits (Adnan, More Fixes #27)", () => {
    expect(normalizePhone("+961703477490")).toBeNull();
  });

  it("still accepts non-Lebanese international numbers", () => {
    expect(normalizePhone("+966504584097")).toBe("+966504584097");
  });
});
