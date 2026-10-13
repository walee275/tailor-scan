import type { ImageLandmark } from "@tailor-scan/core";

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
  for (const point of landmarks) {
    if (!point || point.visibility < 0.6) {
      continue;
    }
    context.beginPath();
    context.arc(point.x * width, point.y * height, 3, 0, Math.PI * 2);
    context.fill();
  }
}
