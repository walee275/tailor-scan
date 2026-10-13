import {
  applyEase,
  inchesToCm,
  overlappingSizes,
  resolveEase,
  roundWireCm,
  validateScanResult,
  type ClothingFit,
  type DisplayUnits,
  type EasePresets,
  type GarmentId,
  type HemAnchor,
  type ScanResult,
  type SizeChartEntry,
  type SleevePath,
} from "@tailor-scan/core";

export type ManualMeasurementInput = {
  sessionId: string;
  displayUnits: DisplayUnits;
  garment: GarmentId;
  heightCm: number;
  clothingFit: ClothingFit;
  chhati: number;
  kamar: number;
  baazu: number;
  lambai: number;
  sleevePath?: SleevePath;
  hemAnchor?: HemAnchor;
  easePresets?: EasePresets | null;
  exportKeypoints?: boolean;
  sizeChart?: SizeChartEntry[];
};

export function createManualResult(input: ManualMeasurementInput): ScanResult {
  const chhati = toWire(input.chhati, input.displayUnits);
  const kamar = toWire(input.kamar, input.displayUnits);
  const baazu = toWire(input.baazu, input.displayUnits);
  const lambai = toWire(input.lambai, input.displayUnits);
  const confidence = input.clothingFit === "loose" ? "low" : input.clothingFit === "unknown" ? "medium" : "high";
  const warnings = [
    "These measurements were typed in. The camera was not used.",
    "Scale uses the height you entered. No reference object was in frame.",
  ];
  if (input.clothingFit === "loose") {
    warnings.push("Loose clothing makes a camera measurement less certain. These numbers are what you typed.");
  }
  const measurements = [
    {
      id: "chhati" as const,
      label: "Chhati",
      source: "user" as const,
      method: "manual" as const,
      valueCm: chhati,
      rangeCm: null,
      rangeBasis: "error-budget" as const,
      confidence,
      stationFraction: null,
      overrideCm: null,
    },
    {
      id: "kamar" as const,
      label: "Kamar",
      source: "user" as const,
      method: "manual" as const,
      valueCm: kamar,
      rangeCm: null,
      rangeBasis: "error-budget" as const,
      confidence,
      stationFraction: null,
      overrideCm: null,
    },
    {
      id: "baazu" as const,
      label: "Baazu",
      source: "user" as const,
      method: "manual" as const,
      sleevePath: input.sleevePath ?? "shoulder-to-wrist",
      valueCm: baazu,
      rangeCm: null,
      rangeBasis: "error-budget" as const,
      confidence,
      leftCm: baazu,
      rightCm: baazu,
      overrideCm: null,
    },
    {
      id: "lambai" as const,
      label: "Lambai",
      source: "user" as const,
      method: "manual" as const,
      lengthAnchor: "nape" as const,
      hemAnchor: input.hemAnchor ?? defaultHem(input.garment),
      valueCm: lambai,
      rangeCm: null,
      rangeBasis: "error-budget" as const,
      confidence,
      overrideCm: null,
    },
  ];
  const fit = resolveEase(input.garment, "regular", input.easePresets ?? null);
  const garmentMeasurements = applyEase(
    { chhatiCm: chhati, kamarCm: kamar, baazuCm: baazu, lambaiCm: lambai },
    fit,
  );
  const validated = validateScanResult({
    schema: "tailor-scan.result.v1",
    sessionId: input.sessionId,
    capturedAt: new Date().toISOString(),
    displayUnits: input.displayUnits,
    garment: input.garment,
    subject: {
      heightCm: roundWireCm(input.heightCm),
      clothingFit: input.clothingFit,
      adultDeclaration: true,
    },
    calibration: {
      method: "height",
      frontScaleCmPerPx: null,
      sideScaleCmPerPx: null,
      agreement: "height-only",
      confidence: "low",
    },
    measurements,
    fit,
    garmentMeasurements,
    sizes: input.sizeChart ? overlappingSizes(measurements, input.sizeChart) : [],
    quality: { front: "skipped", side: "skipped", warnings },
    privacy: {
      imagesLeftDevice: false,
      keypointsIncluded: input.exportKeypoints === true,
    },
  });
  if (!validated.ok) {
    throw new Error(validated.issues.map((issue) => issue.message).join(" "));
  }
  return validated.value;
}

function toWire(value: number, units: DisplayUnits): number {
  return roundWireCm(units === "in" ? inchesToCm(value) : value);
}

function defaultHem(garment: GarmentId): HemAnchor {
  return garment === "kurta" || garment === "kameez" ? "knee" : "hip";
}
