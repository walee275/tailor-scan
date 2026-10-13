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
  const centerX = torsoCenterX(input.landmarks, cleared.width);
  const chest = widestInBand(cleared, axis, chestBand, centerX);
  const waist = narrowestInBand(cleared, axis, waistBand, centerX);
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
  const centerX = torsoCenterX(landmarks, mask.width);
  // Keep the center run. A side-view arm can lie inside that silhouette, and erasing it would delete the depth.
  const torso = new Uint8Array(mask.person.length);
  for (let row = 0; row < mask.height; row += 1) {
    markTorsoRun(torso, mask, row, centerX);
  }
  const person = new Uint8Array(mask.person);
  for (const side of ["left", "right"] as const) {
    const joints = armJoints(landmarks, side);
    if (!joints) {
      continue;
    }
    const halfPx = armHalfWidthPx(mask, joints, scaleCmPerPx);
    eraseArm(person, torso, mask.width, mask.height, joints, halfPx);
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
  const dx = (elbow.x - shoulder.x) * mask.width;
  const dy = (elbow.y - shoulder.y) * mask.height;
  const length = Math.hypot(dx, dy) || 1;
  const px = -dy / length;
  const py = dx / length;
  const thicknesses: number[] = [];
  for (let step = 0.2; step <= 0.8; step += 0.2) {
    const x = shoulder.x * mask.width + dx * step;
    const y = shoulder.y * mask.height + dy * step;
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

function eraseArm(
  person: Uint8Array,
  torso: Uint8Array,
  width: number,
  height: number,
  joints: [ImageLandmark, ImageLandmark, ImageLandmark],
  halfPx: number,
): void {
  const points = joints.map((joint) => ({ x: joint.x * width, y: joint.y * height }));
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  for (const point of points) {
    minX = Math.min(minX, Math.floor(point.x - halfPx));
    maxX = Math.max(maxX, Math.ceil(point.x + halfPx));
    minY = Math.min(minY, Math.floor(point.y - halfPx));
    maxY = Math.max(maxY, Math.ceil(point.y + halfPx));
  }
  const limit = halfPx * halfPx;
  for (let y = Math.max(0, minY); y <= Math.min(height - 1, maxY); y += 1) {
    for (let x = Math.max(0, minX); x <= Math.min(width - 1, maxX); x += 1) {
      const index = y * width + x;
      if (torso[index] === 0 && distanceToPolylineSquared(x, y, points) <= limit) {
        person[index] = 0;
      }
    }
  }
}

function distanceToPolylineSquared(
  x: number,
  y: number,
  points: Array<{ x: number; y: number }>,
): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length - 1; index += 1) {
    best = Math.min(best, distanceToSegmentSquared(x, y, points[index]!, points[index + 1]!));
  }
  return best;
}

function distanceToSegmentSquared(
  x: number,
  y: number,
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.min(1, Math.max(0, ((x - start.x) * dx + (y - start.y) * dy) / length));
  const px = start.x + dx * t - x;
  const py = start.y + dy * t - y;
  return px * px + py * py;
}

function widestInBand(
  mask: PersonMask,
  axis: { shoulderY: number; hipY: number },
  band: { start: number; end: number },
  centerX: number,
): StationPick | null {
  return pickBand(mask, axis, band, "max", centerX);
}

function narrowestInBand(
  mask: PersonMask,
  axis: { shoulderY: number; hipY: number },
  band: { start: number; end: number },
  centerX: number,
): StationPick | null {
  return pickBand(mask, axis, band, "min", centerX);
}

function torsoCenterX(landmarks: ImageLandmark[], width: number): number {
  const left = landmarks[PoseIndex.leftShoulder];
  const right = landmarks[PoseIndex.rightShoulder];
  if (!left || !right) {
    return width / 2;
  }
  return ((left.x + right.x) / 2) * width;
}

function pickBand(
  mask: PersonMask,
  axis: { shoulderY: number; hipY: number },
  band: { start: number; end: number },
  mode: "min" | "max",
  centerX: number,
): StationPick | null {
  const span = axis.hipY - axis.shoulderY;
  if (span <= 0) {
    return null;
  }
  const start = Math.max(0, Math.floor((axis.shoulderY + band.start * span) * mask.height));
  const end = Math.min(mask.height - 1, Math.ceil((axis.shoulderY + band.end * span) * mask.height));
  let best: StationPick | null = null;
  for (let row = start; row <= end; row += 1) {
    const widthPx = rowWidth(mask, row, centerX);
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

function markTorsoRun(torso: Uint8Array, mask: PersonMask, row: number, centerX: number): void {
  const run = torsoRun(mask, row, centerX);
  if (!run) {
    return;
  }
  const offset = row * mask.width;
  for (let x = run.left; x <= run.right; x += 1) {
    torso[offset + x] = 1;
  }
}

function rowWidth(mask: PersonMask, row: number, centerX: number): number {
  const run = torsoRun(mask, row, centerX);
  return run ? run.right - run.left + 1 : 0;
}

function torsoRun(
  mask: PersonMask,
  row: number,
  centerX: number,
): { left: number; right: number } | null {
  const offset = row * mask.width;
  const center = Math.min(mask.width - 1, Math.max(0, Math.round(centerX)));
  let anchor = mask.person[offset + center] ? center : -1;
  if (anchor < 0) {
    for (let distance = 1; distance < mask.width && anchor < 0; distance += 1) {
      if (center - distance >= 0 && mask.person[offset + center - distance]) {
        anchor = center - distance;
      } else if (center + distance < mask.width && mask.person[offset + center + distance]) {
        anchor = center + distance;
      }
    }
  }
  if (anchor < 0) {
    return null;
  }
  let left = anchor;
  let right = anchor;
  while (left > 0 && mask.person[offset + left - 1]) {
    left -= 1;
  }
  while (right < mask.width - 1 && mask.person[offset + right + 1]) {
    right += 1;
  }
  return { left, right };
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
  const width = rowWidth(cleared, row, torsoCenterX(input.landmarks, cleared.width));
  return width > 0 ? width : null;
}
