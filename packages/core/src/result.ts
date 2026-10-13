export const RESULT_SCHEMA = "tailor-scan.result.v1" as const;

export type DisplayUnits = "cm" | "in";
export type GarmentId = "shirt" | "kurta" | "kameez" | "custom";
export type ClothingFit = "close" | "loose" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type MeasurementSource = "camera" | "user" | "camera+override";
export type RangeBasis = "error-budget" | "measured-percentile";
export type ViewQuality = "pass" | "fail" | "skipped";
export type SleevePath = "shoulder-to-wrist" | "nape-to-wrist";
export type LengthAnchor = "nape";
export type HemAnchor = "hip" | "knee" | "ankle" | "custom";
export type GirthMethod = "ellipse-two-view" | "ellipse-front-only" | "manual";
export type SleeveMethod = "scaled-world-bones" | "manual";
export type LengthMethod = "nape-to-hem" | "manual";
export type CalibrationMethod = "height" | "a4" | "height+a4";
export type CalibrationAgreement =
  | "within-3pct"
  | "prefer-reference"
  | "prefer-height"
  | "height-only";
export type FitPreset = "fitted" | "regular" | "relaxed" | "custom";
export type EasePreset = Exclude<FitPreset, "custom">;
export type Flare = "none" | "straight" | "aline";

export type CentimeterRange = [number, number];

type MeasurementBase = {
  label: string;
  source: MeasurementSource;
  valueCm: number;
  rangeCm: CentimeterRange | null;
  rangeBasis: RangeBasis;
  confidence: Confidence;
  overrideCm: number | null;
};

export type ChhatiMeasurement = MeasurementBase & {
  id: "chhati";
  method: GirthMethod;
  stationFraction: number | null;
};

export type KamarMeasurement = MeasurementBase & {
  id: "kamar";
  method: GirthMethod;
  stationFraction: number | null;
};

export type BaazuMeasurement = MeasurementBase & {
  id: "baazu";
  method: SleeveMethod;
  sleevePath: SleevePath;
  leftCm: number;
  rightCm: number;
};

export type LambaiMeasurement = MeasurementBase & {
  id: "lambai";
  method: LengthMethod;
  lengthAnchor: LengthAnchor;
  hemAnchor: HemAnchor;
};

export type Measurement =
  | ChhatiMeasurement
  | KamarMeasurement
  | BaazuMeasurement
  | LambaiMeasurement;

export type MeasurementId = Measurement["id"];

export type FitPreference = {
  preset: FitPreset;
  easeChestCm: number;
  easeWaistCm: number;
  sleeveLengthDeltaCm: number;
  garmentLengthDeltaCm: number;
  flare: Flare;
};

export type GarmentMeasurements = {
  chhatiCm: number;
  kamarCm: number;
  baazuCm: number;
  lambaiCm: number;
};

export type OverlappingSize = {
  id: string;
  label: string;
  measurementId: MeasurementId;
};

export type ScanResult = {
  schema: typeof RESULT_SCHEMA;
  sessionId: string;
  capturedAt: string;
  displayUnits: DisplayUnits;
  garment: GarmentId;
  subject: {
    heightCm: number;
    clothingFit: ClothingFit;
    adultDeclaration: true;
  };
  calibration: {
    method: CalibrationMethod;
    frontScaleCmPerPx: number | null;
    sideScaleCmPerPx: number | null;
    agreement: CalibrationAgreement;
    confidence: Confidence;
  };
  measurements: [
    ChhatiMeasurement,
    KamarMeasurement,
    BaazuMeasurement,
    LambaiMeasurement,
  ];
  fit: FitPreference;
  garmentMeasurements: GarmentMeasurements;
  sizes: OverlappingSize[];
  quality: {
    front: ViewQuality;
    side: ViewQuality;
    warnings: string[];
  };
  privacy: {
    imagesLeftDevice: false;
    keypointsIncluded: boolean;
  };
};
