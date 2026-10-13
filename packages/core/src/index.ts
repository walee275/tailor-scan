export {
  RESULT_SCHEMA,
  type BaazuMeasurement,
  type CalibrationAgreement,
  type CalibrationMethod,
  type CentimeterRange,
  type ChhatiMeasurement,
  type ClothingFit,
  type Confidence,
  type DisplayUnits,
  type EasePreset,
  type FitPreference,
  type FitPreset,
  type Flare,
  type GarmentId,
  type GarmentMeasurements,
  type GirthMethod,
  type HemAnchor,
  type KamarMeasurement,
  type LambaiMeasurement,
  type LengthAnchor,
  type LengthMethod,
  type Measurement,
  type MeasurementId,
  type MeasurementSource,
  type OverlappingSize,
  type RangeBasis,
  type ScanResult,
  type SleeveMethod,
  type SleevePath,
  type ViewQuality,
} from "./result";

export {
  CM_PER_INCH,
  cmToInches,
  displayLength,
  feetAndInchesToCm,
  inchesToCm,
  roundDisplayCm,
  roundDisplayInches,
  roundWireCm,
} from "./units";

export {
  ContractError,
  adjustEase,
  applyEase,
  clampEase,
  cuttingCm,
  defaultEaseLimits,
  resolveEase,
  type CuttingBody,
  type EaseAmounts,
  type EaseLimits,
  type EasePresets,
} from "./ease";

export { overlappingSizes, type SizeChartEntry, type SizedMeasurement } from "./sizes";

export {
  scanResultSchema,
  validateScanResult,
  type ScanResultValidation,
  type SchemaIssue,
} from "./schema";
