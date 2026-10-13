import { describe, expect, it } from "vitest";
import { POSE_LANDMARK_COUNT, PoseIndex, type ImageLandmark } from "./gates";
import { selectStations } from "./stations";
import type { PersonMask } from "./vision";

describe("stations", () => {
  it("blocks girth when the arms hang against the torso", () => {
    const landmarks = body();
    landmarks[PoseIndex.leftElbow] = { x: 0.42, y: 0.42, visibility: 1 };
    landmarks[PoseIndex.rightElbow] = { x: 0.58, y: 0.42, visibility: 1 };
    const selected = selectStations({
      mask: torsoMask(),
      landmarks,
      scaleCmPerPx: 0.5,
    });
    expect(selected.blocked).toBe(true);
    expect(selected.chest).toBeNull();
    expect(selected.prompt).toContain("arms");
  });

  it("lands chest and waist inside their bands when the arms are out", () => {
    const selected = selectStations({
      mask: armedMask(),
      landmarks: body(),
      scaleCmPerPx: 0.5,
      frontOnly: true,
    });
    expect(selected.blocked).toBe(false);
    expect(selected.frontOnly).toBe(true);
    expect(selected.chest?.fraction).toBeGreaterThanOrEqual(0.2);
    expect(selected.chest?.fraction).toBeLessThanOrEqual(0.4);
    expect(selected.waist?.fraction).toBeGreaterThanOrEqual(0.55);
    expect(selected.waist?.fraction).toBeLessThanOrEqual(0.78);
    expect(selected.chest?.widthPx).toBeGreaterThan(selected.waist?.widthPx ?? 0);
  });
});

function body(): ImageLandmark[] {
  const landmarks = Array.from({ length: POSE_LANDMARK_COUNT }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 1,
  }));
  landmarks[PoseIndex.leftShoulder] = { x: 0.38, y: 0.2, visibility: 1 };
  landmarks[PoseIndex.rightShoulder] = { x: 0.62, y: 0.2, visibility: 1 };
  landmarks[PoseIndex.leftElbow] = { x: 0.22, y: 0.34, visibility: 1 };
  landmarks[PoseIndex.rightElbow] = { x: 0.78, y: 0.34, visibility: 1 };
  landmarks[PoseIndex.leftWrist] = { x: 0.16, y: 0.48, visibility: 1 };
  landmarks[PoseIndex.rightWrist] = { x: 0.84, y: 0.48, visibility: 1 };
  landmarks[PoseIndex.leftHip] = { x: 0.44, y: 0.62, visibility: 1 };
  landmarks[PoseIndex.rightHip] = { x: 0.56, y: 0.62, visibility: 1 };
  return landmarks;
}

function torsoMask(): PersonMask {
  return paint(120, 160, (x, y) => x >= 48 && x <= 72 && y >= 20 && y <= 140);
}

function armedMask(): PersonMask {
  return paint(120, 160, (x, y) => {
    const torso = x >= 50 && x <= 70 && y >= 24 && y <= 140;
    const chestFlare = x >= 46 && x <= 74 && y >= 40 && y <= 58;
    const waistPinch = x >= 54 && x <= 66 && y >= 78 && y <= 100;
    const leftArm = x >= 18 && x <= 46 && y >= 36 && y <= 78;
    const rightArm = x >= 74 && x <= 102 && y >= 36 && y <= 78;
    return torso || chestFlare || waistPinch || leftArm || rightArm;
  });
}

function paint(width: number, height: number, on: (x: number, y: number) => boolean): PersonMask {
  const person = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (on(x, y)) {
        person[y * width + x] = 1;
      }
    }
  }
  return { width, height, person };
}
