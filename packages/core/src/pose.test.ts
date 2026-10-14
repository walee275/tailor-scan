import { describe, expect, it } from "vitest";
import { POSE_LANDMARK_COUNT, PoseIndex } from "./gates";
import {
  averageVisionSamples,
  checkFrontArms,
  checkSideArms,
  checkSideFrame,
  checkSideTurn,
  checkSideVisibility,
  checkVisibility,
  shoulderWidthPx,
} from "./pose";
import type { VisionSample } from "./vision";

describe("pose gates", () => {
  it("names a hidden landmark and accepts a visible pose", () => {
    const hidden = pose();
    hidden[PoseIndex.leftElbow] = { x: 0.3, y: 0.4, visibility: 0.1 };
    expect(checkVisibility(hidden).prompt).toBe("We can't see your left elbow.");
    expect(checkVisibility(pose()).status).toBe("pass");
  });

  it("blocks arms that hang against the torso and passes arms held out", () => {
    const down = pose();
    down[PoseIndex.leftElbow] = { x: 0.41, y: 0.46, visibility: 1 };
    down[PoseIndex.rightElbow] = { x: 0.59, y: 0.46, visibility: 1 };
    expect(checkFrontArms(down).prompt).toBe("Move your arms a little away from your sides.");
    expect(checkFrontArms(pose()).status).toBe("pass");
  });

  it("requires the shoulders to narrow before a side pose passes", () => {
    const front = pose();
    const frontWidth = shoulderWidthPx(front, 640);
    const side = pose();
    side[PoseIndex.leftShoulder] = { x: 0.48, y: 0.28, visibility: 1 };
    side[PoseIndex.rightShoulder] = { x: 0.52, y: 0.28, visibility: 1 };
    expect(checkSideTurn(front, 640, frontWidth).status).toBe("fail");
    expect(checkSideTurn(side, 640, frontWidth).status).toBe("pass");
    expect(checkSideTurn(side, 640, null).status).toBe("pending");
  });

  it("accepts a profile when the far shoulder and foot are hidden", () => {
    const front = pose();
    const frontWidth = shoulderWidthPx(front, 640);
    const profile = pose();
    for (const index of [
      PoseIndex.leftEar,
      PoseIndex.leftShoulder,
      PoseIndex.leftElbow,
      PoseIndex.leftWrist,
      PoseIndex.leftHip,
      PoseIndex.leftKnee,
      PoseIndex.leftAnkle,
      PoseIndex.leftHeel,
    ]) {
      const point = profile[index];
      if (point) {
        point.visibility = 0.05;
      }
    }
    expect(checkVisibility(profile).prompt).toContain("left");
    expect(checkSideVisibility(profile).status).toBe("pass");
    expect(checkSideTurn(profile, 640, frontWidth).status).toBe("pass");
    expect(checkSideArms(profile).status).toBe("pass");
    expect(checkSideFrame(profile).status).toBe("pass");
    expect(checkSideFrame(profile).label).toBe("In frame");
  });

  it("averages a burst instead of keeping one frame", () => {
    const first = sample(0.4);
    const second = sample(0.6);
    const firstNose = first.worldLandmarks[PoseIndex.nose];
    const secondNose = second.worldLandmarks[PoseIndex.nose];
    if (firstNose) {
      firstNose.z = 0;
    }
    if (secondNose) {
      secondNose.z = 0.3;
    }
    const averaged = averageVisionSamples([first, second]);
    expect(averaged.landmarks).toHaveLength(POSE_LANDMARK_COUNT);
    expect(averaged.landmarks[PoseIndex.nose]?.x).toBeCloseTo(0.5);
    expect(averaged.worldLandmarks[PoseIndex.nose]?.z).toBeCloseTo(0.15);
  });
});

function pose(): ReturnType<typeof sample>["landmarks"] {
  return sample(0.5).landmarks;
}

function sample(x: number): VisionSample {
  const landmarks = Array.from({ length: POSE_LANDMARK_COUNT }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 1,
  }));
  landmarks[PoseIndex.nose] = { x: 0.5, y: 0.14, visibility: 1 };
  landmarks[PoseIndex.leftEar] = { x: 0.46, y: 0.16, visibility: 1 };
  landmarks[PoseIndex.rightEar] = { x: 0.54, y: 0.16, visibility: 1 };
  landmarks[PoseIndex.leftShoulder] = { x: 0.38, y: 0.28, visibility: 1 };
  landmarks[PoseIndex.rightShoulder] = { x: 0.62, y: 0.28, visibility: 1 };
  landmarks[PoseIndex.leftElbow] = { x: 0.3, y: 0.42, visibility: 1 };
  landmarks[PoseIndex.rightElbow] = { x: 0.7, y: 0.42, visibility: 1 };
  landmarks[PoseIndex.leftWrist] = { x: 0.28, y: 0.55, visibility: 1 };
  landmarks[PoseIndex.rightWrist] = { x: 0.72, y: 0.55, visibility: 1 };
  landmarks[PoseIndex.leftHip] = { x: 0.44, y: 0.55, visibility: 1 };
  landmarks[PoseIndex.rightHip] = { x: 0.56, y: 0.55, visibility: 1 };
  landmarks[PoseIndex.leftKnee] = { x: 0.44, y: 0.72, visibility: 1 };
  landmarks[PoseIndex.rightKnee] = { x: 0.56, y: 0.72, visibility: 1 };
  landmarks[PoseIndex.leftAnkle] = { x: 0.44, y: 0.84, visibility: 1 };
  landmarks[PoseIndex.rightAnkle] = { x: 0.56, y: 0.84, visibility: 1 };
  landmarks[PoseIndex.leftHeel] = { x: 0.43, y: 0.88, visibility: 1 };
  landmarks[PoseIndex.rightHeel] = { x: 0.57, y: 0.88, visibility: 1 };
  landmarks[PoseIndex.nose] = { x, y: 0.14, visibility: 1 };
  return {
    landmarks,
    worldLandmarks: landmarks.map((point, index) => ({
      x: point.x - 0.5,
      y: 0.55 - point.y,
      z: index === PoseIndex.nose ? (x - 0.5) * 3 : 0,
      visibility: 1,
    })),
    mask: null,
    imageWidth: 640,
    imageHeight: 800,
    timestampMs: 0,
    luma: 120,
    sharpness: 40,
  };
}
