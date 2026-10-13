import { describe, expect, it } from "vitest";
import { acceptHostMessage, acceptWidgetMessage, HOST_SOURCE, WIDGET_SOURCE } from "./protocol";

const shop = "https://shop.example";
const widget = "https://scan.example";
const sessionId = "abc";

const init = {
  source: HOST_SOURCE,
  version: 1,
  sessionId,
  type: "init",
  config: { garment: "kurta", displayUnits: "cm" },
};

const complete = {
  source: WIDGET_SOURCE,
  version: 1,
  sessionId,
  type: "complete",
  payload: { schema: "tailor-scan.result.v1" },
};

describe("embed protocol", () => {
  it("refuses a host message from the wrong origin", () => {
    expect(
      acceptHostMessage(
        { origin: "https://evil.example", data: init },
        { origin: shop, sessionId },
      ),
    ).toBeNull();
  });

  it("refuses a widget message from the wrong origin", () => {
    expect(
      acceptWidgetMessage(
        { origin: "https://evil.example", data: complete },
        { origin: widget, sessionId },
      ),
    ).toBeNull();
  });

  it("refuses a matching origin when the session id differs", () => {
    expect(
      acceptWidgetMessage(
        { origin: widget, data: { ...complete, sessionId: "other" } },
        { origin: widget, sessionId },
      ),
    ).toBeNull();
    expect(
      acceptHostMessage(
        { origin: shop, data: { ...init, sessionId: "other" } },
        { origin: shop, sessionId },
      ),
    ).toBeNull();
  });

  it("accepts a matching origin and session", () => {
    expect(acceptHostMessage({ origin: shop, data: init }, { origin: shop, sessionId })).toEqual({
      source: HOST_SOURCE,
      version: 1,
      sessionId,
      type: "init",
      config: { garment: "kurta", displayUnits: "cm" },
    });
    expect(
      acceptWidgetMessage({ origin: widget, data: complete }, { origin: widget, sessionId })?.type,
    ).toBe("complete");
  });
});
