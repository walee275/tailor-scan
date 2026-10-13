import { PoseIndex, type ImageLandmark } from "./gates";
import { checkFrontArms } from "./pose";
import type { PersonMask } from "./vision";

export type StationPick = {
  fraction: number;
  widthPx: number;
  onEdge: boolean;
};

export type StationSelection = {
  blocked: boolean;
  prompt: string | null;
  chest: StationPick | null;
  waist: StationPick | null;
  frontOnly: boolean;
};

const chestBand = { start: 0.2, end: 0.4 };
const waistBand = { start: 0.55, end: 0.78 };

export function selectStations(input: {
  mask: PersonMask;
  landmarks: ImageLandmark[];
  scaleCmPerPx: number;
  frontOnly?: boolean;
}): StationSelection {
  const frontOnly = input.frontOnly === true;
  const arms = checkFrontArms(input.landmarks);
  if (arms.status === "fail" && arms.prompt.includes("away from your sides")) {
    return {
      blocked: true,
      prompt: "Move your arms a little away from your sides.",
      chest: null,
      waist: null,
      frontOnly,
    };
  }
  const axis = shoulderHipAxis(input.landmarks);
  if (!axis) {
    return {
      blocked: true,
      prompt: "We can't see your shoulders and hips.",
      chest: null,
      waist: null,
      frontOnly,
    };
  }
  const cleared = removeArms(input.mask, input.landmarks, input.scaleCmPerPx);
  const chest = widestInBand(cleared, axis, chestBand);
  const waist = narrowestInBand(cleared, axis, waistBand);
  if (!chest || !waist) {
    return {
      blocked: true,
      prompt: "We can't separate your shirt from your body. A closer-fitting top will tighten the range.",
      chest: null,
      waist: null,
      frontOnly,
    };
  }
  return { blocked: false, prompt: null, chest, waist, frontOnly };
}

/** Centimeters per mask pixel from a standing height. Calibration replaces this later. */
export function previewScaleCmPerPx(
  mask: PersonMask,
  landmarks: ImageLandmark[],
  enteredHeightCm = 170,
): number {
  const heel = Math.max(
    landmarks[PoseIndex.leftHeel]?.y ?? 0,
    landmarks[PoseIndex.rightHeel]?.y ?? 0,
    landmarks[PoseIndex.leftAnkle]?.y ?? 0,
    landmarks[PoseIndex.rightAnkle]?.y ?? 0,
  );
  const nose = landmarks[PoseIndex.nose]?.y ?? 0.12;
  const crown = Math.max(0, nose - 0.06);
  const spanPx = Math.max(1, (heel - crown) * mask.height);
  return enteredHeightCm / spanPx;
}

export function shoulderHipAxis(landmarks: ImageLandmark[]): {
  shoulderY: number;
  hipY: number;
} | null {
  const leftShoulder = landmarks[PoseIndex.leftShoulder];
  const rightShoulder = landmarks[PoseIndex.rightShoulder];
  const leftHip = landmarks[PoseIndex.leftHip];
  const rightHip = landmarks[PoseIndex.rightHip];
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return null;
  }
  return {
    shoulderY: (leftShoulder.y + rightShoulder.y) / 2,
    hipY: (leftHip.y + rightHip.y) / 2,
  };
}

function removeArms(mask: PersonMask, landmarks: ImageLandmark[], scaleCmPerPx: number): PersonMask {
  const person = new Uint8Array(mask.person);
  for (const side of ["left", "right"] as const) {
    const joints = armJoints(landmarks, side);
    if (!joints) {
      continue;
    }
    const halfPx = armHalfWidthPx(mask, joints, scaleCmPerPx);
    erasePolygon(person, mask.width, mask.height, armPolygon(joints, halfPx, mask.width, mask.height));
  }
  return { ...mask, person };
}

function armJoints(
  landmarks: ImageLandmark[],
  side: "left" | "right",
): [ImageLandmark, ImageLandmark, ImageLandmark] | null {
  const shoulder = landmarks[side === "left" ? PoseIndex.leftShoulder : PoseIndex.rightShoulder];
  const elbow = landmarks[side === "left" ? PoseIndex.leftElbow : PoseIndex.rightElbow];
  const wrist = landmarks[side === "left" ? PoseIndex.leftWrist : PoseIndex.rightWrist];
  if (!shoulder || !elbow || !wrist) {
    return null;
  }
  return [shoulder, elbow, wrist];
}

function armHalfWidthPx(
  mask: PersonMask,
  joints: [ImageLandmark, ImageLandmark, ImageLandmark],
  scaleCmPerPx: number,
): number {
  const [shoulder, elbow] = joints;
  const dx = elbow.x - shoulder.x;
  const dy = elbow.y - shoulder.y;
  const length = Math.hypot(dx, dy) || 1;
  const px = -dy / length;
  const py = dx / length;
  const thicknesses: number[] = [];
  for (let step = 0.2; step <= 0.8; step += 0.2) {
    const x = (shoulder.x + dx * step) * mask.width;
    const y = (shoulder.y + dy * step) * mask.height;
    thicknesses.push(runLength(mask, x, y, px, py));
  }
  thicknesses.sort((a, b) => a - b);
  const robust = thicknesses[0] ?? 0;
  const minPx = 4 / scaleCmPerPx;
  const maxPx = 10 / scaleCmPerPx;
  return Math.min(maxPx, Math.max(minPx, robust / 2));
}

