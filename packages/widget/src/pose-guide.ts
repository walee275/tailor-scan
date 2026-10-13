import {
  checkFrontArms,
  checkSideTurn,
  checkVisibility,
  liveGates,
  shoulderWidthPx,
  averageVisionSamples,
  type GateOutcome,
  type ImageLandmark,
  type VisionSample,
} from "@tailor-scan/core";
import { recordedSample } from "./recorded-pose";

export const STEADY_MS = 1000;
export const BURST_FRAMES = 15;

export type PosePhase = "front" | "turn" | "side" | "done";

export type GuideSnapshot = {
  phase: PosePhase;
  steadySinceMs: number | null;
  burst: VisionSample[];
  recent: ImageLandmark[][];
  front: VisionSample | null;
  side: VisionSample | null;
  prompt: string;
  gates: GateOutcome[];
};

export function createGuide(): GuideSnapshot {
  return {
    phase: "front",
    steadySinceMs: null,
    burst: [],
    recent: [],
    front: null,
    side: null,
    prompt: "Step back until your head and feet are both in frame.",
    gates: [],
  };
}

export function stepGuide(state: GuideSnapshot, sample: VisionSample, nowMs: number): GuideSnapshot {
  if (state.phase === "done") {
    return state;
  }
  const recent = [...state.recent, sample.landmarks].slice(-4);
  const frontShoulder =
    state.front == null ? null : shoulderWidthPx(state.front.landmarks, state.front.imageWidth);
  const gates = poseGates(sample, recent, state.phase, frontShoulder);
  const blocking = gates.find((gate) => gate.status !== "pass");
  if (blocking) {
    return {
      ...state,
      recent,
      steadySinceMs: null,
      burst: [],
      prompt: blocking.prompt,
      gates,
    };
  }
  if (state.phase === "turn") {
    return {
      ...state,
      phase: "side",
      recent,
      steadySinceMs: null,
      burst: [],
      prompt: "Hold the side pose.",
      gates,
    };
  }
  const steadySinceMs = state.steadySinceMs ?? nowMs;
  if (nowMs - steadySinceMs < STEADY_MS) {
    return { ...state, recent, steadySinceMs, prompt: "Hold still.", gates };
  }
  const burst = [...state.burst, sample].slice(-BURST_FRAMES);
  if (burst.length < BURST_FRAMES) {
    return { ...state, recent, steadySinceMs, burst, prompt: "Hold still.", gates };
  }
  const averaged = averageVisionSamples(burst);
  if (state.phase === "front") {
    return {
      ...state,
      phase: "turn",
      recent,
      steadySinceMs: null,
      burst: [],
      front: averaged,
      prompt: "Turn to your left until you are side-on.",
      gates,
    };
  }
  return {
    ...state,
    phase: "done",
    recent,
    steadySinceMs: null,
    burst: [],
    side: averaged,
    prompt: "Front and side poses are kept on this device.",
    gates,
  };
}

export function runRecordedGuide(): GuideSnapshot[] {
  const frames: GuideSnapshot[] = [];
  let state = createGuide();
  let time = 0;
  for (let step = 0; step < 80 && state.phase !== "done"; step += 1) {
    const view = state.phase === "front" ? "front" : "side";
    state = stepGuide(state, recordedSample(view, time), time);
    frames.push(state);
    time += 200;
  }
  return frames;
}

function poseGates(
  sample: VisionSample,
  recent: ImageLandmark[][],
  phase: PosePhase,
  frontShoulderPx: number | null,
): GateOutcome[] {
  const gates = liveGates({
    luma: sample.luma,
    laplacian: sample.sharpness,
    imageHeight: sample.imageHeight,
    landmarks: sample.landmarks,
    recent,
  });
  gates.push(checkVisibility(sample.landmarks));
  if (phase === "front" || phase === "side") {
    gates.push(checkFrontArms(sample.landmarks));
  }
  if (phase === "turn" || phase === "side") {
    gates.push(checkSideTurn(sample.landmarks, sample.imageWidth, frontShoulderPx));
  }
  return gates;
}
