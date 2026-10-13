import { sampleScanResult } from "@tailor-scan/core";
import { render } from "preact";
import { act } from "preact/test-utils";
import { describe, expect, it } from "vitest";
import { ReviewEditor } from "./review-editor";

describe("review editor", () => {
  it("moves only the garment column when ease changes, and keeps an override", () => {
    const host = document.createElement("div");
    let current = sampleScanResult();
    const paint = () => {
      render(<ReviewEditor result={current} onChange={(next) => (current = next)} />, host);
    };
    act(() => paint());
    expect(host.textContent).toContain("Estimated measurements");
    expect(host.textContent).toContain("Body");
    expect(host.textContent).toContain("Ease");
    expect(host.textContent).toContain("Garment");
    const body = host.querySelector("[data-col='body'][data-id='chhati']")?.textContent;
    const slider = host.querySelector("input[name='easeChestCm']") as HTMLInputElement;
    act(() => {
      slider.value = "20";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      paint();
    });
    expect(host.querySelector("[data-col='body'][data-id='chhati']")?.textContent).toBe(body);
    expect(host.querySelector("[data-col='garment'][data-id='chhati']")?.textContent).toContain("116.5");
    expect(host.querySelector("canvas")?.getAttribute("data-chest")).toBe("116.4");
    expect(current.measurements[0].valueCm).toBe(96.4);
    expect(current.fit.preset).toBe("custom");

    const override = host.querySelector("input[name='override-chhati']") as HTMLInputElement;
    act(() => {
      override.value = "100";
      override.dispatchEvent(new Event("input", { bubbles: true }));
      paint();
    });
    const relaxed = [...host.querySelectorAll("button")].find((button) => button.textContent === "relaxed");
    act(() => {
      relaxed?.click();
      paint();
    });
    expect((host.querySelector("input[name='override-chhati']") as HTMLInputElement).value).toBe("100");
    expect(current.measurements[0].overrideCm).toBe(100);
    expect(current.fit.preset).toBe("relaxed");

    const inches = [...host.querySelectorAll("button")].find((button) => button.textContent === "Inches");
    act(() => {
      inches?.click();
      paint();
    });
    expect(host.querySelector("[data-col='body'][data-id='chhati']")?.textContent).toContain("in");
    expect(current.displayUnits).toBe("in");
    expect(current.measurements[0].valueCm).toBe(96.4);
    expect(current.measurements[0].overrideCm).toBe(100);
  });
});
