import { agreeScales } from "@tailor-scan/core";
import { render } from "preact";
import { act } from "preact/test-utils";
import { describe, expect, it } from "vitest";
import { CalibrationPanel } from "./calibration-panel";

describe("calibration panel", () => {
  it("offers the credit-card preset and keeps height when the rectangle is unmarked", () => {
    const host = document.createElement("div");
    const seen: Array<number | null> = [];
    act(() => {
      render(
        <CalibrationPanel
          heightScaleCmPerPx={0.2}
          sample={null}
          onImageScale={(scale) => seen.push(scale)}
        />,
        host,
      );
    });
    const select = host.querySelector("select[name='reference']") as HTMLSelectElement;
    act(() => {
      select.value = "credit-card";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.textContent).toContain("85.60");
    expect(host.textContent).toContain("large and next to the body");
    const use = [...host.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Use marked rectangle"),
    );
    act(() => {
      use?.click();
    });
    expect(host.textContent).toContain("85.60 by 53.98 mm");
    const choice = agreeScales(0.2, null);
    expect(choice.agreement).toBe("height-only");
    expect(seen.at(-1)).not.toBe(0.2);
  });
});
