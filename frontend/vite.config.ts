import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For local dev without Docker, proxy API calls to a running gateway.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8080" } },
});
