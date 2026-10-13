import { describe, expect, it } from "vitest";
import {
  armIsInPlane,
  compareWaistToChest,
  estimateGirth,
  estimateLambai,
  estimateSleeve,
  ramanujanCircumference,
  type ArmBones,
} from "./measure";

describe("measurement engine", () => {
  it("matches Ramanujan's second approximation on a known ellipse", () => {
    expect(ramanujanCircumference(5, 5)).toBeCloseTo(2 * Math.PI * 5, 6);
    expect(ramanujanCircumference(6, 4)).toBeCloseTo(31.7309, 4);
  });

  it("widens girth on the high side when clothing is loose and does not clamp a flagged chest", () => {
    const shared = {
      id: "chhati" as const,
      widthCm: 32,
      depthCm: 22,
      onEdge: false,
    };
    const close = estimateGirth(shared, {
      clothingFit: "close",
      calibration: "height-only",
      frontOnly: false,
    });
    const loose = estimateGirth(shared, {
      clothingFit: "loose",
      calibration: "height-only",
      frontOnly: false,
    });
    expect(loose.valueCm).toBe(close.valueCm);
    expect(loose.rangeCm[0]).toBe(close.rangeCm[0]);
    expect(loose.rangeCm[1] - close.rangeCm[1]).toBeCloseTo(3, 5);
    expect(loose.confidence).toBe("low");

    const narrow = estimateGirth(
      { id: "chhati", widthCm: 16, depthCm: 12, onEdge: false },
      { clothingFit: "close", calibration: "height-only", frontOnly: false },
    );
    expect(narrow.valueCm).toBeLessThan(60);
    expect(narrow.confidence).toBe("low");
    expect(narrow.warnings.join(" ")).toContain("not clamped");
  });

  it("uses a depth prior and a wider range when the side view is skipped", () => {
    const twoView = estimateGirth(
      { id: "chhati", widthCm: 36, depthCm: 36 * 0.7, onEdge: false },
      { clothingFit: "close", calibration: "height-only", frontOnly: false },
    );
    const front = estimateGirth(
      { id: "chhati", widthCm: 36, depthCm: null, onEdge: false },
      { clothingFit: "close", calibration: "height-only", frontOnly: true },
    );
    expect(front.method).toBe("ellipse-front-only");
    expect(front.valueCm).toBe(twoView.valueCm);
    expect(front.rangeCm[1] - front.rangeCm[0]).toBeGreaterThan(twoView.rangeCm[1] - twoView.rangeCm[0] + 7);
    expect(compareWaistToChest(100, 80)).toContain("hip");
  });

  it("scales sleeve and length by 2% when the entered height is 2% high", () => {
    const bones = arm(30, 25);
    const base = estimateSleeve({
      enteredHeightCm: 170,
      worldStatureCm: 170,
      left: bones,
      right: bones,
      leftPixelCm: 55,
      rightPixelCm: 55,
      leftInPlane: true,
      rightInPlane: true,
      shoulderWidthCm: 40,
      sleevePath: "shoulder-to-wrist",
      calibration: "height-only",
    });
    const high = estimateSleeve({
      enteredHeightCm: 170 * 1.02,
      worldStatureCm: 170,
      left: bones,
      right: bones,
      leftPixelCm: 55 * 1.02,
      rightPixelCm: 55 * 1.02,
      leftInPlane: true,
      rightInPlane: true,
      shoulderWidthCm: 40,
      sleevePath: "shoulder-to-wrist",
      calibration: "height-only",
    });
    expect(base.valueCm).toBeCloseTo(55, 1);
    expect(high.valueCm).toBeCloseTo(base.valueCm * 1.02, 1);

    const length = estimateLambai({
      napeY: 100,
      hemY: 600,
      frontScaleCmPerPx: 0.2,
      calibration: "height-only",
    });
    const longer = estimateLambai({
      napeY: 100,
      hemY: 600,
      frontScaleCmPerPx: 0.2 * 1.02,
      calibration: "height-only",
    });
    expect(length.valueCm).toBeCloseTo(100, 1);
    expect(longer.valueCm).toBeCloseTo(length.valueCm * 1.02, 1);
  });

  it("prefers the flat sleeve in plane and the posed sleeve out of plane", () => {
    const posed = arm(32, 28);
    const flat = estimateSleeve({
      enteredHeightCm: 170,
      worldStatureCm: 170,
      left: posed,
      right: posed,
      leftPixelCm: 48,
      rightPixelCm: 48,
      leftInPlane: true,
      rightInPlane: true,
      shoulderWidthCm: 38,
      sleevePath: "shoulder-to-wrist",
      calibration: "height-only",
    });
    expect(flat.method).toBe("in-plane-pixels");
    expect(flat.valueCm).toBeCloseTo(48, 1);
    expect(flat.confidence).toBe("low");

    const turned = estimateSleeve({
      enteredHeightCm: 170,
      worldStatureCm: 170,
      left: posed,
      right: posed,
      leftPixelCm: 48,
      rightPixelCm: 48,
      leftInPlane: false,
      rightInPlane: false,
      shoulderWidthCm: 38,
      sleevePath: "shoulder-to-wrist",
      calibration: "height-only",
    });
    expect(turned.method).toBe("scaled-world-bones");
    expect(turned.valueCm).toBeCloseTo(60, 1);
    expect(armIsInPlane(arm(10, 10, 0))).toBe(true);
    expect(armIsInPlane(arm(10, 10, 8))).toBe(false);
  });
});

function arm(upper: number, lower: number, depth = 0): ArmBones {
  return {
    shoulder: { x: 0, y: 0, z: 0 },
    elbow: { x: upper, y: 0, z: depth / 2 },
    wrist: { x: upper + lower, y: 0, z: depth },
  };
}