function runLength(mask: PersonMask, x: number, y: number, px: number, py: number): number {
  let negative = 0;
  let positive = 0;
  for (let step = 1; step < 80; step += 1) {
    if (occupied(mask, x - px * step, y - py * step)) {
      negative += 1;
    } else {
      break;
    }
  }
  for (let step = 0; step < 80; step += 1) {
    if (occupied(mask, x + px * step, y + py * step)) {
      positive += 1;
    } else {
      break;
    }
  }
  return negative + positive;
}

function occupied(mask: PersonMask, x: number, y: number): boolean {
  const column = Math.round(x);
  const row = Math.round(y);
  if (column < 0 || row < 0 || column >= mask.width || row >= mask.height) {
    return false;
  }
  return mask.person[row * mask.width + column] !== 0;
}

function armPolygon(
  joints: [ImageLandmark, ImageLandmark, ImageLandmark],
  halfPx: number,
  width: number,
  height: number,
): Array<[number, number]> {
  const forward: Array<[number, number]> = [];
  const back: Array<[number, number]> = [];
  for (let index = 0; index < joints.length; index += 1) {
    const current = joints[index]!;
    const next = joints[Math.min(joints.length - 1, index + 1)]!;
    const prev = joints[Math.max(0, index - 1)]!;
    const dx = (next.x - prev.x) * width;
    const dy = (next.y - prev.y) * height;
    const length = Math.hypot(dx, dy) || 1;
    const ox = ((-dy / length) * halfPx) / width;
    const oy = ((dx / length) * halfPx) / height;
    forward.push([current.x + ox, current.y + oy]);
    back.push([current.x - ox, current.y - oy]);
  }
  return [...forward, ...back.reverse()];
}

function erasePolygon(
  person: Uint8Array,
  width: number,
  height: number,
  polygon: Array<[number, number]>,
): void {
  const pixels = polygon.map(([x, y]) => [x * width, y * height] as [number, number]);
  let minY = height;
  let maxY = 0;
  for (const [, y] of pixels) {
    minY = Math.min(minY, Math.floor(y));
    maxY = Math.max(maxY, Math.ceil(y));
  }
  for (let y = Math.max(0, minY); y <= Math.min(height - 1, maxY); y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (insidePolygon(x, y, pixels)) {
        person[y * width + x] = 0;
      }
    }
  }
}

function insidePolygon(x: number, y: number, polygon: Array<[number, number]>): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, yi] = polygon[index]!;
    const [xj, yj] = polygon[previous]!;
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1) + xi;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

function widestInBand(
  mask: PersonMask,
  axis: { shoulderY: number; hipY: number },
  band: { start: number; end: number },
): StationPick | null {
  return pickBand(mask, axis, band, "max");
}

function narrowestInBand(
  mask: PersonMask,
  axis: { shoulderY: number; hipY: number },
  band: { start: number; end: number },
): StationPick | null {
  return pickBand(mask, axis, band, "min");
}

function pickBand(
  mask: PersonMask,
  axis: { shoulderY: number; hipY: number },
  band: { start: number; end: number },
  mode: "min" | "max",
): StationPick | null {
  const span = axis.hipY - axis.shoulderY;
  if (span <= 0) {
    return null;
  }
  const start = Math.max(0, Math.floor((axis.shoulderY + band.start * span) * mask.height));
  const end = Math.min(mask.height - 1, Math.ceil((axis.shoulderY + band.end * span) * mask.height));
  let best: StationPick | null = null;
  for (let row = start; row <= end; row += 1) {
    const widthPx = rowWidth(mask, row);
    if (widthPx <= 0) {
      continue;
    }
    const fraction = (row / mask.height - axis.shoulderY) / span;
    if (fraction < band.start - 0.001 || fraction > band.end + 0.001) {
      continue;
    }
    const onEdge = fraction <= band.start + 0.02 || fraction >= band.end - 0.02;
    if (
      !best ||
      (mode === "max" && widthPx > best.widthPx) ||
      (mode === "min" && widthPx < best.widthPx)
    ) {
      best = { fraction, widthPx, onEdge };
    }
  }
  return best;
}

function rowWidth(mask: PersonMask, row: number): number {
  let minX = mask.width;
  let maxX = -1;
  const offset = row * mask.width;
  for (let x = 0; x < mask.width; x += 1) {
    if (mask.person[offset + x]) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  return maxX < 0 ? 0 : maxX - minX + 1;
}

export function torsoWidthPx(input: {
  mask: PersonMask;
  landmarks: ImageLandmark[];
  scaleCmPerPx: number;
  fraction: number;
}): number | null {
  const axis = shoulderHipAxis(input.landmarks);
  if (!axis) {
    return null;
  }
  const span = axis.hipY - axis.shoulderY;
  if (span <= 0) {
    return null;
  }
  const cleared = removeArms(input.mask, input.landmarks, input.scaleCmPerPx);
  const row = Math.round((axis.shoulderY + input.fraction * span) * cleared.height);
  if (row < 0 || row >= cleared.height) {
    return null;
  }
  const width = rowWidth(cleared, row);
  return width > 0 ? width : null;
}
