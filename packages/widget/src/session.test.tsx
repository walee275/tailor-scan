import { afterEach, describe, expect, it } from "vitest";
import type { ScanResult } from "@tailor-scan/core";
import { TailorScan } from "./index";

describe("TailorScan.open", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("mounts the element and returns a sample result for that session", () => {
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
    const button = slot.querySelector("tailor-scan")?.shadowRoot?.querySelector("button");
    button?.click();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.schema).toBe("tailor-scan.result.v1");
    expect(seen[0]?.sessionId).toBe(session.sessionId);
    expect(seen[0]?.displayUnits).toBe("in");
    expect(seen[0]?.garment).toBe("shirt");

    session.setDisplayUnits("cm");
    const text = slot.querySelector("tailor-scan")?.shadowRoot?.textContent ?? "";
    expect(text).toContain("display cm");

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
