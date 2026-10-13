import { describe, expect, it } from "vitest";
import { createCameraResult } from "./camera-result";
import { runRecordedGuide } from "./pose-guide";
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

  it("keeps recorded chest and waist girths plausible for a 175 cm person", () => {
    const done = runRecordedGuide().at(-1);
    expect(done?.phase).toBe("done");
    const result = createCameraResult({
      sessionId: "recorded-175",
      displayUnits: "cm",
      garment: "kurta",
      heightCm: 175,
      clothingFit: "close",
      front: done!.front!,
      side: done!.side,
    });
    expect(result).not.toBeNull();
    const chhati = result!.measurements.find((measurement) => measurement.id === "chhati");
    const kamar = result!.measurements.find((measurement) => measurement.id === "kamar");
    const baazu = result!.measurements.find((measurement) => measurement.id === "baazu");
    const lambai = result!.measurements.find((measurement) => measurement.id === "lambai");
    expect(chhati?.method).toBe("ellipse-two-view");
    expect(kamar?.method).toBe("ellipse-two-view");
    expect(chhati?.valueCm).toBe(97);
    expect(kamar?.valueCm).toBe(89.6);
    expect(chhati?.rangeCm).toEqual([91.5, 102.5]);
    expect(kamar?.rangeCm).toEqual([85, 94.5]);
    expect(baazu?.valueCm).toBe(59.5);
    expect(lambai?.valueCm).toBe(102.5);
  });
});
