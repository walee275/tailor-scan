import { describe, expect, it } from "vitest";
import {
  blurFloor,
  checkBlur,
  checkExposure,
  checkFraming,
  checkStillness,
  laplacianVariance,
  meanLuma,
  standingPose,
} from "./gates";

describe("frame quality gates", () => {
  it("passes an even mid-gray frame and fails dark, harsh, and flat frames", () => {
    const mid = fill(32, 32, 128);
    const dark = fill(32, 32, 12);
    const harsh = fill(32, 32, 240);
    const sharp = edge(32, 32);

    expect(meanLuma(mid)).toBeGreaterThan(40);
    expect(meanLuma(mid)).toBeLessThan(210);
    expect(checkExposure(meanLuma(mid)).status).toBe("pass");
    expect(checkExposure(meanLuma(dark)).prompt).toContain("light is low");
    expect(checkExposure(meanLuma(harsh)).prompt).toContain("harsh");

    const flatVariance = laplacianVariance(mid, 32, 32);
    const sharpVariance = laplacianVariance(sharp, 32, 32);
    expect(flatVariance).toBeLessThan(blurFloor(32));
    expect(sharpVariance).toBeGreaterThan(blurFloor(32));
    expect(checkBlur(flatVariance, 32).status).toBe("fail");
    expect(checkBlur(sharpVariance, 32).status).toBe("pass");
    expect(checkBlur(sharpVariance, 720).status).toBe("pass");
  });

  it("asks the customer to step back or closer from the body span", () => {
    const ready = standingPose(0.12, 0.86);
    const framed = checkFraming(ready);
    expect(framed.framing.status).toBe("pass");
    expect(framed.distance.status).toBe("pass");

    const cropped = standingPose(0.005, 0.99);
    expect(checkFraming(cropped).framing.prompt).toContain("head and feet");
    expect(checkFraming(cropped).distance.status).toBe("fail");

    const far = standingPose(0.4, 0.55);
    expect(checkFraming(far).distance.prompt).toBe("Step closer.");

    expect(checkFraming(null).framing.status).toBe("pending");
  });

  it("holds a still pose and rejects a shift over 2 percent of body height", () => {
    const still = standingPose(0.12, 0.86);
    expect(checkStillness([still, still]).status).toBe("pass");

    const shifted = still.map((point) => ({ ...point, x: point.x + 0.05 }));
    expect(checkStillness([still, shifted]).prompt).toBe("Hold still.");
    expect(checkStillness([still]).status).toBe("pending");
  });
});

function fill(width: number, height: number, value: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < rgba.length; index += 4) {
    rgba[index] = value;
    rgba[index + 1] = value;
    rgba[index + 2] = value;
    rgba[index + 3] = 255;
  }
  return rgba;
}

function edge(width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const value = x < width / 2 ? 0 : 255;
      rgba[offset] = value;
      rgba[offset + 1] = value;
      rgba[offset + 2] = value;
      rgba[offset + 3] = 255;
    }
  }
  return rgba;
}
