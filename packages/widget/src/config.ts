import type {
  DisplayUnits,
  EasePresets,
  GarmentId,
  HemAnchor,
  ScanResult,
  SizeChartEntry,
  SleevePath,
} from "@tailor-scan/core";

export type CalibrationPreference = "height" | "reference" | "both";
export type SleeveAggregate = "mean" | "max";
export type Presentation = "inline" | "modal";

export type EmbedConfig = {
  displayUnits?: DisplayUnits;
  garment?: GarmentId;
  sleevePath?: SleevePath;
  sleeveAggregate?: SleeveAggregate;
  lengthAnchor?: "nape";
  hemAnchor?: HemAnchor;
  calibration?: CalibrationPreference;
  exportKeypoints?: boolean;
  blockOnLowConfidence?: boolean;
  locale?: string;
  theme?: { accent?: string };
  sizeChart?: SizeChartEntry[];
  easePresets?: EasePresets | null;
};

export type ProgressState = {
  sessionId: string;
  step: string;
};

export type ScanErrorCode =
  | "camera-denied"
  | "camera-missing"
  | "model-load-failed"
  | "unsupported-browser"
  | "session-superseded";

export type ScanError = {
  code: ScanErrorCode;
  message: string;
};

export type OpenOptions = EmbedConfig & {
  target: string | HTMLElement;
  presentation?: Presentation;
  onReady?: (detail: { sessionId: string }) => void;
  onProgress?: (state: ProgressState) => void;
  onComplete?: (result: ScanResult) => void;
  onCancel?: () => void;
  onError?: (error: ScanError) => void;
};

export type ScanSession = {
  sessionId: string;
  close: () => void;
  setDisplayUnits: (units: DisplayUnits) => void;
};

const garments: readonly GarmentId[] = ["shirt", "kurta", "kameez", "custom"];
const calibrations: readonly CalibrationPreference[] = ["height", "reference", "both"];

export function isGarment(value: unknown): value is GarmentId {
  return typeof value === "string" && garments.includes(value as GarmentId);
}

export function isCalibration(value: unknown): value is CalibrationPreference {
  return typeof value === "string" && calibrations.includes(value as CalibrationPreference);
}

export function readAttributes(element: HTMLElement): EmbedConfig {
  const config: EmbedConfig = {};
  const units = element.getAttribute("display-units");
  const garment = element.getAttribute("garment");
  const calibration = element.getAttribute("calibration");
  if (units === "cm" || units === "in") {
    config.displayUnits = units;
  }
  if (isGarment(garment)) {
    config.garment = garment;
  }
  if (isCalibration(calibration)) {
    config.calibration = calibration;
  }
  return config;
}
