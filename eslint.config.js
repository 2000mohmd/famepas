import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      // Auto-generated / bundled output — not hand-maintained source.
      "src/integrations/supabase/types.ts",
      "src/integrations/supabase/previewAuthStorage.ts",
      "supabase/functions/mcp/index.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Tracked as tech debt: surfaced as warnings so CI still fails on real errors.
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // Deno edge functions: browser globals don't apply, Deno global does.
    files: ["supabase/functions/**/*.ts"],
    languageOptions: {
      globals: { ...globals.deno, Deno: "readonly" },
    },
  },
);
