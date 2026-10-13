import type {
  EasePreset,
  FitPreference,
  Flare,
  GarmentId,
  GarmentMeasurements,
} from "./result";
import { roundWireCm } from "./units";

export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

export type EaseAmounts = {
  easeChestCm: number;
  easeWaistCm: number;
  sleeveLengthDeltaCm: number;
  garmentLengthDeltaCm: number;
  flare?: Flare;
};

export type EaseLimits = {
  easeChestCm: { min: number; max: number };
  easeWaistCm: { min: number; max: number };
  sleeveLengthDeltaCm: { min: number; max: number };
  garmentLengthDeltaCm: { min: number; max: number };
};

export type EasePresets = Partial<
  Record<GarmentId, Partial<Record<EasePreset, EaseAmounts>>>
>;

export type CuttingBody = {
  chhatiCm: number;
  kamarCm: number;
  baazuCm: number;
  lambaiCm: number;
};

export const defaultEaseLimits: EaseLimits = {
  easeChestCm: { min: 0, max: 30 },
  easeWaistCm: { min: 0, max: 30 },
  sleeveLengthDeltaCm: { min: -2, max: 4 },
  garmentLengthDeltaCm: { min: -4, max: 15 },
};

const kurtaEase: Record<EasePreset, EaseAmounts> = {
  fitted: {
    easeChestCm: 8,
    easeWaistCm: 8,
    sleeveLengthDeltaCm: 0.5,
    garmentLengthDeltaCm: 0,
  },
  regular: {
    easeChestCm: 14,
    easeWaistCm: 16,
    sleeveLengthDeltaCm: 1,
    garmentLengthDeltaCm: 0,
  },
  relaxed: {
    easeChestCm: 20,
    easeWaistCm: 24,
    sleeveLengthDeltaCm: 1.5,
    garmentLengthDeltaCm: 2,
  },
};

const shirtEase: Record<EasePreset, EaseAmounts> = {
  fitted: {
    easeChestCm: 6,
    easeWaistCm: 6,
    sleeveLengthDeltaCm: 0,
    garmentLengthDeltaCm: 0,
  },
  regular: {
    easeChestCm: 10,
    easeWaistCm: 12,
    sleeveLengthDeltaCm: 0.5,
    garmentLengthDeltaCm: 0,
  },
  relaxed: {
    easeChestCm: 16,
    easeWaistCm: 18,
    sleeveLengthDeltaCm: 1,
    garmentLengthDeltaCm: 1,
  },
};

const builtinEase: Partial<Record<GarmentId, Record<EasePreset, EaseAmounts>>> = {
  shirt: shirtEase,
  kurta: kurtaEase,
  kameez: kurtaEase,
};

export function cuttingCm(measurement: {
  valueCm: number;
  overrideCm: number | null;
}): number {
  return measurement.overrideCm ?? measurement.valueCm;
}

export function resolveEase(
  garment: GarmentId,
  preset: EasePreset,
  shopPresets: EasePresets | null = null,
): FitPreference {
  const amounts = shopPresets?.[garment]?.[preset] ?? builtinEase[garment]?.[preset];
  if (!amounts) {
    throw new ContractError(
      `No ease preset for ${garment} ${preset}. Pass easePresets for a custom garment.`,
    );
  }
  return toFit(preset, amounts);
}

export function applyEase(body: CuttingBody, fit: FitPreference): GarmentMeasurements {
  return {
    chhatiCm: roundWireCm(body.chhatiCm + fit.easeChestCm),
    kamarCm: roundWireCm(body.kamarCm + fit.easeWaistCm),
    baazuCm: roundWireCm(body.baazuCm + fit.sleeveLengthDeltaCm),
    lambaiCm: roundWireCm(body.lambaiCm + fit.garmentLengthDeltaCm),
  };
}

export function clampEase(
  fit: FitPreference,
  limits: EaseLimits = defaultEaseLimits,
): FitPreference {
  const easeChestCm = clamp(fit.easeChestCm, limits.easeChestCm);
  const easeWaistCm = clamp(fit.easeWaistCm, limits.easeWaistCm);
  const sleeveLengthDeltaCm = clamp(fit.sleeveLengthDeltaCm, limits.sleeveLengthDeltaCm);
  const garmentLengthDeltaCm = clamp(fit.garmentLengthDeltaCm, limits.garmentLengthDeltaCm);
  const changed =
    easeChestCm !== fit.easeChestCm ||
    easeWaistCm !== fit.easeWaistCm ||
    sleeveLengthDeltaCm !== fit.sleeveLengthDeltaCm ||
    garmentLengthDeltaCm !== fit.garmentLengthDeltaCm;
  return {
    preset: changed ? "custom" : fit.preset,
    easeChestCm,
    easeWaistCm,
    sleeveLengthDeltaCm,
    garmentLengthDeltaCm,
    flare: fit.flare,
  };
}

export function adjustEase(
  current: FitPreference,
  patch: Partial<EaseAmounts>,
  limits: EaseLimits = defaultEaseLimits,
): FitPreference {
  return clampEase(
    {
      preset: "custom",
      easeChestCm: patch.easeChestCm ?? current.easeChestCm,
      easeWaistCm: patch.easeWaistCm ?? current.easeWaistCm,
      sleeveLengthDeltaCm: patch.sleeveLengthDeltaCm ?? current.sleeveLengthDeltaCm,
      garmentLengthDeltaCm: patch.garmentLengthDeltaCm ?? current.garmentLengthDeltaCm,
      flare: patch.flare ?? current.flare,
    },
    limits,
  );
}

function toFit(preset: EasePreset, amounts: EaseAmounts): FitPreference {
  return {
    preset,
    easeChestCm: amounts.easeChestCm,
    easeWaistCm: amounts.easeWaistCm,
    sleeveLengthDeltaCm: amounts.sleeveLengthDeltaCm,
    garmentLengthDeltaCm: amounts.garmentLengthDeltaCm,
    flare: amounts.flare ?? "straight",
  };
}

function clamp(value: number, bounds: { min: number; max: number }): number {
  return Math.min(bounds.max, Math.max(bounds.min, value));
}
