import {
  POSE_LANDMARK_COUNT,
  PoseIndex,
  type ImageLandmark,
  type PersonMask,
  type VisionSample,
} from "@tailor-scan/core";

const frontPoints: Record<number, { x: number; y: number }> = {
  [PoseIndex.nose]: { x: 0.5, y: 0.14 },
  [PoseIndex.leftEar]: { x: 0.46, y: 0.16 },
  [PoseIndex.rightEar]: { x: 0.54, y: 0.16 },
  [PoseIndex.leftShoulder]: { x: 0.38, y: 0.28 },
  [PoseIndex.rightShoulder]: { x: 0.62, y: 0.28 },
  [PoseIndex.leftElbow]: { x: 0.3, y: 0.42 },
  [PoseIndex.rightElbow]: { x: 0.7, y: 0.42 },
  [PoseIndex.leftWrist]: { x: 0.28, y: 0.55 },
  [PoseIndex.rightWrist]: { x: 0.72, y: 0.55 },
  [PoseIndex.leftHip]: { x: 0.44, y: 0.55 },
  [PoseIndex.rightHip]: { x: 0.56, y: 0.55 },
  [PoseIndex.leftKnee]: { x: 0.44, y: 0.72 },
  [PoseIndex.rightKnee]: { x: 0.56, y: 0.72 },
  [PoseIndex.leftAnkle]: { x: 0.44, y: 0.84 },
  [PoseIndex.rightAnkle]: { x: 0.56, y: 0.84 },
  [PoseIndex.leftHeel]: { x: 0.43, y: 0.88 },
  [PoseIndex.rightHeel]: { x: 0.57, y: 0.88 },
};

export function recordedSample(view: "front" | "side", timestampMs: number): VisionSample {
  const landmarks: ImageLandmark[] = Array.from({ length: POSE_LANDMARK_COUNT }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 1,
  }));
  for (const [index, point] of Object.entries(frontPoints)) {
    const shift = view === "side" ? sidePoint(Number(index), point) : point;
    landmarks[Number(index)] = { x: shift.x, y: shift.y, visibility: 1 };
  }
  return {
    landmarks,
    worldLandmarks: landmarks.map((point) => ({
      x: (point.x - 0.5) * 0.45,
      y: (0.55 - point.y) * 1.7,
      z: view === "side" ? 0.02 : 0,
      visibility: 1,
    })),
    mask: recordedMask(view),
    imageWidth: 640,
    imageHeight: 800,
    timestampMs,
    luma: 128,
    sharpness: 40,
  };
}

function recordedMask(view: "front" | "side"): PersonMask {
  const width = 160;
  const height = 200;
  const person = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const half = torsoHalfPx(y, view);
    if (half > 0) {
      const center = width / 2;
      fillSpan(person, width, y, center - half, center + half);
    }
  }
  if (view === "front") {
    stampBone(person, width, height, armChain(view, PoseIndex.leftShoulder, PoseIndex.leftElbow, PoseIndex.leftWrist), 4);
    stampBone(person, width, height, armChain(view, PoseIndex.rightShoulder, PoseIndex.rightElbow, PoseIndex.rightWrist), 4);
  }
  return { width, height, person };
}

function armChain(view: "front" | "side", shoulder: number, elbow: number, wrist: number): number[] {
  return [shoulder, elbow, wrist].flatMap((index) => {
    const point = frontPoints[index]!;
    const placed = view === "side" ? sidePoint(index, point) : point;
    return [placed.x, placed.y];
  });
}

function torsoHalfPx(y: number, view: "front" | "side"): number {
  if (y < 16 || y > 180) {
    return 0;
  }
  if (y < 36) {
    return view === "side" ? 8 : 12;
  }
  // Chest and waist halves are a close-fitting 175 cm body: front diameters about 36 cm and 32 cm, side depths about 25 cm.
  if (y >= 64 && y <= 80) {
    return view === "side" ? 11 : 16;
  }
  if (y >= 84 && y <= 100) {
    return view === "side" ? 11 : 14;
  }
  return view === "side" ? 10 : 15;
}

function fillSpan(person: Uint8Array, width: number, y: number, start: number, end: number): void {
  const left = Math.max(0, Math.floor(start));
  const right = Math.min(width - 1, Math.ceil(end));
  const offset = y * width;
  for (let x = left; x <= right; x += 1) {
    person[offset + x] = 1;
  }
}

function stampBone(
  person: Uint8Array,
  width: number,
  height: number,
  points: readonly number[],
  radius: number,
): void {
  for (let index = 0; index < points.length - 2; index += 2) {
    const x0 = points[index]! * width;
    const y0 = points[index + 1]! * height;
    const x1 = points[index + 2]! * width;
    const y1 = points[index + 3]! * height;
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let step = 0; step <= steps; step += 1) {
      const t = steps === 0 ? 0 : step / steps;
      const cx = x0 + (x1 - x0) * t;
      const cy = y0 + (y1 - y0) * t;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx * dx + dy * dy > radius * radius) {
            continue;
          }
          const x = Math.round(cx + dx);
          const y = Math.round(cy + dy);
          if (x >= 0 && y >= 0 && x < width && y < height) {
            person[y * width + x] = 1;
          }
        }
      }
    }
  }
}

function sidePoint(index: number, point: { x: number; y: number }): { x: number; y: number } {
  if (index === PoseIndex.leftElbow || index === PoseIndex.leftWrist) {
    return { x: 0.4, y: point.y };
  }
  if (index === PoseIndex.rightElbow || index === PoseIndex.rightWrist) {
    return { x: 0.6, y: point.y };
  }
  return { x: 0.5 + (point.x - 0.5) * 0.16, y: point.y };
}
