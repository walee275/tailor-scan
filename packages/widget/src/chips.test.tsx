import { liveGates, standingPose } from "@tailor-scan/core";
import { render } from "preact";
import { describe, expect, it } from "vitest";
import { GateChips } from "./chips";

describe("gate chips", () => {
  it("prints a word for each status so color is not the only signal", () => {
    const host = document.createElement("div");
    const pose = standingPose(0.12, 0.86);
    const gates = liveGates({
      luma: 20,
      laplacian: 0,
      imageHeight: 32,
      landmarks: pose,
      recent: [pose, pose.map((point) => ({ ...point, x: point.x + 0.08 }))],
    });
    render(<GateChips gates={gates} />, host);
    const text = host.textContent ?? "";
    expect(text).toContain("Light");
    expect(text).toContain("Fix");
    expect(text).toContain("The light is low");
    expect(text).toContain("Hold still.");
    expect(text).toContain("Pass");
  });
});
