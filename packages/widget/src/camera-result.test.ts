import { describe, expect, it } from "vitest";
import { createCameraResult } from "./camera-result";
import { recordedSample } from "./recorded-pose";

describe("camera result", () => {
  it("turns a recorded front and side pose into estimated centimeters", () => {
    const result = createCameraResult({
      sessionId: "recorded",
      displayUnits: "cm",
      garment: "kurta",
      heightCm: 170,
      clothingFit: "close",
      front: recordedSample("front", 1),
      side: recordedSample("side", 2),
    });
    expect(result).not.toBeNull();
    expect(result?.measurements.map((measurement) => measurement.source)).toEqual([
      "camera",
      "camera",
      "camera",
      "camera",
    ]);
    expect(result?.measurements[0].method).toBe("ellipse-two-view");
    expect(result?.measurements[0].valueCm).toBeGreaterThan(60);
    expect(result?.measurements[2].leftCm).toBeGreaterThan(0);
    expect(result?.measurements[2].rightCm).toBeGreaterThan(0);
    expect(result?.measurements[3].method).toBe("nape-to-hem");
    expect(result?.calibration.agreement).toBe("height-only");
    expect(result?.privacy.imagesLeftDevice).toBe(false);

    const frontOnly = createCameraResult({
      sessionId: "front",
      displayUnits: "cm",
      garment: "shirt",
      heightCm: 170,
      clothingFit: "loose",
      front: recordedSample("front", 1),
      side: null,
    });
    expect(frontOnly?.measurements[0].method).toBe("ellipse-front-only");
    expect(frontOnly?.quality.side).toBe("skipped");
    expect(frontOnly?.quality.warnings.join(" ")).toContain("prior");
    const frontRange = frontOnly?.measurements[0].rangeCm;
    expect(frontRange).not.toBeNull();
    expect((frontRange?.[1] ?? 0) - (frontRange?.[0] ?? 0)).toBeGreaterThan(8);
  });
});
