import { describe, expect, it } from "vitest";
import { sampleScanResult } from "./sample";
import { loadSessions, percentile80, summarizeSessions } from "./validation";
import { join } from "node:path";

describe("validation fixture", () => {
  it("reproduces the hand-computed error and does not claim the targets", () => {
    const sessions = loadSessions(join(process.cwd(), "../../validation/sessions"));
    const report = summarizeSessions(sessions);
    expect(report.rows).toBe(3);
    expect(report.measurements.chhati).toEqual({ maeCm: 4, p80Cm: 6 });
    expect(report.measurements.kamar).toEqual({ maeCm: 2, p80Cm: 4 });
    expect(report.measurements.baazu).toEqual({ maeCm: 1.5, p80Cm: 2.5 });
    expect(report.measurements.lambai).toEqual({ maeCm: 4, p80Cm: 9 });
    expect(percentile80([2, 4, 6])).toBe(6);
    expect(report.meetsPublishedTargets).toBe(false);
    expect(report.claimsTargetsMet).toBe(false);
    expect(report.rangeBasis).toBe("error-budget");
    expect(report.note).toContain("not a tape study");
    expect(sampleScanResult().measurements.every((item) => item.rangeBasis === "error-budget")).toBe(true);
  });
});
