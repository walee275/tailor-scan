import { act } from "preact/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import type { ScanError } from "./config";
import { defineTailorScan } from "./index";
import { reachCamera } from "./walk-capture";

describe("tailor-scan element", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("starts on an unchecked consent step", () => {
    defineTailorScan();
    defineTailorScan();

    const element = document.createElement("tailor-scan");
    document.body.appendChild(element);

    expect(customElements.get("tailor-scan")).toBeTruthy();
    const root = element.shadowRoot;
    const text = root?.textContent ?? "";
    expect(text).toContain("Tailor Scan");
    expect(text).toContain("The camera stays on this device.");
    expect(text).toContain("Pictures are not uploaded.");
    for (const name of ["Chhati", "Kamar", "Baazu", "Lambai"]) {
      expect(text).toContain(name);
    }
    const consent = root?.querySelector<HTMLInputElement>('input[name="consent"]');
    const continueButton = [...(root?.querySelectorAll("button") ?? [])].find((button) =>
      button.textContent?.includes("Continue"),
    );
    expect(consent?.checked).toBe(false);
    expect(continueButton).toBeInstanceOf(HTMLButtonElement);
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("reads garment and display units from attributes", () => {
    const element = document.createElement("tailor-scan");
    element.setAttribute("garment", "kameez");
    element.setAttribute("display-units", "in");
    document.body.append(element);

    const text = element.shadowRoot?.textContent ?? "";
    expect(text).toContain("kameez");
    expect(text).toContain("display in");
  });

  it("cancels when consent is declined", () => {
    const element = document.createElement("tailor-scan");
    const events: string[] = [];
    element.addEventListener("cancel", () => {
      events.push("cancel");
    });
    element.addEventListener("complete", () => {
      events.push("complete");
    });
    document.body.append(element);

    const decline = [...(element.shadowRoot?.querySelectorAll("button") ?? [])].find((button) =>
      button.textContent?.includes("No thanks"),
    );
    act(() => {
      decline?.click();
    });
    expect(events).toEqual(["cancel"]);
    const text = element.shadowRoot?.textContent ?? "";
    expect(text).toContain("Cancelled. The shop receives nothing.");
    expect(text).not.toContain("Continue");
    expect(element.shadowRoot?.querySelector('input[name="consent"]')).toBeNull();
  });

  it("shows the display units the customer selects", () => {
    const element = document.createElement("tailor-scan");
    element.setAttribute("display-units", "cm");
    document.body.append(element);
    const root = element.shadowRoot as ShadowRoot;
    const consent = root.querySelector<HTMLInputElement>('input[name="consent"]');
    act(() => {
      consent?.click();
    });
    const continueButton = [...root.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Continue"),
    );
    act(() => {
      continueButton?.click();
    });
    const units = root.querySelector<HTMLSelectElement>('select[name="units"]');
    act(() => {
      if (units) {
        units.value = "in";
        units.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    expect(root.textContent).toContain("display in");
    expect(units?.value).toBe("in");
  });

  it("explains a missing camera and still offers manual entry", () => {
    const element = document.createElement("tailor-scan");
    const errors: ScanError[] = [];
    element.addEventListener("error", (event: Event) => {
      if (event instanceof CustomEvent) {
        errors.push(event.detail as ScanError);
      }
    });
    document.body.append(element);
    reachCamera(element.shadowRoot as ShadowRoot);

    const text = element.shadowRoot?.textContent ?? "";
    expect(text).toContain("2 to 3 meters");
    expect(text).toContain("Hold still.");
    expect(text).toContain("prefers-reduced-motion");

    const enable = [...(element.shadowRoot?.querySelectorAll("button") ?? [])].find((button) =>
      button.textContent?.includes("Turn on camera"),
    );
    act(() => {
      enable?.click();
    });

    expect(errors.map((error) => error.code)).toContain("camera-missing");
    expect(element.shadowRoot?.textContent).toContain("This browser has no camera.");
    expect(element.shadowRoot?.textContent).toContain("Enter measurements instead");
  });
});
