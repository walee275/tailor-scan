import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";

function localVisionWasm(): Plugin {
  const copy = () => {
    const target = fileURLToPath(new URL("public/vision/wasm", import.meta.url));
    const source = fileURLToPath(
      new URL("../../node_modules/@mediapipe/tasks-vision/wasm", import.meta.url),
    );
    mkdirSync(target, { recursive: true });
    cpSync(source, target, { recursive: true });
  };
  return {
    name: "local-vision-wasm",
    buildStart: copy,
    configureServer: copy,
  };
}

const widgetEntry = fileURLToPath(
  new URL("../../packages/widget/src/index.ts", import.meta.url),
);

export default defineConfig({
  plugins: [preact(), localVisionWasm()],
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
