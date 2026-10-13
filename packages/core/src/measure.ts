import type { ClothingFit, Confidence, GirthMethod, SleeveMethod, SleevePath } from "./result";
import { roundDisplayCm, roundWireCm } from "./units";

export const chestDepthPrior = 0.7;
export const waistDepthPrior = 0.75;

export type Vec3 = { x: number; y: number; z: number };

export type GirthStation = {
  id: "chhati" | "kamar";
  widthCm: number;
  depthCm: number | null;
  onEdge: boolean;
};

export type GirthEstimate = {
  valueCm: number;
  rangeCm: [number, number];
  method: GirthMethod;
  confidence: Confidence;
  warnings: string[];
};

export function ramanujanCircumference(a: number, b: number): number {
  const sum = a + b;
  if (!(sum > 0)) {
    return 0;
  }
  const h = ((a - b) / sum) ** 2;
  return Math.PI * sum * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

export function estimateGirth(
  station: GirthStation,
  input: {
    clothingFit: ClothingFit;
    calibration: "height-only" | "agreed";
    frontOnly: boolean;
  },
): GirthEstimate {
  const prior = station.id === "chhati" ? chestDepthPrior : waistDepthPrior;
  const frontOnly = input.frontOnly || station.depthCm == null;
  const depthCm = frontOnly ? station.widthCm * prior : station.depthCm!;
  const value = ramanujanCircumference(station.widthCm / 2, depthCm / 2);
  const warnings: string[] = [];
  let flagged = false;
  if (station.id === "chhati" && (value < 60 || value > 160)) {
    warnings.push("Chest is outside 60–160 cm. The number is not clamped.");
    flagged = true;
  }
  if (!frontOnly && depthCm > station.widthCm) {
    warnings.push("Side depth is greater than front width.");
    flagged = true;
  }
  const scalePart = Math.abs(value) * (input.calibration === "agreed" ? 0.01 : 0.025);
  const stationPart = station.onEdge ? 2 : 1;
  const maskPart = Math.PI * 1;
  const ellipsePart = station.id === "chhati" ? 2.5 : 2;
  const breathPart = station.id === "chhati" ? 1.5 : 0;
  let half = Math.hypot(scalePart, stationPart, maskPart, ellipsePart, breathPart);
  if (frontOnly) {
    half += 4;
    warnings.push("Side view skipped. Depth uses a prior.");
  }
  if (flagged) {
    half += 2;
  }
  const bias = input.clothingFit === "close" ? 0 : 3;
  return {
    valueCm: roundWireCm(value),
    rangeCm: rangeAround(value, half, bias),
    method: frontOnly ? "ellipse-front-only" : "ellipse-two-view",
    confidence: flagged || input.clothingFit === "loose" ? "low" : input.calibration === "agreed" ? "high" : "medium",
    warnings,
  };
}

export type ArmBones = { shoulder: Vec3; elbow: Vec3; wrist: Vec3 };

export type SleeveEstimate = {
  valueCm: number;
  leftCm: number;
  rightCm: number;
  rangeCm: [number, number];
  method: SleeveMethod;
  confidence: Confidence;
  warnings: string[];
};

export function worldLength(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function armIsInPlane(arm: ArmBones): boolean {
  const reach = worldLength(arm.shoulder, arm.elbow) + worldLength(arm.elbow, arm.wrist);
  const depth = Math.max(
    Math.abs(arm.elbow.z - arm.shoulder.z),
    Math.abs(arm.wrist.z - arm.shoulder.z),
  );
  return reach > 0 && depth <= reach * 0.2;
}

export function napeToShoulderCm(shoulderWidthCm: number): number {
  return Math.hypot(shoulderWidthCm / 2, shoulderWidthCm * 0.15);
}

export function estimateSleeve(input: {
  enteredHeightCm: number;
  worldStatureCm: number;
  left: ArmBones;
  right: ArmBones;
  leftPixelCm: number | null;
  rightPixelCm: number | null;
  leftInPlane?: boolean;
  rightInPlane?: boolean;
  shoulderWidthCm: number;
  sleevePath: SleevePath;
  calibration: "height-only" | "agreed";
}): SleeveEstimate {
  const metric = input.worldStatureCm > 0 ? input.enteredHeightCm / input.worldStatureCm : 0;
  const left3d = boneCm(input.left, metric);
  const right3d = boneCm(input.right, metric);
  const nape = input.sleevePath === "nape-to-wrist" ? napeToShoulderCm(input.shoulderWidthCm) : 0;
  const leftInPlane = input.leftInPlane ?? armIsInPlane(input.left);
  const rightInPlane = input.rightInPlane ?? armIsInPlane(input.right);
  const leftPick = pickArm(left3d + nape, shiftPixel(input.leftPixelCm, nape), leftInPlane);
  const rightPick = pickArm(right3d + nape, shiftPixel(input.rightPixelCm, nape), rightInPlane);
  const leftCm = leftPick.valueCm;
  const rightCm = rightPick.valueCm;
  const value = (leftCm + rightCm) / 2;
  const confirmed =
    leftInPlane &&
    rightInPlane &&
    input.leftPixelCm != null &&
    input.rightPixelCm != null &&
    !leftPick.disagreed &&
    !rightPick.disagreed;
  const inPlaneChosen = leftPick.method === "in-plane-pixels" || rightPick.method === "in-plane-pixels";
  const foreshortening = confirmed ? 1.5 : 3;
  let half = Math.hypot(Math.abs(value) * (input.calibration === "agreed" ? 0.01 : 0.025), foreshortening);
  const sideGap = Math.abs(leftCm - rightCm);
  const warnings: string[] = [];
  if (sideGap > 3) {
    half += sideGap - 3;
    warnings.push("Left and right sleeves differ by more than 3 cm.");
  }
  if (leftPick.disagreed || rightPick.disagreed) {
    warnings.push("The flat sleeve and the posed sleeve differ, so confidence is lower.");
  }
  const method: SleeveMethod = inPlaneChosen ? "in-plane-pixels" : "scaled-world-bones";
  return {
    valueCm: roundWireCm(value),
    leftCm: roundWireCm(leftCm),
    rightCm: roundWireCm(rightCm),
    rangeCm: rangeAround(value, half, 0),
    method,
    confidence: leftPick.disagreed || rightPick.disagreed || sideGap > 3 ? "low" : "medium",
    warnings,
  };
}

export function estimateLambai(input: {
  napeY: number;
  hemY: number;
  frontScaleCmPerPx: number;
  calibration: "height-only" | "agreed";
}): { valueCm: number; rangeCm: [number, number] } {
  const value = (input.hemY - input.napeY) * input.frontScaleCmPerPx;
  const half = Math.hypot(Math.abs(value) * (input.calibration === "agreed" ? 0.01 : 0.025), 1.5, 0.5);
  return { valueCm: roundWireCm(value), rangeCm: rangeAround(value, half, 0) };
}

export function compareWaistToChest(waistCm: number, chestCm: number): string | null {
  if (waistCm > chestCm + 10) {
    return "Waist is more than 10 cm above the chest. The station may have landed on the hip.";
  }
  return null;
}

function boneCm(arm: ArmBones, metric: number): number {
  return (worldLength(arm.shoulder, arm.elbow) + worldLength(arm.elbow, arm.wrist)) * metric;
}

function shiftPixel(pixelCm: number | null, nape: number): number | null {
  return pixelCm == null ? null : pixelCm + nape;
}

function pickArm(
  scaled3d: number,
  pixelCm: number | null,
  inPlane: boolean,
): { valueCm: number; method: SleeveMethod; disagreed: boolean } {
  if (pixelCm == null) {
    return { valueCm: scaled3d, method: "scaled-world-bones", disagreed: false };
  }
  const disagreed = Math.abs(pixelCm - scaled3d) > 4;
  if (inPlane && disagreed) {
    return { valueCm: pixelCm, method: "in-plane-pixels", disagreed: true };
  }
  return { valueCm: scaled3d, method: "scaled-world-bones", disagreed: inPlane ? false : disagreed };
}

function rangeAround(value: number, half: number, highBias: number): [number, number] {
  const low = Math.max(0, roundDisplayCm(value - half));
  const high = Math.max(low, roundDisplayCm(value + half + highBias));
  return [low, high];
}
