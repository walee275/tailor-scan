import { POSE_LANDMARK_COUNT, PoseIndex, type ImageLandmark, type VisionSample } from "@tailor-scan/core";

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
    mask: null,
    imageWidth: 640,
    imageHeight: 800,
    timestampMs,
    luma: 128,
    sharpness: 40,
  };
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
