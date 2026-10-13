import { afterEach, describe, expect, it } from "vitest";
import { defineTailorScan } from "./index";

describe("tailor-scan element", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("registers once and mounts the empty measurement list", () => {
    defineTailorScan();
    defineTailorScan();

    const element = document.createElement("tailor-scan");
    document.body.appendChild(element);

    expect(customElements.get("tailor-scan")).toBeTruthy();
    const text = element.shadowRoot?.textContent ?? "";
    expect(text).toContain("Tailor Scan");
    expect(text).toContain("Guided capture is not connected yet.");
    for (const name of ["Chhati", "Kamar", "Baazu", "Lambai"]) {
      expect(text).toContain(name);
      expect(text).toContain("Not measured");
    }
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
});
