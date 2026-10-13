import {
  POSE_LANDMARK_COUNT,
  PoseIndex,
  type GateOutcome,
  type ImageLandmark,
} from "./gates";
import type { VisionSample, WorldLandmark } from "./vision";

export const poseGateThresholds = {
  visibility: 0.6,
  armMinDegrees: 15,
  armMaxDegrees: 45,
  sideShoulderRatio: 0.35,
} as const;

const namedPoints: ReadonlyArray<readonly [string, readonly number[]]> = [
  ["nose", [PoseIndex.nose]],
  ["left ear", [PoseIndex.leftEar]],
  ["right ear", [PoseIndex.rightEar]],
  ["left shoulder", [PoseIndex.leftShoulder]],
  ["right shoulder", [PoseIndex.rightShoulder]],
  ["left elbow", [PoseIndex.leftElbow]],
  ["right elbow", [PoseIndex.rightElbow]],
  ["left wrist", [PoseIndex.leftWrist]],
  ["right wrist", [PoseIndex.rightWrist]],
  ["left hip", [PoseIndex.leftHip]],
  ["right hip", [PoseIndex.rightHip]],
  ["left knee", [PoseIndex.leftKnee]],
  ["right knee", [PoseIndex.rightKnee]],
  ["left foot", [PoseIndex.leftAnkle, PoseIndex.leftHeel]],
  ["right foot", [PoseIndex.rightAnkle, PoseIndex.rightHeel]],
];

export function checkVisibility(landmarks: ImageLandmark[] | null): GateOutcome {
  if (!landmarks || landmarks.length < POSE_LANDMARK_COUNT) {
    return { id: "visibility", label: "Pose", status: "pending", prompt: "Waiting for a pose." };
  }
  for (const [name, indexes] of namedPoints) {
    const visible = indexes.some((index) => (landmarks[index]?.visibility ?? 0) >= poseGateThresholds.visibility);
    if (!visible) {
      return {
        id: "visibility",
        label: "Pose",
        status: "fail",
        prompt: `We can't see your ${name}.`,
      };
    }
  }
  return { id: "visibility", label: "Pose", status: "pass", prompt: "The pose landmarks are visible." };
}

export function checkFrontArms(landmarks: ImageLandmark[] | null): GateOutcome {
  if (!landmarks || landmarks.length < POSE_LANDMARK_COUNT) {
    return { id: "arms", label: "Arms", status: "pending", prompt: "Waiting for a pose." };
  }
  const left = upperArmDegrees(landmarks, "left");
  const right = upperArmDegrees(landmarks, "right");
  if (left == null || right == null) {
    return { id: "arms", label: "Arms", status: "fail", prompt: "Move your arms a little away from your sides." };
  }
  const narrow = Math.min(left, right);
  const wide = Math.max(left, right);
  if (narrow < poseGateThresholds.armMinDegrees) {
    return { id: "arms", label: "Arms", status: "fail", prompt: "Move your arms a little away from your sides." };
  }
  if (wide > poseGateThresholds.armMaxDegrees) {
    return { id: "arms", label: "Arms", status: "fail", prompt: "Bring your arms a little closer to your sides." };
  }
  return { id: "arms", label: "Arms", status: "pass", prompt: "Your arms are clear of your sides." };
}

export function checkSideTurn(
  landmarks: ImageLandmark[] | null,
  imageWidth: number,
  frontShoulderPx: number | null,
): GateOutcome {
  if (frontShoulderPx == null) {
    return { id: "turn", label: "Turn", status: "pending", prompt: "The front pose comes first." };
  }
  if (!landmarks || imageWidth <= 0) {
    return { id: "turn", label: "Turn", status: "pending", prompt: "Turn to your left until you are side-on." };
  }
  const width = shoulderWidthPx(landmarks, imageWidth);
  if (width == null) {
    return {
      id: "turn",
      label: "Turn",
      status: "fail",
      prompt: "Turn further until your chest points to the side.",
    };
  }
  if (width >= frontShoulderPx * poseGateThresholds.sideShoulderRatio) {
    return {
      id: "turn",
      label: "Turn",
      status: "fail",
      prompt: "Turn further until your chest points to the side.",
    };
  }
  return { id: "turn", label: "Turn", status: "pass", prompt: "You are side-on." };
}

export function shoulderWidthPx(landmarks: ImageLandmark[], imageWidth: number): number | null {
  const left = landmarks[PoseIndex.leftShoulder];
  const right = landmarks[PoseIndex.rightShoulder];
  if (!left || !right || left.visibility < 0.6 || right.visibility < 0.6) {
    return null;
  }
  return Math.abs(right.x - left.x) * imageWidth;
}

export function averageVisionSamples(samples: VisionSample[]): VisionSample {
  const first = samples[0];
  if (!first) {
    throw new Error("A burst needs at least one frame.");
  }
  return {
    ...first,
    landmarks: averageImage(samples.map((sample) => sample.landmarks)),
    worldLandmarks: averageWorld(samples.map((sample) => sample.worldLandmarks)),
    timestampMs: samples[samples.length - 1]?.timestampMs ?? first.timestampMs,
    sharpness: Math.max(...samples.map((sample) => sample.sharpness ?? 0)),
  };
}

function upperArmDegrees(landmarks: ImageLandmark[], side: "left" | "right"): number | null {
  const shoulder = landmarks[side === "left" ? PoseIndex.leftShoulder : PoseIndex.rightShoulder];
  const elbow = landmarks[side === "left" ? PoseIndex.leftElbow : PoseIndex.rightElbow];
  const hip = landmarks[side === "left" ? PoseIndex.leftHip : PoseIndex.rightHip];
  if (!shoulder || !elbow || !hip) {
    return null;
  }
  if (shoulder.visibility < 0.6 || elbow.visibility < 0.6 || hip.visibility < 0.6) {
    return null;
  }
  return angleDegrees(hip.x - shoulder.x, hip.y - shoulder.y, elbow.x - shoulder.x, elbow.y - shoulder.y);
}

function angleDegrees(ax: number, ay: number, bx: number, by: number): number {
  const denom = Math.hypot(ax, ay) * Math.hypot(bx, by);
  if (denom === 0) {
    return 0;
  }
  const cos = Math.min(1, Math.max(-1, (ax * bx + ay * by) / denom));
  return (Math.acos(cos) * 180) / Math.PI;
}

function averageImage(frames: ImageLandmark[][]): ImageLandmark[] {
  return averagePoints(frames, (point) => [point.x, point.y, point.visibility]).map(([x, y, visibility]) => ({
    x,
    y,
    visibility,
  }));
}

function averageWorld(frames: WorldLandmark[][]): WorldLandmark[] {
  return averagePoints(frames, (point) => [point.x, point.y, point.z, point.visibility]).map(
    ([x, y, z, visibility]) => ({ x, y, z, visibility }),
  );
}

function averagePoints<T>(frames: T[][], read: (point: T) => number[]): number[][] {
  const count = frames[0]?.length ?? 0;
  const totals = Array.from({ length: count }, () => [] as number[]);
  for (const frame of frames) {
    frame.forEach((point, index) => {
      const values = read(point);
      const bucket = totals[index] ?? [];
      values.forEach((value, part) => {
        bucket[part] = (bucket[part] ?? 0) + value;
      });
      totals[index] = bucket;
    });
  }
  return totals.map((bucket) => bucket.map((value) => value / frames.length));
}
