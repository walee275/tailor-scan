import { PoseIndex } from "@tailor-scan/core";
import { describe, expect, it } from "vitest";
import { phaseInstruction, runRecordedGuide, stepGuide } from "./pose-guide";
import { recordedSample } from "./recorded-pose";

describe("recorded pose guide", () => {
  it("keeps a front burst only after the gates hold, then a side burst", () => {
    const frames = runRecordedGuide();
    const last = frames[frames.length - 1];
    expect(last?.phase).toBe("done");
    expect(last?.front?.landmarks[0]?.visibility).toBeGreaterThan(0.6);
    expect(last?.side).not.toBeNull();
    expect(last?.prompt).toContain("kept on this device");
    expect(frames.some((frame) => frame.prompt.includes("Turn 90°"))).toBe(true);
  });

  it("locks the front pose and stops scoring it while the subject turns", () => {
    const frames = runRecordedGuide();
    const facing = frames.find((frame) => frame.phase === "front");
    const turn = frames.find((frame) => frame.phase === "turn");
    expect(phaseInstruction(facing?.phase ?? null)).toBe("Step 1 of 2: face the camera");
    expect(facing?.gates.some((gate) => gate.label === "Full body")).toBe(true);
    expect(facing?.front).toBeNull();
    expect(turn?.front).not.toBeNull();
    expect(phaseInstruction(turn?.phase ?? null)).toBe("Step 2 of 2: turn 90°");
    expect(turn?.gates.some((gate) => gate.label === "Full body")).toBe(false);
    expect(turn?.gates.some((gate) => gate.prompt.includes("left shoulder"))).toBe(false);

    const occluded = recordedSample("side", 20_000);
    for (const index of [PoseIndex.leftShoulder, PoseIndex.leftElbow, PoseIndex.leftEar]) {
      const point = occluded.landmarks[index];
      if (point) {
        point.visibility = 0.05;
      }
    }
    const next = stepGuide(turn!, occluded, 20_000);
    expect(next.phase).not.toBe("front");
    expect(next.front).toBe(turn?.front);
    expect(phaseInstruction(next.phase)).toBe("Step 2 of 2: turn 90°");
    expect(next.gates.some((gate) => gate.label === "Full body")).toBe(false);
    expect(next.gates.some((gate) => gate.prompt.includes("left shoulder"))).toBe(false);
    expect(next.gates.find((gate) => gate.id === "turn")?.status).toBe("pass");
    expect(phaseInstruction("done")).toBe("Both poses captured");
  });
});
