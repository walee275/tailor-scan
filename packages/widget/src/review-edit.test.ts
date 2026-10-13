import {
  adjustEase,
  cuttingCm,
  sampleScanResult,
} from "@tailor-scan/core";
import { describe, expect, it } from "vitest";
import { withDisplayUnits, withEasePatch, withOverride, withPreset } from "./review-edit";

describe("review edits", () => {
  it("keeps the body value when ease changes and keeps an override across presets", () => {
    const start = sampleScanResult();
    const eased = withEasePatch(start, { easeChestCm: 20 });
    expect(eased.fit.preset).toBe("custom");
    expect(eased.measurements[0].valueCm).toBe(96.4);
    expect(eased.garmentMeasurements.chhatiCm).toBe(116.4);
    expect(eased.garmentMeasurements.kamarCm).toBe(start.garmentMeasurements.kamarCm);

    const overridden = withOverride(start, "chhati", 100);
    expect(overridden.measurements[0].source).toBe("camera+override");
    expect(overridden.measurements[0].valueCm).toBe(96.4);
    expect(overridden.measurements[0].overrideCm).toBe(100);
    const relaxed = withPreset(overridden, "relaxed");
    expect(relaxed.measurements[0].overrideCm).toBe(100);
    expect(relaxed.fit.preset).toBe("relaxed");
    expect(relaxed.garmentMeasurements.chhatiCm).toBeCloseTo(120, 5);

    const inches = withDisplayUnits(relaxed, "in");
    expect(inches.displayUnits).toBe("in");
    expect(inches.measurements[0].valueCm).toBe(96.4);
    expect(inches.measurements[0].overrideCm).toBe(100);
    expect(cuttingCm(inches.measurements[0])).toBe(100);
    expect(adjustEase(inches.fit, { easeWaistCm: 10 }).preset).toBe("custom");
  });
});
