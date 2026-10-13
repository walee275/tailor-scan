import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanErrorCodes } from "./config";
import { createManualResult } from "./manual-result";
import { bindSessionTeardown, blurHead, requestAllowed } from "./privacy";

describe("privacy", () => {
  it("allows only same-origin script, model, wasm, and pdf reads", () => {
    expect(requestAllowed("/vision/pose_landmarker_full.task", "GET")).toBe(true);
    expect(requestAllowed("/vision/wasm/vision_wasm_internal.wasm", "GET")).toBe(true);
    expect(requestAllowed("/tailor-scan.iife.js", "GET")).toBe(true);
    expect(requestAllowed("/sheets/tailor-scan-a4.pdf", "HEAD")).toBe(true);
    expect(requestAllowed("https://shop.example/upload", "POST")).toBe(false);
    expect(requestAllowed("https://cdn.example/tracker.js", "GET")).toBe(false);
    expect(requestAllowed("https://shop.example/notes.txt", "GET")).toBe(false);
  });

  it("stops the camera when the page is hidden", () => {
    let stops = 0;
    const unbind = bindSessionTeardown(() => {
      stops += 1;
    });
    window.dispatchEvent(new Event("pagehide"));
    expect(stops).toBe(1);
    unbind();
    window.dispatchEvent(new Event("pagehide"));
    expect(stops).toBe(1);
  });

  it("replaces the face with a flat color and leaves the body alone", () => {
    const pixels = new Uint8ClampedArray([
      10, 0, 0, 255, 30, 0, 0, 255, 7, 8, 9, 255,
    ]);
    blurHead(pixels, 3, 1, { x: 0.5, y: 0, radius: 1 });
    expect(pixels[0]).toBe(20);
    expect(pixels[4]).toBe(20);
    expect(pixels[8]).toBe(7);
    expect(pixels[9]).toBe(8);
  });

  it("leaves keypoints out unless the shop asks, and names the error codes", () => {
    const result = createManualResult({
      sessionId: "privacy",
      displayUnits: "cm",
      garment: "shirt",
      heightCm: 170,
      clothingFit: "close",
      chhati: 96,
      kamar: 80,
      baazu: 62,
      lambai: 72,
    });
    expect(result.privacy.keypointsIncluded).toBe(false);
    expect(result.privacy.imagesLeftDevice).toBe(false);
    expect(scanErrorCodes).toEqual([
      "camera-denied",
      "camera-missing",
      "model-load-failed",
      "unsupported-browser",
      "session-superseded",
    ]);
    const source = readTree(join(process.cwd(), "src"));
    expect(source).not.toContain("MediaRecorder");
    expect(source).not.toContain("sendBeacon");
  });
});

function readTree(directory: string): string {
  return readdirSync(directory)
    .flatMap((name) => {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        return [readTree(path)];
      }
      return name.endsWith(".ts") || name.endsWith(".tsx")
        ? name.endsWith(".test.ts") || name.endsWith(".test.tsx")
          ? []
          : [readFileSync(path, "utf8")]
        : [];
    })
    .join("\n");
}
