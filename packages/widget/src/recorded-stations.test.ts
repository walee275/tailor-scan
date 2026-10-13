import { previewScaleCmPerPx, selectStations } from "@tailor-scan/core";
import { describe, expect, it } from "vitest";
import { recordedSample } from "./recorded-pose";

describe("recorded pose stations", () => {
  it("draws chest and waist inside the bands after the arms are removed", () => {
    const sample = recordedSample("front", 0);
    expect(sample.mask).not.toBeNull();
    const mask = sample.mask!;
    const selected = selectStations({
      mask,
      landmarks: sample.landmarks,
      scaleCmPerPx: previewScaleCmPerPx(mask, sample.landmarks),
      frontOnly: true,
    });
    expect(selected.blocked).toBe(false);
    expect(selected.chest?.fraction).toBeGreaterThanOrEqual(0.2);
    expect(selected.chest?.fraction).toBeLessThanOrEqual(0.4);
    expect(selected.waist?.fraction).toBeGreaterThanOrEqual(0.55);
    expect(selected.waist?.fraction).toBeLessThanOrEqual(0.78);
    expect(selected.chest?.widthPx ?? 0).toBeGreaterThan(selected.waist?.widthPx ?? 0);
  });
});
