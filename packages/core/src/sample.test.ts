import { describe, expect, it } from "vitest";
import { sampleScanResult } from "./sample";
import { validateScanResult } from "./schema";

describe("sample result", () => {
  it("returns a fresh schema-valid clone", () => {
    const first = sampleScanResult();
    const second = sampleScanResult();
    expect(validateScanResult(first).ok).toBe(true);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});
