import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      // sidebar.html must be explicitly listed as an entry so Vite bundles
      // its React app. The popup is handled automatically by CRXJS via manifest.
      input: {
        sidebar: resolve(__dirname, "sidebar.html"),
      },
    },
  },
});
