import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "TailorScan",
      formats: ["es", "iife"],
      fileName: (format) =>
        format === "es" ? "tailor-scan.js" : "tailor-scan.iife.js",
    },
    rollupOptions: {
      external: ["three"],
    },
    emptyOutDir: true,
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
