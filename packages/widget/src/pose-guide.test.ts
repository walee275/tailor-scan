import { describe, expect, it } from "vitest";
import { runRecordedGuide } from "./pose-guide";

describe("recorded pose guide", () => {
  it("keeps a front burst only after the gates hold, then a side burst", () => {
    const frames = runRecordedGuide();
    const last = frames[frames.length - 1];
    expect(last?.phase).toBe("done");
    expect(last?.front?.landmarks[0]?.visibility).toBeGreaterThan(0.6);
    expect(last?.side).not.toBeNull();
    expect(last?.prompt).toContain("kept on this device");
    expect(frames.some((frame) => frame.prompt.includes("Turn to your left"))).toBe(true);
  });
});
