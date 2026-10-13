import { describe, expect, it } from "vitest";
import {
  captureReducer,
  captureStepProgress,
  createCaptureState,
  parseHeightCm,
  parseManualNumbers,
} from "./flow";

describe("capture flow", () => {
  it("stays on consent until the box is ticked", () => {
    const start = createCaptureState({ garment: "kurta", displayUnits: "cm" });
    expect(start.consentChecked).toBe(false);
    const blocked = captureReducer(start, { type: "accept-consent" });
    expect(blocked.step).toBe("consent");
    const checked = captureReducer(blocked, { type: "check-consent", checked: true });
    expect(captureReducer(checked, { type: "accept-consent" }).step).toBe("order");
  });

  it("ends the session when consent is declined", () => {
    const start = createCaptureState({ garment: "kurta", displayUnits: "cm" });
    const declined = captureReducer(start, { type: "decline" });
    expect(declined.step).toBe("cancelled");
    expect(captureReducer(declined, { type: "accept-consent" }).step).toBe("cancelled");
    expect(captureReducer(declined, { type: "check-consent", checked: true }).step).toBe("cancelled");
  });

  it("requires an adult declaration and a usable height", () => {
    let state = createCaptureState({ garment: "shirt", displayUnits: "in" });
    state = captureReducer(state, { type: "check-consent", checked: true });
    state = captureReducer(state, { type: "accept-consent" });
    state = captureReducer(state, { type: "continue-order" });
    expect(state.step).toBe("order");
    state = captureReducer(state, { type: "set-adult", adult: true });
    state = captureReducer(state, { type: "continue-order" });
    expect(state.step).toBe("body");
    expect(state.heightMode).toBe("ft");

    state = captureReducer(state, { type: "set-height-feet", value: "5" });
    state = captureReducer(state, { type: "set-height-inches", value: "8" });
    state = captureReducer(state, { type: "continue-body" });
    expect(state.step).toBe("body");

    state = captureReducer(state, { type: "set-clothing", fit: "loose" });
    state = captureReducer(state, { type: "continue-body" });
    expect(state.step).toBe("camera");
    expect(state.heightCm).toBeCloseTo(172.72, 2);
  });

  it("skips the camera into manual review and can step back", () => {
    let state = createCaptureState({ garment: "kameez", displayUnits: "cm" });
    state = reachCamera(state);
    state = captureReducer(state, { type: "set-units", units: "in" });
    state = captureReducer(state, { type: "skip-camera" });
    expect(state.step).toBe("manual");
    expect(state.entryUnits).toBe("in");
    expect(parseManualNumbers(state)).toBeNull();

    for (const [field, value] of [
      ["chhati", "38"],
      ["kamar", "33"],
      ["baazu", "25"],
      ["lambai", "40"],
    ] as const) {
      state = captureReducer(state, { type: "set-manual", field, value });
    }
    expect(parseManualNumbers(state)?.chhati).toBe(38);
    state = captureReducer(state, { type: "submit-manual" });
    expect(state.step).toBe("review");
    state = captureReducer(state, { type: "back" });
    expect(state.step).toBe("manual");
    state = captureReducer(state, { type: "submit-manual" });
    state = captureReducer(state, { type: "confirm" });
    expect(state.step).toBe("done");
  });

  it("numbers camera review as the next step, without counting manual entry", () => {
    let state = reachCamera(createCaptureState({ garment: "kurta", displayUnits: "cm" }));
    expect(captureStepProgress(state)).toEqual({ current: 4, total: 5 });
    state = captureReducer(state, { type: "review-camera" });
    expect(state.reading).toBe("camera");
    expect(captureStepProgress(state)).toEqual({ current: 5, total: 5 });

    let typed = reachCamera(createCaptureState({ garment: "kurta", displayUnits: "cm" }));
    typed = captureReducer(typed, { type: "skip-camera" });
    expect(captureStepProgress(typed)).toEqual({ current: 5, total: 6 });
    typed = captureReducer(typed, { type: "submit-manual" });
    expect(captureStepProgress(typed)).toEqual({ current: 5, total: 6 });
    for (const [field, value] of [
      ["chhati", "96"],
      ["kamar", "84"],
      ["baazu", "60"],
      ["lambai", "102"],
    ] as const) {
      typed = captureReducer(typed, { type: "set-manual", field, value });
    }
    typed = captureReducer(typed, { type: "submit-manual" });
    expect(captureStepProgress(typed)).toEqual({ current: 6, total: 6 });
  });

  it("rejects a height outside the dressed range", () => {
    const state = createCaptureState({ garment: "kurta", displayUnits: "cm" });
    expect(parseHeightCm({ ...state, heightMode: "cm", heightCmText: "40" })).toBeNull();
    expect(parseHeightCm({ ...state, heightMode: "cm", heightCmText: "172" })).toBe(172);
  });
});

function reachCamera(state: ReturnType<typeof createCaptureState>) {
  let next = captureReducer(state, { type: "check-consent", checked: true });
  next = captureReducer(next, { type: "accept-consent" });
  next = captureReducer(next, { type: "set-adult", adult: true });
  next = captureReducer(next, { type: "continue-order" });
  next = captureReducer(next, { type: "set-height-mode", mode: "cm" });
  next = captureReducer(next, { type: "set-height-cm", value: "172" });
  next = captureReducer(next, { type: "set-clothing", fit: "close" });
  return captureReducer(next, { type: "continue-body" });
}
