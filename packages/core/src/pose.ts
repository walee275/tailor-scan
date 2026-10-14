import {
  POSE_LANDMARK_COUNT,
  PoseIndex,
  gateThresholds,
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

const sidePairs: ReadonlyArray<readonly [string, readonly number[]]> = [
  ["head", [PoseIndex.nose, PoseIndex.leftEar, PoseIndex.rightEar]],
  ["shoulder", [PoseIndex.leftShoulder, PoseIndex.rightShoulder]],
  ["elbow", [PoseIndex.leftElbow, PoseIndex.rightElbow]],
  ["wrist", [PoseIndex.leftWrist, PoseIndex.rightWrist]],
  ["hip", [PoseIndex.leftHip, PoseIndex.rightHip]],
  ["knee", [PoseIndex.leftKnee, PoseIndex.rightKnee]],
  ["foot", [PoseIndex.leftAnkle, PoseIndex.leftHeel, PoseIndex.rightAnkle, PoseIndex.rightHeel]],
];

/** Profile view: one side of each pair is enough. The far shoulder is hidden on purpose. */
export function checkSideVisibility(landmarks: ImageLandmark[] | null): GateOutcome {
  if (!landmarks || landmarks.length < POSE_LANDMARK_COUNT) {
    return { id: "visibility", label: "Pose", status: "pending", prompt: "Waiting for a pose." };
  }
  for (const [name, indexes] of sidePairs) {
    const visible = indexes.some((index) => (landmarks[index]?.visibility ?? 0) >= poseGateThresholds.visibility);
    if (!visible) {
      return {
        id: "visibility",
        label: "Pose",
        status: "fail",
        prompt: `We can't see a ${name} from the side.`,
      };
    }
  }
  return { id: "visibility", label: "Pose", status: "pass", prompt: "The near side of the body is visible." };
}

/** Judge only the arm the camera can see. A hidden far arm is not a failure. */
export function checkSideArms(landmarks: ImageLandmark[] | null): GateOutcome {
  if (!landmarks || landmarks.length < POSE_LANDMARK_COUNT) {
    return { id: "arms", label: "Arms", status: "pending", prompt: "Waiting for a pose." };
  }
  const angles = [upperArmDegrees(landmarks, "left"), upperArmDegrees(landmarks, "right")].filter(
    (angle): angle is number => angle != null,
  );
  if (angles.length === 0) {
    return { id: "arms", label: "Arms", status: "fail", prompt: "Move the near arm a little away from your side." };
  }
  const narrow = Math.min(...angles);
  const wide = Math.max(...angles);
  if (narrow < poseGateThresholds.armMinDegrees) {
    return { id: "arms", label: "Arms", status: "fail", prompt: "Move the near arm a little away from your side." };
  }
  if (wide > poseGateThresholds.armMaxDegrees) {
    return { id: "arms", label: "Arms", status: "fail", prompt: "Bring the near arm a little closer to your side." };
  }
  return { id: "arms", label: "Arms", status: "pass", prompt: "The near arm is clear of your side." };
}

export function checkSideFrame(landmarks: ImageLandmark[] | null): GateOutcome {
  if (!landmarks || landmarks.length < POSE_LANDMARK_COUNT) {
    return { id: "framing", label: "In frame", status: "pending", prompt: "Waiting for a pose." };
  }
  const span = sideSpan(landmarks);
  if (!span) {
    return {
      id: "framing",
      label: "In frame",
      status: "fail",
      prompt: "Keep your head and the near foot in frame.",
    };
  }
  const margin = gateThresholds.frameMargin;
  if (span.headY < margin || span.footY > 1 - margin) {
    return {
      id: "framing",
      label: "In frame",
      status: "fail",
      prompt: "Keep your head and the near foot in frame.",
    };
  }
  if (span.height < gateThresholds.bodyHeightMin) {
    return { id: "framing", label: "In frame", status: "fail", prompt: "Step closer." };
  }
  if (span.height > gateThresholds.bodyHeightMax) {
    return {
      id: "framing",
      label: "In frame",
      status: "fail",
      prompt: "Step back until your head and the near foot are in frame.",
    };
  }
  return { id: "framing", label: "In frame", status: "pass", prompt: "Your head and the near foot are in frame." };
}

export function checkSideStillness(frames: ImageLandmark[][]): GateOutcome {
  if (frames.length < 2) {
    return { id: "stillness", label: "Stillness", status: "pending", prompt: "Waiting for a short hold." };
  }
  const first = frames[0]!;
  const last = frames[frames.length - 1]!;
  const height = sideSpan(last)?.height ?? sideSpan(first)?.height;
  if (height == null || height <= 0) {
    return {
      id: "stillness",
      label: "Stillness",
      status: "pending",
      prompt: "Waiting until your head and the near foot are visible.",
    };
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
    total += Math.hypot(end.x - start.x, end.y - start.y);
    count += 1;
  }
  if (count === 0) {
    return {
      id: "stillness",
      label: "Stillness",
      status: "pending",
      prompt: "Waiting until your head and the near foot are visible.",
    };
  }
  if (total / count / height >= gateThresholds.stillnessFraction) {
    return { id: "stillness", label: "Stillness", status: "fail", prompt: "Hold the side pose still." };
  }
  return { id: "stillness", label: "Stillness", status: "pass", prompt: "Hold still. You are steady." };
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
    return { id: "turn", label: "Turn", status: "pending", prompt: "Turn 90° until you are side-on." };
  }
  const leftOn = (landmarks[PoseIndex.leftShoulder]?.visibility ?? 0) >= poseGateThresholds.visibility;
  const rightOn = (landmarks[PoseIndex.rightShoulder]?.visibility ?? 0) >= poseGateThresholds.visibility;
  if (leftOn !== rightOn) {
    return { id: "turn", label: "Turn", status: "pass", prompt: "You are side-on." };
  }
  const width = shoulderWidthPx(landmarks, imageWidth);
  if (width == null || width >= frontShoulderPx * poseGateThresholds.sideShoulderRatio) {
    return {
      id: "turn",
      label: "Turn",
      status: "fail",
      prompt: "Turn 90° further until your chest points to the side.",
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

function sideSpan(landmarks: ImageLandmark[]): { headY: number; footY: number; height: number } | null {
  const head = firstVisible(landmarks, [PoseIndex.nose, PoseIndex.leftEar, PoseIndex.rightEar], "highest");
  const foot = firstVisible(
    landmarks,
    [PoseIndex.leftHeel, PoseIndex.rightHeel, PoseIndex.leftAnkle, PoseIndex.rightAnkle],
    "lowest",
  );
  if (!head || !foot || foot.y <= head.y) {
    return null;
  }
  return { headY: head.y, footY: foot.y, height: foot.y - head.y };
}

function firstVisible(
  landmarks: ImageLandmark[],
  indexes: number[],
  edge: "highest" | "lowest",
): ImageLandmark | null {
  let best: ImageLandmark | null = null;
  for (const index of indexes) {
    const point = landmarks[index];
    if (!point || point.visibility < poseGateThresholds.visibility) {
      continue;
    }
    if (!best || (edge === "highest" ? point.y < best.y : point.y > best.y)) {
      best = point;
    }
  }
  return best;
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
