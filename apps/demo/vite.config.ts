import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

const widgetEntry = fileURLToPath(
  new URL("../../packages/widget/src/index.ts", import.meta.url),
);

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      "@tailor-scan/widget": widgetEntry,
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        embed: fileURLToPath(new URL("embed.html", import.meta.url)),
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 43123,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 43123,
    strictPort: true,
  },
});
