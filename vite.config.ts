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
  // Ensure CJS deps get ESM interop and invalidate stale optimize cache
  optimizeDeps: {
    force: true,
    include: ["react", "react-dom", "react-dom/client", "leaflet"],
    exclude: ["react-leaflet", "@react-leaflet/core"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      leaflet: "leaflet/dist/leaflet-src.esm.js",
    },
    dedupe: ["react", "react-dom"],
  },
}));
