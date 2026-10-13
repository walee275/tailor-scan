import { describe, expect, it } from "vitest";
import { createMockResult } from "./mock-result";

describe("mock result", () => {
  it("keeps the plan fixture when the garment is a kurta", () => {
    const result = createMockResult({ garment: "kurta", displayUnits: "cm" }, "demo");
    expect(result.schema).toBe("tailor-scan.result.v1");
    expect(result.sessionId).toBe("demo");
    expect(result.garmentMeasurements.chhatiCm).toBe(110.4);
    expect(result.privacy.imagesLeftDevice).toBe(false);
  });

  it("applies shirt ease and returns every overlapping size", () => {
    const result = createMockResult(
      {
        garment: "shirt",
        displayUnits: "in",
        sizeChart: [
          { id: "s", label: "S", measurementId: "chhati", minCm: 80, maxCm: 90 },
          { id: "m", label: "M", measurementId: "chhati", minCm: 88, maxCm: 98 },
          { id: "l", label: "L", measurementId: "chhati", minCm: 96, maxCm: 106 },
        ],
      },
      "demo",
    );
    expect(result.displayUnits).toBe("in");
    expect(result.garmentMeasurements.chhatiCm).toBe(106.4);
    expect(result.sizes.map((size) => size.id)).toEqual(["m", "l"]);
  });
});
