import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { agentPlugin } from "./agent/vite-plugin.ts";

export default defineConfig({
  plugins: [react(), tailwindcss(), agentPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // The agent rewrites deck.json and assets while it works; temp files are not part of the app.
    watch: { ignored: ["**/*.tmp", "**/output/**"] },
  },
});
