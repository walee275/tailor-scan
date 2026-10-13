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
