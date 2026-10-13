import { describe, expect, it } from "vitest";
import { ContractError } from "@tailor-scan/core";
import { createManualResult } from "./manual-result";

describe("manual result", () => {
  it("stores typed centimeters with regular kurta ease and source user", () => {
    const result = createManualResult({
      sessionId: "typed",
      displayUnits: "cm",
      garment: "kurta",
      heightCm: 172,
      clothingFit: "close",
      chhati: 96.4,
      kamar: 84,
      baazu: 63.5,
      lambai: 102,
    });
    expect(result.sessionId).toBe("typed");
    expect(result.measurements.map((item) => item.source)).toEqual(["user", "user", "user", "user"]);
    expect(result.measurements.map((item) => item.method)).toEqual([
      "manual",
      "manual",
      "manual",
      "manual",
    ]);
    expect(result.measurements[0]?.valueCm).toBe(96.4);
    expect(result.garmentMeasurements).toEqual({
      chhatiCm: 110.4,
      kamarCm: 100,
      baazuCm: 64.5,
      lambaiCm: 102,
    });
    expect(result.calibration.frontScaleCmPerPx).toBeNull();
    expect(result.calibration.sideScaleCmPerPx).toBeNull();
    expect(result.calibration.agreement).toBe("height-only");
    expect(result.quality.front).toBe("skipped");
    expect(result.privacy.imagesLeftDevice).toBe(false);
    expect(result.subject.adultDeclaration).toBe(true);
  });

  it("converts inches and lowers confidence when clothes are loose", () => {
    const result = createManualResult({
      sessionId: "inches",
      displayUnits: "in",
      garment: "shirt",
      heightCm: 172.72,
      clothingFit: "loose",
      chhati: 38,
      kamar: 33,
      baazu: 25,
      lambai: 40,
    });
    expect(result.measurements[0]?.valueCm).toBe(96.5);
    expect(result.garmentMeasurements.chhatiCm).toBe(106.5);
    expect(result.measurements[0]?.confidence).toBe("low");
    expect(result.quality.warnings.some((warning) => warning.includes("Loose"))).toBe(true);
    expect(result.measurements[3]?.method).toBe("manual");
  });

  it("refuses a custom garment without shop ease", () => {
    expect(() =>
      createManualResult({
        sessionId: "custom",
        displayUnits: "cm",
        garment: "custom",
        heightCm: 170,
        clothingFit: "unknown",
        chhati: 90,
        kamar: 80,
        baazu: 60,
        lambai: 70,
      }),
    ).toThrow(ContractError);
  });
});
