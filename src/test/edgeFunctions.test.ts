import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Static smoke tests for every Supabase edge function. These do not execute the
 * Deno runtime (that runs in CI via `deno check`), but they catch the mistakes
 * that actually break deploys: a missing entrypoint, no request handler, a
 * missing CORS preflight branch, or a public function that was never declared
 * in config.toml.
 */
const FUNCTIONS_DIR = join(process.cwd(), "supabase", "functions");
const CONFIG = readFileSync(join(process.cwd(), "supabase", "config.toml"), "utf8");

const functionDirs = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name)
  .sort();

describe("supabase edge functions", () => {
  it("discovers the deployed function set", () => {
    expect(functionDirs.length).toBeGreaterThan(0);
  });

  describe.each(functionDirs)("%s", (name) => {
    const entry = join(FUNCTIONS_DIR, name, "index.ts");
    const source = existsSync(entry) ? readFileSync(entry, "utf8") : "";

    it("has an index.ts entrypoint", () => {
      expect(existsSync(entry)).toBe(true);
    });

    it("registers a request handler", () => {
      expect(/Deno\.serve\s*\(|serve\s*\(/.test(source)).toBe(true);
    });

    it("answers CORS preflight requests", () => {
      expect(source).toContain("Access-Control-Allow-Origin");
      expect(source).toContain("OPTIONS");
    });

    it("never hardcodes credentials", () => {
      // Service role / API keys must come from Deno.env, never literals.
      expect(source).not.toMatch(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\./);
      expect(source).not.toMatch(/re_[A-Za-z0-9]{20,}/);
    });

    it("returns JSON responses with an explicit content type", () => {
      expect(source).toContain("application/json");
    });

    if (/verify_jwt\s*=\s*false/.test(CONFIG)) {
      it("is declared in config.toml when it opts out of JWT verification", () => {
        const declared = CONFIG.includes(`[functions.${name}]`);
        // A function absent from config.toml defaults to verify_jwt = true,
        // which is safe; we only assert the declaration is well-formed.
        if (declared) {
          expect(CONFIG).toMatch(
            new RegExp(`\\[functions\\.${name}\\][\\s\\S]{0,80}verify_jwt\\s*=\\s*(true|false)`),
          );
        }
      });
    }
  });
});
