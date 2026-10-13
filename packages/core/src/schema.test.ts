import { describe, expect, it } from "vitest";
import fixture from "../fixtures/result-v1.json";
import { applyEase, cuttingCm, resolveEase } from "./ease";
import { validateScanResult } from "./schema";

describe("scan result schema", () => {
  it("accepts the plan fixture", () => {
    const validated = validateScanResult(fixture);
    expect(validated.ok).toBe(true);
  });

  it("rejects an unknown schema string", () => {
    const validated = validateScanResult({ ...fixture, schema: "tailor-scan.result.v0" });
    expect(validated.ok).toBe(false);
    if (validated.ok) {
      return;
    }
    expect(validated.issues.some((issue) => issue.instancePath === "/schema")).toBe(true);
  });

  it("rejects a result that claims images left the device", () => {
    const validated = validateScanResult({
      ...fixture,
      privacy: { ...fixture.privacy, imagesLeftDevice: true },
    });
    expect(validated.ok).toBe(false);
  });

  it("rejects a result without an adult declaration", () => {
    const validated = validateScanResult({
      ...fixture,
      subject: { ...fixture.subject, adultDeclaration: false },
    });
    expect(validated.ok).toBe(false);
  });

  it("accepts a front-only capture with no side scale", () => {
    const measurements = fixture.measurements.map((measurement) =>
      measurement.id === "chhati" || measurement.id === "kamar"
        ? { ...measurement, method: "ellipse-front-only" }
        : measurement,
    );
    const validated = validateScanResult({
      ...fixture,
      calibration: { ...fixture.calibration, sideScaleCmPerPx: null, method: "height" },
      measurements,
    });
    expect(validated.ok).toBe(true);
  });

  it("accepts a manual result with no pixel scale", () => {
    const measurements = fixture.measurements.map((measurement) => {
      if (measurement.id === "chhati" || measurement.id === "kamar") {
        return { ...measurement, source: "user", method: "manual", rangeCm: null, stationFraction: null };
      }
      if (measurement.id === "baazu") {
        return { ...measurement, source: "user", method: "manual", rangeCm: null };
      }
      return { ...measurement, source: "user", method: "manual", rangeCm: null };
    });
    const validated = validateScanResult({
      ...fixture,
      calibration: {
        method: "height",
        frontScaleCmPerPx: null,
        sideScaleCmPerPx: null,
        agreement: "height-only",
        confidence: "low",
      },
      quality: { front: "skipped", side: "skipped", warnings: ["Typed in by the customer."] },
      measurements,
    });
    expect(validated.ok).toBe(true);
  });

  it("accepts a manual girth with no camera range", () => {
    const measurements = fixture.measurements.map((measurement) =>
      measurement.id === "chhati"
        ? {
            ...measurement,
            source: "user",
            method: "manual",
            rangeCm: null,
            stationFraction: null,
          }
        : measurement,
    );
    expect(validateScanResult({ ...fixture, measurements }).ok).toBe(true);
  });

  it("rejects an override source that omits the override", () => {
    const measurements = fixture.measurements.map((measurement) =>
      measurement.id === "chhati"
        ? { ...measurement, source: "camera+override", overrideCm: null }
        : measurement,
    );
    const validated = validateScanResult({ ...fixture, measurements });
    expect(validated.ok).toBe(false);
  });

  it("rejects extra fields", () => {
    const validated = validateScanResult({ ...fixture, note: "cut loosely" });
    expect(validated.ok).toBe(false);
  });

  it("matches garment numbers to body estimates plus kurta regular ease", () => {
    const validated = validateScanResult(fixture);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }
    const result = validated.value;
    const [chhati, kamar, baazu, lambai] = result.measurements;
    expect(resolveEase("kurta", "regular")).toEqual(result.fit);
    expect(
      applyEase(
        {
          chhatiCm: cuttingCm(chhati),
          kamarCm: cuttingCm(kamar),
          baazuCm: cuttingCm(baazu),
          lambaiCm: cuttingCm(lambai),
        },
        result.fit,
      ),
    ).toEqual(result.garmentMeasurements);
  });
});
