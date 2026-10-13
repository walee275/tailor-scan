import { PoseIndex, type ImageLandmark } from "@tailor-scan/core";

export const bodyConnections: ReadonlyArray<readonly [number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [27, 29],
  [24, 26],
  [26, 28],
  [28, 30],
];

export function drawSkeleton(
  context: CanvasRenderingContext2D,
  landmarks: ImageLandmark[],
  width: number,
  height: number,
  chestFraction: number | null = null,
  waistFraction: number | null = null,
): void {
  context.clearRect(0, 0, width, height);
  context.strokeStyle = "#f4efe4";
  context.fillStyle = "#f4efe4";
  context.lineWidth = 2;
  for (const [start, end] of bodyConnections) {
    const a = landmarks[start];
    const b = landmarks[end];
    if (!a || !b || a.visibility < 0.6 || b.visibility < 0.6) {
      continue;
    }
    context.beginPath();
    context.moveTo(a.x * width, a.y * height);
    context.lineTo(b.x * width, b.y * height);
    context.stroke();
  }
  drawStationLines(context, landmarks, chestFraction, waistFraction, width, height);
  for (const point of landmarks) {
    if (!point || point.visibility < 0.6) {
      continue;
    }
    context.beginPath();
    context.arc(point.x * width, point.y * height, 3, 0, Math.PI * 2);
    context.fill();
  }
}

function drawStationLines(
  context: CanvasRenderingContext2D,
  landmarks: ImageLandmark[],
  chestFraction: number | null,
  waistFraction: number | null,
  width: number,
  height: number,
): void {
  const shoulder = midpoint(landmarks[PoseIndex.leftShoulder], landmarks[PoseIndex.rightShoulder]);
  const hip = midpoint(landmarks[PoseIndex.leftHip], landmarks[PoseIndex.rightHip]);
  if (!shoulder || !hip) {
    return;
  }
  context.strokeStyle = "#e7c27a";
  context.setLineDash([4, 4]);
  for (const fraction of [chestFraction, waistFraction]) {
    if (fraction == null) {
      continue;
    }
    const y = (shoulder.y + (hip.y - shoulder.y) * fraction) * height;
    context.beginPath();
    context.moveTo(width * 0.28, y);
    context.lineTo(width * 0.72, y);
    context.stroke();
  }
  context.setLineDash([]);
}

function midpoint(left: ImageLandmark | undefined, right: ImageLandmark | undefined): ImageLandmark | null {
  if (!left || !right) {
    return null;
  }
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2, visibility: 1 };
}
