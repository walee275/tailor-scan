import {
  adjustEase,
  applyEase,
  cuttingCm,
  resolveEase,
  type DisplayUnits,
  type EasePreset,
  type EasePresets,
  type FitPreference,
  type Measurement,
  type ScanResult,
} from "@tailor-scan/core";

export function withPreset(
  result: ScanResult,
  preset: EasePreset,
  shopPresets: EasePresets | null = null,
): ScanResult {
  return applyFit(result, resolveEase(result.garment, preset, shopPresets));
}

export function withEasePatch(result: ScanResult, patch: Partial<FitPreference>): ScanResult {
  return applyFit(result, adjustEase(result.fit, patch));
}

export function withOverride(result: ScanResult, id: Measurement["id"], overrideCm: number | null): ScanResult {
  const measurements = result.measurements.map((measurement) => {
    if (measurement.id !== id) {
      return measurement;
    }
    if (overrideCm == null) {
      return {
        ...measurement,
        overrideCm: null,
        source: measurement.source === "camera+override" ? ("camera" as const) : measurement.source,
      };
    }
    return {
      ...measurement,
      overrideCm,
      source: measurement.source === "user" ? ("user" as const) : ("camera+override" as const),
    };
  }) as ScanResult["measurements"];
  return applyFit({ ...result, measurements }, result.fit);
}

export function withDisplayUnits(result: ScanResult, displayUnits: DisplayUnits): ScanResult {
  return { ...result, displayUnits };
}

function applyFit(result: ScanResult, fit: FitPreference): ScanResult {
  const [chhati, kamar, baazu, lambai] = result.measurements;
  return {
    ...result,
    fit,
    garmentMeasurements: applyEase(
      {
        chhatiCm: cuttingCm(chhati!),
        kamarCm: cuttingCm(kamar!),
        baazuCm: cuttingCm(baazu!),
        lambaiCm: cuttingCm(lambai!),
      },
      fit,
    ),
  };
}
