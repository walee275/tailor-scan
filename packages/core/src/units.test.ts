import { describe, expect, it } from "vitest";
import {
  CM_PER_INCH,
  cmToInches,
  displayLength,
  feetAndInchesToCm,
  inchesToCm,
  roundWireCm,
} from "./units";

describe("centimeters and inches", () => {
  it("converts with the exact inch definition", () => {
    expect(CM_PER_INCH).toBe(2.54);
    expect(inchesToCm(1)).toBe(2.54);
    expect(cmToInches(2.54)).toBe(1);
    expect(feetAndInchesToCm(5, 8)).toBeCloseTo(172.72, 10);
  });

  it("keeps wire values at one decimal centimeter", () => {
    expect(roundWireCm(96.44)).toBe(96.4);
    expect(roundWireCm(96.45)).toBe(96.5);
  });

  it("displays centimeters to the nearest half and inches to the nearest quarter", () => {
    expect(displayLength(96.4, "cm")).toEqual({ value: 96.5, unit: "cm" });
    expect(displayLength(96.4, "in")).toEqual({ value: 38, unit: "in" });
    expect(displayLength(2.54, "in")).toEqual({ value: 1, unit: "in" });
    expect(displayLength(10, "in")).toEqual({ value: 4, unit: "in" });
  });
});
