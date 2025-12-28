import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Ensure CJS deps like react-dom get ESM interop and invalidate stale optimize cache
  optimizeDeps: {
    force: true,
    include: ["react", "react-dom", "react-dom/client"],
    exclude: ["react-leaflet", "@react-leaflet/core", "leaflet"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
