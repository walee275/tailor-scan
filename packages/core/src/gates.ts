export const POSE_LANDMARK_COUNT = 33;

export const PoseIndex = {
  nose: 0,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftHeel: 29,
  rightHeel: 30,
} as const;

export type ImageLandmark = {
  x: number;
  y: number;
  visibility: number;
};

export type GateId = "exposure" | "blur" | "framing" | "distance" | "stillness";

export type GateStatus = "pass" | "fail" | "pending";

export type GateOutcome = {
  id: GateId;
  label: string;
  status: GateStatus;
  prompt: string;
};

/** Starting thresholds. They sit next to the synthetic fixtures in gates.test.ts. */
export const gateThresholds = {
  lumaMin: 40,
  lumaMax: 210,
  frameMargin: 0.02,
  bodyHeightMin: 0.55,
  bodyHeightMax: 0.9,
  stillnessFraction: 0.02,
  blurFloorShort: 20,
  blurFloor480: 12,
  blurFloor720: 8,
} as const;

export function blurFloor(imageHeight: number): number {
  if (imageHeight >= 720) {
    return gateThresholds.blurFloor720;
  }
  if (imageHeight >= 480) {
    return gateThresholds.blurFloor480;
  }
  return gateThresholds.blurFloorShort;
}

export function meanLuma(rgba: Uint8ClampedArray): number {
  if (rgba.length < 4) {
    return 0;
  }
  let total = 0;
  const pixels = rgba.length / 4;
  for (let index = 0; index < rgba.length; index += 4) {
    total += 0.299 * rgba[index]! + 0.587 * rgba[index + 1]! + 0.114 * rgba[index + 2]!;
  }
  return total / pixels;
}

export function laplacianVariance(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  if (width < 3 || height < 3) {
    return 0;
  }
  const gray = new Float64Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    gray[index] =
      0.299 * rgba[offset]! + 0.587 * rgba[offset + 1]! + 0.114 * rgba[offset + 2]!;
  }
  let count = 0;
  let sum = 0;
  let sumSquares = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = y * width + x;
      const lap =
        gray[center - width]! +
        gray[center + width]! +
        gray[center - 1]! +
        gray[center + 1]! -
        4 * gray[center]!;
      count += 1;
      sum += lap;
      sumSquares += lap * lap;
    }
  }
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

export function checkExposure(luma: number | null): GateOutcome {
  if (luma == null) {
    return pending("exposure", "Light", "Waiting for a frame.");
  }
  if (luma < gateThresholds.lumaMin) {
    return fail("exposure", "Light", "The light is low. Face a window.");
  }
  if (luma > gateThresholds.lumaMax) {
    return fail("exposure", "Light", "The light is harsh. Turn a little from the window.");
  }
  return pass("exposure", "Light", "The light is in range.");
}

export function checkBlur(variance: number | null, imageHeight: number): GateOutcome {
  if (variance == null || imageHeight <= 0) {
    return pending("blur", "Sharpness", "Waiting for a frame.");
  }
  if (variance < blurFloor(imageHeight)) {
    return fail("blur", "Sharpness", "This frame is soft. Hold still.");
  }
  return pass("blur", "Sharpness", "The frame is sharp enough.");
}

export function checkFraming(landmarks: ImageLandmark[] | null): {
  framing: GateOutcome;
  distance: GateOutcome;
} {
  if (!landmarks || landmarks.length < POSE_LANDMARK_COUNT) {
    return {
      framing: pending("framing", "Full body", "Waiting for a pose."),
      distance: pending("distance", "Distance", "Waiting for a pose."),
    };
  }
  const crown = highestVisible(landmarks, [PoseIndex.nose, PoseIndex.leftEar, PoseIndex.rightEar]);
  const heel = lowestVisible(landmarks, [PoseIndex.leftHeel, PoseIndex.rightHeel]);
  if (!crown || !heel) {
    return {
      framing: fail("framing", "Full body", "Step back until your head and feet are both in frame."),
      distance: pending("distance", "Distance", "Waiting until your head and feet are visible."),
    };
  }
  const margin = gateThresholds.frameMargin;
  const inFrame = crown.y >= margin && heel.y <= 1 - margin;
  const span = heel.y - crown.y;
  const framing = inFrame
    ? pass("framing", "Full body", "Your head and feet are in frame.")
    : fail("framing", "Full body", "Step back until your head and feet are both in frame.");
  let distance: GateOutcome;
  if (span < gateThresholds.bodyHeightMin) {
    distance = fail("distance", "Distance", "Step closer.");
  } else if (span > gateThresholds.bodyHeightMax) {
    distance = fail("distance", "Distance", "Step back until your head and feet are both in frame.");
  } else {
    distance = pass("distance", "Distance", "The distance looks right.");
  }
  return { framing, distance };
}

