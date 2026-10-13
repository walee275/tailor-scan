import { describe, expect, it } from "vitest";
import {
  ContractError,
  adjustEase,
  applyEase,
  clampEase,
  cuttingCm,
  resolveEase,
} from "./ease";

describe("ease", () => {
  it("uses the built-in shirt and kurta tables", () => {
    expect(resolveEase("shirt", "fitted")).toMatchObject({
      preset: "fitted",
      easeChestCm: 6,
      easeWaistCm: 6,
      sleeveLengthDeltaCm: 0,
      garmentLengthDeltaCm: 0,
      flare: "straight",
    });
    expect(resolveEase("shirt", "regular").easeChestCm).toBe(10);
    expect(resolveEase("shirt", "relaxed")).toMatchObject({
      easeChestCm: 16,
      easeWaistCm: 18,
      sleeveLengthDeltaCm: 1,
      garmentLengthDeltaCm: 1,
    });
    expect(resolveEase("kurta", "fitted")).toMatchObject({
      easeChestCm: 8,
      easeWaistCm: 8,
      sleeveLengthDeltaCm: 0.5,
      garmentLengthDeltaCm: 0,
    });
    expect(resolveEase("kurta", "relaxed")).toMatchObject({
      easeChestCm: 20,
      easeWaistCm: 24,
      sleeveLengthDeltaCm: 1.5,
      garmentLengthDeltaCm: 2,
    });
    expect(resolveEase("kameez", "regular")).toEqual(resolveEase("kurta", "regular"));
  });

  it("lets a shop preset replace the built-in amounts", () => {
    const fit = resolveEase("shirt", "fitted", {
      shirt: {
        fitted: {
          easeChestCm: 4,
          easeWaistCm: 4,
          sleeveLengthDeltaCm: 0,
          garmentLengthDeltaCm: 0,
          flare: "none",
        },
      },
    });
    expect(fit.easeChestCm).toBe(4);
    expect(fit.flare).toBe("none");
  });

  it("requires a shop preset for a custom garment", () => {
    expect(() => resolveEase("custom", "regular")).toThrow(ContractError);
    const fit = resolveEase("custom", "regular", {
      custom: {
        regular: {
          easeChestCm: 12,
          easeWaistCm: 12,
          sleeveLengthDeltaCm: 0,
          garmentLengthDeltaCm: 1,
        },
      },
    });
    expect(fit.preset).toBe("regular");
    expect(fit.flare).toBe("straight");
  });

  it("adds ease to the cutting value and rounds the wire result", () => {
    const body = {
      chhatiCm: cuttingCm({ valueCm: 96.4, overrideCm: 100 }),
      kamarCm: 84,
      baazuCm: 63.5,
      lambaiCm: 102,
    };
    expect(body.chhatiCm).toBe(100);
    expect(
      applyEase(body, resolveEase("kurta", "regular")),
    ).toMatchObject({ chhatiCm: 114, kamarCm: 100, baazuCm: 64.5, lambaiCm: 102 });
    expect(
      applyEase(
        { chhatiCm: 96.44, kamarCm: 0, baazuCm: 0, lambaiCm: 0 },
        resolveEase("shirt", "fitted"),
      ).chhatiCm,
    ).toBe(102.4);
  });

  it("clamps to the default limits and marks a clamped fit custom", () => {
    const clamped = clampEase({
      ...resolveEase("kurta", "regular"),
      easeChestCm: 40,
      sleeveLengthDeltaCm: -3,
      garmentLengthDeltaCm: 20,
    });
    expect(clamped.preset).toBe("custom");
    expect(clamped.easeChestCm).toBe(30);
    expect(clamped.sleeveLengthDeltaCm).toBe(-2);
    expect(clamped.garmentLengthDeltaCm).toBe(15);
    expect(clampEase(resolveEase("shirt", "fitted")).preset).toBe("fitted");
  });

  it("treats a slider change as a custom preset", () => {
    const next = adjustEase(resolveEase("kurta", "regular"), { easeChestCm: 15 });
    expect(next.preset).toBe("custom");
    expect(next.easeChestCm).toBe(15);
    expect(next.easeWaistCm).toBe(16);
  });
});
