import { describe, expect, it } from "vitest";
import { openWithDelegateFallback } from "./pose-backend";

describe("pose delegate", () => {
  it("uses the CPU delegate when the GPU delegate fails", async () => {
    const opened = await openWithDelegateFallback(async (delegate) => {
      if (delegate === "GPU") {
        throw new Error("gpu unavailable");
      }
      return "cpu-landmarker";
    });
    expect(opened).toEqual({ delegate: "CPU", value: "cpu-landmarker" });
  });
});
