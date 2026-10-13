import { afterEach, describe, expect, it } from "vitest";
import type { ScanResult } from "@tailor-scan/core";
import { TailorScan } from "./index";
import { enterManualResult } from "./walk-capture";

describe("TailorScan.open", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("walks consent and setup, then returns typed measurements", () => {
    const slot = document.createElement("div");
    slot.id = "slot";
    document.body.append(slot);
    const seen: ScanResult[] = [];
    let ready = false;
    const session = TailorScan.open({
      target: "#slot",
      displayUnits: "in",
      garment: "shirt",
      onReady: () => {
        ready = true;
      },
      onComplete: (result) => {
        seen.push(result);
      },
    });

    expect(ready).toBe(true);
    const root = slot.querySelector("tailor-scan")?.shadowRoot;
    enterManualResult(root as ShadowRoot, {
      chhati: "38",
      kamar: "33",
      baazu: "25",
      lambai: "40",
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.schema).toBe("tailor-scan.result.v1");
    expect(seen[0]?.sessionId).toBe(session.sessionId);
    expect(seen[0]?.displayUnits).toBe("in");
    expect(seen[0]?.garment).toBe("shirt");
    expect(seen[0]?.measurements.every((item) => item.source === "user")).toBe(true);
    expect(seen[0]?.measurements[0]?.valueCm).toBe(96.5);
    expect(seen[0]?.privacy.imagesLeftDevice).toBe(false);

    session.setDisplayUnits("cm");
    const text = slot.querySelector("tailor-scan")?.shadowRoot?.textContent ?? "";
    expect(text).toContain("display cm");
    expect(text).toContain("Measurements sent");

    let cancelled = false;
    const second = TailorScan.open({
      target: slot,
      onCancel: () => {
        cancelled = true;
      },
    });
    second.close();
    expect(cancelled).toBe(true);
    expect(slot.querySelector("tailor-scan")).toBeNull();
  });
});
