import { defineConfig } from "vite";

// Relative base so the built site works at https://<user>.github.io/moon-tonight/
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    // three.js is ~500 kB on its own; it loads in a separate chunk after the page appears.
    chunkSizeWarningLimit: 600,
  },
});
