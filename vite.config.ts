import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // `true` listens on all addresses (IPv4 + IPv6) and works on machines with
    // IPv6 disabled, unlike the literal "::" binding.
    host: true,
    port: 8080,
    strictPort: false,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: true,
    port: 8080,
  },
  plugins: [react(), mcpPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          charts: ["recharts"],
        },
      },
    },
  },
}));
