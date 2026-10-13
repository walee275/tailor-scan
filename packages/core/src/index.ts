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
  armIsInPlane,
  chestDepthPrior,
  compareWaistToChest,
  estimateGirth,
  estimateLambai,
  estimateSleeve,
  napeToShoulderCm,
  ramanujanCircumference,
  waistDepthPrior,
  worldLength,
  type ArmBones,
  type GirthEstimate,
  type SleeveEstimate,
  type Vec3,
} from "./measure";

export {
  scanResultSchema,
  validateScanResult,
  type ScanResultValidation,
  type SchemaIssue,
} from "./schema";

export { sampleScanResult } from "./sample";

export {
  averageVisionSamples,
  checkFrontArms,
  checkSideTurn,
  checkVisibility,
  poseGateThresholds,
  shoulderWidthPx,
} from "./pose";

export { type PersonMask, type VisionSample, type WorldLandmark } from "./vision";

export {
  A4_INNER_MM,
  CREDIT_CARD_MM,
  agreeScales,
  buildA4SheetPdf,
  calibrateHeight,
  detectRectangle,
  heightScaleCmPerPx,
  moveCorner,
  quadSizePx,
  referenceMillimeters,
  referenceScaleCmPerPx,
  selectCrown,
  selectFloor,
  type Corner,
  type CornerQuad,
  type HeightCalibration,
  type Millimeters,
  type RectangleDetection,
  type ReferencePresetId,
  type ScaleChoice,
} from "./calibration";

export {
  previewScaleCmPerPx,
  selectStations,
  shoulderHipAxis,
  torsoWidthPx,
  type StationPick,
  type StationSelection,
} from "./stations";

export {
  POSE_LANDMARK_COUNT,
  PoseIndex,
  blurFloor,
  checkBlur,
  checkExposure,
  checkFraming,
  checkStillness,
  gateThresholds,
  laplacianVariance,
  liveGates,
  meanLuma,
  standingPose,
  type GateId,
  type GateOutcome,
  type GateStatus,
  type ImageLandmark,
} from "./gates";
