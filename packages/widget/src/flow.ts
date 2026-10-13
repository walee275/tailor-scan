import type { ClothingFit, DisplayUnits, GarmentId } from "@tailor-scan/core";
import { feetAndInchesToCm } from "@tailor-scan/core";

export type CaptureStep = "consent" | "order" | "body" | "camera" | "manual" | "review" | "done";

export type CameraPhase = "idle" | "requesting" | "live" | "denied" | "missing";

export const manualFields = ["chhati", "kamar", "baazu", "lambai"] as const;
export type ManualField = (typeof manualFields)[number];

export type CaptureState = {
  step: CaptureStep;
  consentChecked: boolean;
  adult: boolean;
  garment: GarmentId;
  displayUnits: DisplayUnits;
  entryUnits: DisplayUnits;
  heightMode: "cm" | "ft";
  heightCmText: string;
  heightFeetText: string;
  heightInchesText: string;
  heightCm: number | null;
  clothingFit: ClothingFit | "";
  camera: CameraPhase;
  reading: "none" | "manual" | "camera";
  manual: Record<ManualField, string>;
  error: string | null;
};

export type CaptureAction =
  | { type: "check-consent"; checked: boolean }
  | { type: "accept-consent" }
  | { type: "set-garment"; garment: GarmentId }
  | { type: "set-units"; units: DisplayUnits }
  | { type: "set-adult"; adult: boolean }
  | { type: "continue-order" }
  | { type: "set-height-mode"; mode: "cm" | "ft" }
  | { type: "set-height-cm"; value: string }
  | { type: "set-height-feet"; value: string }
  | { type: "set-height-inches"; value: string }
  | { type: "set-clothing"; fit: ClothingFit }
  | { type: "continue-body" }
  | { type: "camera-request" }
  | { type: "camera-live" }
  | { type: "camera-denied" }
  | { type: "camera-missing" }
  | { type: "skip-camera" }
  | { type: "review-camera" }
  | { type: "set-manual"; field: ManualField; value: string }
  | { type: "submit-manual" }
  | { type: "confirm" }
  | { type: "back" }
  | { type: "fail"; message: string };

const previousStep: Partial<Record<CaptureStep, CaptureStep>> = {
  order: "consent",
  body: "order",
  camera: "body",
  manual: "camera",
  review: "manual",
};

export function createCaptureState(input: {
  garment: GarmentId;
  displayUnits: DisplayUnits;
}): CaptureState {
  return {
    step: "consent",
    consentChecked: false,
    adult: false,
    garment: input.garment,
    displayUnits: input.displayUnits,
    entryUnits: input.displayUnits,
    heightMode: input.displayUnits === "in" ? "ft" : "cm",
    heightCmText: "",
    heightFeetText: "",
    heightInchesText: "",
    heightCm: null,
    clothingFit: "",
    camera: "idle",
    reading: "none",
    manual: { chhati: "", kamar: "", baazu: "", lambai: "" },
    error: null,
  };
}

export function captureReducer(state: CaptureState, action: CaptureAction): CaptureState {
  switch (action.type) {
    case "check-consent":
      return { ...state, consentChecked: action.checked, error: null };
    case "accept-consent":
      if (!state.consentChecked || state.step !== "consent") {
        return { ...state, error: "Tick the box after you have read the note." };
      }
      return { ...state, step: "order", error: null };
    case "set-garment":
      return { ...state, garment: action.garment };
    case "set-units":
      return { ...state, displayUnits: action.units };
    case "set-adult":
      return { ...state, adult: action.adult, error: null };
    case "continue-order":
      if (state.step !== "order") {
        return state;
      }
      if (!state.adult) {
        return { ...state, error: "Confirm that you are an adult. This tool is for adults." };
      }
      return { ...state, step: "body", error: null };
    case "set-height-mode":
      return { ...state, heightMode: action.mode, error: null };
    case "set-height-cm":
      return { ...state, heightCmText: action.value, error: null };
    case "set-height-feet":
      return { ...state, heightFeetText: action.value, error: null };
    case "set-height-inches":
      return { ...state, heightInchesText: action.value, error: null };
    case "set-clothing":
      return { ...state, clothingFit: action.fit, error: null };
    case "continue-body": {
      if (state.step !== "body") {
        return state;
      }
      const heightCm = parseHeightCm(state);
      if (heightCm == null) {
        return {
          ...state,
          error: "Enter your height as you are dressed now, including shoes.",
        };
      }
      if (state.clothingFit === "") {
        return { ...state, error: "Say whether these clothes are close-fitting." };
      }
      return { ...state, step: "camera", heightCm, error: null };
    }
    case "camera-request":
      return state.step === "camera" ? { ...state, camera: "requesting", error: null } : state;
    case "camera-live":
      return state.step === "camera" ? { ...state, camera: "live", error: null } : state;
    case "camera-denied":
      return state.step === "camera" ? { ...state, camera: "denied", error: null } : state;
    case "camera-missing":
      return state.step === "camera" ? { ...state, camera: "missing", error: null } : state;
    case "skip-camera":
      if (state.step !== "camera") {
        return state;
      }
      return { ...state, step: "manual", reading: "manual", entryUnits: state.displayUnits, error: null };
    case "review-camera":
      return state.step === "camera" ? { ...state, step: "review", reading: "camera", error: null } : state;
    case "set-manual":
      return {
        ...state,
        manual: { ...state.manual, [action.field]: action.value },
        error: null,
      };
    case "submit-manual":
      if (state.step !== "manual") {
        return state;
      }
      if (parseManualNumbers(state) == null) {
        return { ...state, error: "Enter all four measurements as numbers greater than zero." };
      }
      return { ...state, step: "review", reading: "manual", error: null };
    case "confirm":
      return state.step === "review" ? { ...state, step: "done", error: null } : state;
    case "back": {
      if (state.step === "review" && state.reading === "camera") {
        return { ...state, step: "camera", error: null };
      }
      const step = previousStep[state.step];
      return step ? { ...state, step, error: null } : state;
    }
    case "fail":
      return { ...state, error: action.message };
    default:
      return state;
  }
}

export function parseHeightCm(state: CaptureState): number | null {
  if (state.heightMode === "cm") {
    const cm = readNumber(state.heightCmText);
    if (cm == null || cm < 50 || cm > 250) {
      return null;
    }
    return cm;
  }
  const feet = readNumber(state.heightFeetText);
  const inches = readNumber(state.heightInchesText);
  if (feet == null || inches == null || !Number.isInteger(feet)) {
    return null;
  }
  if (feet < 3 || feet > 8 || inches < 0 || inches >= 12) {
    return null;
  }
  return feetAndInchesToCm(feet, inches);
}

export function parseManualNumbers(state: CaptureState): Record<ManualField, number> | null {
  const max = state.entryUnits === "in" ? 120 : 300;
  const parsed = {} as Record<ManualField, number>;
  for (const field of manualFields) {
    const value = readNumber(state.manual[field]);
    if (value == null || value <= 0 || value > max) {
      return null;
    }
    parsed[field] = value;
  }
  return parsed;
}

function readNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}
