import {
  applyEase,
  cuttingCm,
  overlappingSizes,
  resolveEase,
  sampleScanResult,
  validateScanResult,
  type ScanResult,
} from "@tailor-scan/core";
import type { EmbedConfig } from "./config";

export function createMockResult(config: EmbedConfig, sessionId: string): ScanResult {
  const sample = sampleScanResult();
  const garment = config.garment ?? sample.garment;
  const [chhati, kamar, baazu, lambai] = sample.measurements;
  const fit =
    garment === "custom"
      ? { ...sample.fit, preset: "custom" as const }
      : resolveEase(garment, "regular", config.easePresets ?? null);
  const garmentMeasurements =
    garment === "custom"
      ? sample.garmentMeasurements
      : applyEase(
          {
            chhatiCm: cuttingCm(chhati),
            kamarCm: cuttingCm(kamar),
            baazuCm: cuttingCm(baazu),
            lambaiCm: cuttingCm(lambai),
          },
          fit,
        );
  const sizes = config.sizeChart
    ? overlappingSizes(sample.measurements, config.sizeChart)
    : sample.sizes;
  const validated = validateScanResult({
    ...sample,
    sessionId,
    displayUnits: config.displayUnits ?? sample.displayUnits,
    garment,
    fit,
    garmentMeasurements,
    sizes,
    privacy: {
      imagesLeftDevice: false,
      keypointsIncluded: config.exportKeypoints === true,
    },
  });
  if (!validated.ok) {
    throw new Error("The sample result failed the result schema.");
  }
  return validated.value;
}
