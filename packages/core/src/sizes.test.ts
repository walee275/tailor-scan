import { describe, expect, it } from "vitest";
import { ContractError } from "./ease";
import { overlappingSizes, type SizedMeasurement } from "./sizes";

const chest: SizedMeasurement = {
  id: "chhati",
  valueCm: 96.4,
  overrideCm: null,
  rangeCm: [91.5, 101.5],
};

describe("size overlap", () => {
  it("returns every size whose interval overlaps the range, in chart order", () => {
    const matches = overlappingSizes([chest], [
      { id: "s", label: "S", measurementId: "chhati", minCm: 80, maxCm: 90 },
      { id: "m", label: "M", measurementId: "chhati", minCm: 88, maxCm: 98 },
      { id: "l", label: "L", measurementId: "chhati", minCm: 96, maxCm: 106 },
      { id: "xl", label: "XL", measurementId: "chhati", minCm: 104, maxCm: 114 },
    ]);
    expect(matches.map((size) => size.id)).toEqual(["m", "l"]);
  });

  it("treats a shared endpoint as an overlap", () => {
    const matches = overlappingSizes([chest], [
      { id: "edge", label: "Edge", measurementId: "chhati", minCm: 101.5, maxCm: 110 },
    ]);
    expect(matches).toEqual([
      { id: "edge", label: "Edge", measurementId: "chhati" },
    ]);
  });

  it("does not match a size graded on a different measurement", () => {
    const matches = overlappingSizes([chest], [
      { id: "waist-m", label: "M", measurementId: "kamar", minCm: 70, maxCm: 110 },
    ]);
    expect(matches).toEqual([]);
  });

  it("uses the override as a point when the camera range is missing", () => {
    const matches = overlappingSizes(
      [{ id: "chhati", valueCm: 90, overrideCm: 100, rangeCm: null }],
      [
        { id: "s", label: "S", measurementId: "chhati", minCm: 80, maxCm: 95 },
        { id: "m", label: "M", measurementId: "chhati", minCm: 96, maxCm: 104 },
      ],
    );
    expect(matches.map((size) => size.id)).toEqual(["m"]);
  });

  it("returns an empty list for an empty chart", () => {
    expect(overlappingSizes([chest], [])).toEqual([]);
  });

  it("rejects a size whose minimum is above its maximum", () => {
    expect(() =>
      overlappingSizes([chest], [
        { id: "bad", label: "Bad", measurementId: "chhati", minCm: 100, maxCm: 90 },
      ]),
    ).toThrow(ContractError);
  });
});