export function checkStillness(frames: ImageLandmark[][]): GateOutcome {
  if (frames.length < 2) {
    return pending("stillness", "Stillness", "Waiting for a short hold.");
  }
  const first = frames[0]!;
  const last = frames[frames.length - 1]!;
  const height = bodySpan(last) ?? bodySpan(first);
  if (height == null || height <= 0) {
    return pending("stillness", "Stillness", "Waiting until your head and feet are visible.");
  }
  let total = 0;
  let count = 0;
  const watched = [PoseIndex.nose, PoseIndex.leftShoulder, PoseIndex.rightShoulder, PoseIndex.leftHip, PoseIndex.rightHip];
  for (const index of watched) {
    const start = first[index];
    const end = last[index];
    if (!start || !end || start.visibility < 0.6 || end.visibility < 0.6) {
      continue;
    }
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    total += Math.hypot(dx, dy);
    count += 1;
  }
  if (count === 0) {
    return pending("stillness", "Stillness", "Waiting until your head and feet are visible.");
  }
  const motion = total / count / height;
  if (motion >= gateThresholds.stillnessFraction) {
    return fail("stillness", "Stillness", "Hold still.");
  }
  return pass("stillness", "Stillness", "Hold still. You are steady.");
}

export function liveGates(input: {
  luma: number | null;
  laplacian: number | null;
  imageHeight: number;
  landmarks: ImageLandmark[] | null;
  recent: ImageLandmark[][];
}): GateOutcome[] {
  const framed = checkFraming(input.landmarks);
  return [
    checkExposure(input.luma),
    checkBlur(input.laplacian, input.imageHeight),
    framed.framing,
    framed.distance,
    checkStillness(input.recent),
  ];
}

export function standingPose(crownY: number, heelY: number): ImageLandmark[] {
  const pose = Array.from({ length: POSE_LANDMARK_COUNT }, () => ({
    x: 0.5,
    y: (crownY + heelY) / 2,
    visibility: 1,
  }));
  pose[PoseIndex.nose] = { x: 0.5, y: crownY, visibility: 1 };
  pose[PoseIndex.leftEar] = { x: 0.46, y: crownY + 0.02, visibility: 1 };
  pose[PoseIndex.rightEar] = { x: 0.54, y: crownY + 0.02, visibility: 1 };
  pose[PoseIndex.leftHeel] = { x: 0.46, y: heelY, visibility: 1 };
  pose[PoseIndex.rightHeel] = { x: 0.54, y: heelY, visibility: 1 };
  return pose;
}

function bodySpan(landmarks: ImageLandmark[]): number | null {
  const framed = checkFraming(landmarks);
  if (framed.framing.status === "pending") {
    return null;
  }
  const crown = highestVisible(landmarks, [PoseIndex.nose, PoseIndex.leftEar, PoseIndex.rightEar]);
  const heel = lowestVisible(landmarks, [PoseIndex.leftHeel, PoseIndex.rightHeel]);
  if (!crown || !heel) {
    return null;
  }
  return heel.y - crown.y;
}

function highestVisible(landmarks: ImageLandmark[], indexes: number[]): ImageLandmark | null {
  let best: ImageLandmark | null = null;
  for (const index of indexes) {
    const point = landmarks[index];
    if (!point || point.visibility < 0.6) {
      continue;
    }
    if (!best || point.y < best.y) {
      best = point;
    }
  }
  return best;
}

function lowestVisible(landmarks: ImageLandmark[], indexes: number[]): ImageLandmark | null {
  let best: ImageLandmark | null = null;
  for (const index of indexes) {
    const point = landmarks[index];
    if (!point || point.visibility < 0.6) {
      continue;
    }
    if (!best || point.y > best.y) {
      best = point;
    }
  }
  return best;
}

function pending(id: GateId, label: string, prompt: string): GateOutcome {
  return { id, label, status: "pending", prompt };
}

function pass(id: GateId, label: string, prompt: string): GateOutcome {
  return { id, label, status: "pass", prompt };
}

function fail(id: GateId, label: string, prompt: string): GateOutcome {
  return { id, label, status: "fail", prompt };
}
